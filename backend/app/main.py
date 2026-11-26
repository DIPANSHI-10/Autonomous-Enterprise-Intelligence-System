"""FastAPI entry point for Autonomous Enterprise Intelligence System."""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import resume_after_approval, run_task_workflow
from app.core.config import get_settings
from app.core.database import get_db, init_db
from app.core.security import (
    create_access_token,
    enforce_rate_limit,
    get_current_user_claims,
    hash_password,
    require_roles,
    sanitize_filename,
    sanitize_untrusted_text,
    verify_a2a_token,
    verify_password,
)
from app.core.seed import seed_defaults
from app.models.domain import (
    AgentDefinition,
    AgentExecution,
    ApprovalRequest,
    AuditLog,
    Document,
    Integration,
    Project,
    Report,
    SystemSetting,
    Task,
    User,
    WorkflowEvent,
)
from app.schemas.api import (
    A2ATaskRequest,
    AgentOut,
    AgentUpdate,
    ApprovalDecision,
    MCPToolInvoke,
    MemoryCreate,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    RAGQuestionRequest,
    SettingsUpdate,
    TaskCreate,
    TaskOut,
    UserLogin,
    UserRegister,
)
from app.services.a2a_service import a2a_service
from app.services.analytics_service import get_dashboard_metrics
from app.services.event_bus import event_bus
from app.services.llm_provider import llm_service
from app.services.mcp_service import mcp_registry
from app.services.memory_service import clear_task_memory, delete_memory, search_memories, store_memory
from app.services.rag_service import answer_with_rag, hybrid_search, ingest_document, rebuild_stale_embeddings

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    await seed_defaults()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Agent AI Powered Enterprise Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "application": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "llm_configured": llm_service.has_configured_provider(),
        "embedding_model": settings.EMBEDDING_MODEL,
        "auth_required": settings.AUTH_REQUIRED,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------- AUTHENTICATION & RBAC ----------------
@app.post("/api/auth/register")
async def register_user(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = (
        await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email.lower().strip(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role="analyst",
        is_active=True,
    )
    db.add(user)
    db.add(AuditLog(actor=user.email, action="user_register", resource_type="user", resource_id=user.email))
    await db.commit()
    token = create_access_token(subject=user.email, role=user.role)
    return {"access_token": token, "token_type": "bearer", "user": {"email": user.email, "full_name": user.full_name, "role": user.role}}


@app.post("/api/auth/login")
async def login_user(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    user = (
        await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    ).scalar_one_or_none()
    if not user or not user.is_active or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(subject=user.email, role=user.role)
    db.add(AuditLog(actor=user.email, action="user_login", resource_type="user", resource_id=user.email))
    await db.commit()
    return {"access_token": token, "token_type": "bearer", "user": {"email": user.email, "full_name": user.full_name, "role": user.role}}


@app.get("/api/auth/me")
async def auth_me(claims: dict = Depends(get_current_user_claims)):
    return claims


@app.get("/api/dashboard/metrics")
async def dashboard_metrics(db: AsyncSession = Depends(get_db)):
    return await get_dashboard_metrics(db)


# ---------------- PROJECTS ----------------
@app.get("/api/projects", response_model=list[ProjectOut])
async def list_projects(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Project).order_by(Project.updated_at.desc()))
    return list(res.scalars().all())


@app.post("/api/projects", response_model=ProjectOut)
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)):
    proj = Project(name=payload.name.strip(), description=payload.description.strip())
    db.add(proj)
    db.add(AuditLog(action="create_project", resource_type="project", resource_id=proj.name))
    await db.commit()
    await db.refresh(proj)
    return proj


@app.patch("/api/projects/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, payload: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if payload.name is not None:
        proj.name = payload.name.strip()
    if payload.description is not None:
        proj.description = payload.description.strip()
    if payload.status is not None:
        proj.status = payload.status
    await db.commit()
    await db.refresh(proj)
    return proj


# ---------------- TASKS & EXECUTION ----------------
@app.get("/api/tasks", response_model=list[TaskOut])
async def list_tasks(project_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Task).order_by(Task.created_at.desc()).limit(50)
    if project_id:
        stmt = stmt.where(Task.project_id == project_id)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@app.post("/api/tasks", response_model=TaskOut, dependencies=[Depends(enforce_rate_limit)])
async def create_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)):
    clean_obj = sanitize_untrusted_text(payload.objective, max_length=8000)
    task = Task(
        project_id=payload.project_id,
        objective=clean_obj,
        research_depth=payload.research_depth,
        priority=payload.priority,
        execution_mode=payload.execution_mode,
        status="queued",
        workflow_state={"attached_document_ids": payload.attached_document_ids},
    )
    db.add(task)
    await db.flush()
    db.add(AuditLog(action="create_task", resource_type="task", resource_id=task.id))
    await db.commit()
    await db.refresh(task)

    asyncio.create_task(run_task_workflow(task.id))
    return task


@app.get("/api/tasks/{task_id}")
async def get_task_detail(task_id: str, db: AsyncSession = Depends(get_db)):
    task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    execs = (
        await db.execute(select(AgentExecution).where(AgentExecution.task_id == task_id))
    ).scalars().all()
    events = (
        await db.execute(
            select(WorkflowEvent)
            .where(WorkflowEvent.task_id == task_id)
            .order_by(WorkflowEvent.created_at.asc())
        )
    ).scalars().all()
    report = (
        await db.execute(
            select(Report)
            .where(Report.task_id == task_id)
            .order_by(Report.created_at.desc())
        )
    ).scalars().first()
    return {
        "task": TaskOut.model_validate(task),
        "report": (
            {
                "id": report.id,
                "task_id": report.task_id,
                "title": report.title,
                "executive_summary": report.executive_summary,
                "has_pdf": bool(report.pdf_path and Path(report.pdf_path).exists()),
                "pdf_url": f"/api/reports/{report.id}/pdf",
                "created_at": report.created_at,
            }
            if report
            else None
        ),
        "executions": [
            {
                "id": e.id,
                "agent_id": e.agent_id,
                "agent_name": e.agent_name,
                "status": e.status,
                "current_task": e.current_task,
                "progress": e.progress,
                "model_used": e.model_used,
                "input_data": e.input_data,
                "output_data": e.output_data,
                "tokens_used": e.tokens_used,
                "duration_ms": e.duration_ms,
                "error_message": e.error_message,
                "started_at": e.started_at,
                "completed_at": e.completed_at,
            }
            for e in execs
        ],
        "events": [
            {
                "id": ev.id,
                "event_type": ev.event_type,
                "source_agent": ev.source_agent,
                "target_agent": ev.target_agent,
                "status": ev.status,
                "message": ev.message,
                "payload": ev.payload,
                "duration_ms": ev.duration_ms,
                "created_at": ev.created_at,
            }
            for ev in events
        ],
    }


@app.post("/api/tasks/{task_id}/cancel")
async def cancel_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = "cancelled"
    task.completed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "cancelled", "task_id": task_id}


@app.post("/api/tasks/{task_id}/retry")
async def retry_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    attached_docs = (task.workflow_state or {}).get("attached_document_ids", [])
    task.status = "queued"
    task.progress = 0.0
    task.current_agent = None
    task.plan = []
    task.result_summary = None
    task.error_message = None
    task.completed_at = None
    task.workflow_state = {"attached_document_ids": attached_docs}
    await db.commit()
    asyncio.create_task(run_task_workflow(task.id))
    return {"status": "queued", "task_id": task_id}


@app.get("/api/events/stream")
async def stream_events(task_id: Optional[str] = None):
    return StreamingResponse(
        event_bus.stream(task_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.get("/api/logs")
async def list_execution_logs(limit: int = 100, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(WorkflowEvent).order_by(WorkflowEvent.created_at.desc()).limit(min(limit, 300))
    )
    events = res.scalars().all()
    return [
        {
            "id": ev.id,
            "task_id": ev.task_id,
            "event_type": ev.event_type,
            "source_agent": ev.source_agent,
            "target_agent": ev.target_agent,
            "status": ev.status,
            "message": ev.message,
            "duration_ms": ev.duration_ms,
            "created_at": ev.created_at,
        }
        for ev in events
    ]


# ---------------- AGENTS ----------------
@app.get("/api/agents", response_model=list[AgentOut])
async def list_agents(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AgentDefinition))
    return list(res.scalars().all())


@app.patch("/api/agents/{agent_id}", response_model=AgentOut)
async def update_agent(agent_id: str, payload: AgentUpdate, db: AsyncSession = Depends(get_db)):
    agent = (await db.execute(select(AgentDefinition).where(AgentDefinition.id == agent_id))).scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if payload.model_provider is not None:
        agent.model_provider = payload.model_provider
    if payload.model_name is not None:
        agent.model_name = payload.model_name
    if payload.system_instructions is not None:
        agent.system_instructions = payload.system_instructions
    if payload.enabled is not None:
        agent.enabled = payload.enabled
    await db.commit()
    await db.refresh(agent)
    return agent


# ---------------- KNOWLEDGE BASE / RAG ----------------
@app.get("/api/documents")
async def list_documents(collection: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Document).order_by(Document.created_at.desc())
    if collection:
        stmt = stmt.where(Document.collection == collection)
    docs = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "collection": d.collection,
            "content_type": d.content_type,
            "file_size_bytes": d.file_size_bytes,
            "version": d.version,
            "chunk_count": d.chunk_count,
            "status": d.status,
            "created_at": d.created_at,
        }
        for d in docs
    ]


@app.post("/api/documents/upload", dependencies=[Depends(enforce_rate_limit)])
async def upload_document(
    file: UploadFile = File(...),
    collection: str = Form("default"),
    project_id: Optional[str] = Form(None),
    _claims: dict = Depends(require_roles("admin", "analyst")),
    db: AsyncSession = Depends(get_db),
):
    safe_name = sanitize_filename(file.filename or "document.txt")
    if not safe_name.lower().endswith((".pdf", ".docx", ".txt", ".md")):
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: PDF, DOCX, TXT, MD.")

    raw = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit.")

    doc = await ingest_document(
        db=db,
        filename=safe_name,
        content_type=file.content_type or "text/plain",
        raw_bytes=raw,
        collection=collection,
        project_id=project_id,
    )
    return {
        "id": doc.id,
        "filename": doc.filename,
        "collection": doc.collection,
        "chunk_count": doc.chunk_count,
        "status": doc.status,
    }


@app.get("/api/documents/search")
async def search_documents(
    query: str,
    top_k: int = 5,
    collection: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    hits = await hybrid_search(db, query=query, top_k=min(20, max(1, top_k)), collection=collection)
    return {"query": query, "results": hits}


@app.post("/api/documents/ask", dependencies=[Depends(enforce_rate_limit)])
async def ask_knowledge_base(
    payload: RAGQuestionRequest,
    db: AsyncSession = Depends(get_db),
):
    return await answer_with_rag(
        db,
        question=sanitize_untrusted_text(payload.question, 2000),
        top_k=payload.top_k,
        collection=payload.collection,
    )


@app.post("/api/documents/reindex")
async def reindex_documents(
    force: bool = False,
    _claims: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    rebuilt = await rebuild_stale_embeddings(db, force=force)
    return {"rebuilt_documents": rebuilt, "embedding_model": settings.EMBEDDING_MODEL}


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(delete(Document).where(Document.id == doc_id))
    await db.commit()
    if (res.rowcount or 0) == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": True, "id": doc_id}


# ---------------- MEMORY ----------------
@app.get("/api/memory")
async def list_memories(
    query: Optional[str] = None,
    layer: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    records = await search_memories(db, query=query, layer=layer)
    return [
        {
            "id": r.id,
            "task_id": r.task_id,
            "layer": r.layer,
            "category": r.category,
            "content": r.content,
            "source": r.source,
            "relevance_score": r.relevance_score,
            "created_at": r.created_at,
        }
        for r in records
    ]


@app.post("/api/memory")
async def create_memory(
    payload: MemoryCreate,
    _claims: dict = Depends(require_roles("admin", "analyst")),
    db: AsyncSession = Depends(get_db),
):
    rec = await store_memory(
        db,
        layer=payload.layer,
        content=sanitize_untrusted_text(payload.content, 5000),
        category=payload.category,
        source=payload.source,
        task_id=payload.task_id,
        project_id=payload.project_id,
        session_id=payload.session_id,
        ttl_hours=payload.ttl_hours,
    )
    return {"id": rec.id, "layer": rec.layer, "created_at": rec.created_at}


@app.delete("/api/memory/{memory_id}")
async def remove_memory(memory_id: str, db: AsyncSession = Depends(get_db)):
    ok = await delete_memory(db, memory_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory record not found")
    return {"deleted": True}


@app.delete("/api/memory/task/{task_id}")
async def remove_task_memory(task_id: str, db: AsyncSession = Depends(get_db)):
    count = await clear_task_memory(db, task_id)
    return {"deleted_count": count}


# ---------------- REPORTS ----------------
@app.get("/api/reports")
async def list_reports(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Report).order_by(Report.created_at.desc()).limit(50))
    reports = res.scalars().all()
    return [
        {
            "id": r.id,
            "task_id": r.task_id,
            "title": r.title,
            "executive_summary": r.executive_summary,
            "content_markdown": r.content_markdown,
            "citations": r.citations,
            "analytics_data": r.analytics_data,
            "has_pdf": bool(r.pdf_path and Path(r.pdf_path).exists()),
            "created_at": r.created_at,
        }
        for r in reports
    ]


@app.get("/api/reports/{report_id}/pdf")
async def download_report_pdf(report_id: str, db: AsyncSession = Depends(get_db)):
    report = (await db.execute(select(Report).where(Report.id == report_id))).scalar_one_or_none()
    if not report or not report.pdf_path or not Path(report.pdf_path).exists():
        raise HTTPException(status_code=404, detail="Report PDF not found")
    return FileResponse(
        path=report.pdf_path,
        media_type="application/pdf",
        filename=f"AEIS_Report_{report.id[:8]}.pdf",
    )


# ---------------- HUMAN-IN-THE-LOOP APPROVALS ----------------
@app.get("/api/approvals")
async def list_approvals(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(ApprovalRequest).order_by(ApprovalRequest.created_at.desc())
    if status:
        stmt = stmt.where(ApprovalRequest.status == status)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": a.id,
            "task_id": a.task_id,
            "requesting_agent": a.requesting_agent,
            "requested_action": a.requested_action,
            "reason": a.reason,
            "payload": a.payload,
            "status": a.status,
            "reviewer_note": a.reviewer_note,
            "created_at": a.created_at,
        }
        for a in rows
    ]


@app.post("/api/approvals/{approval_id}/decide")
async def decide_approval(
    approval_id: str,
    payload: ApprovalDecision,
    claims: dict = Depends(require_roles("admin", "analyst")),
    db: AsyncSession = Depends(get_db),
):
    req = (
        await db.execute(select(ApprovalRequest).where(ApprovalRequest.id == approval_id))
    ).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Approval request already resolved")

    req.status = payload.decision
    req.reviewer_note = payload.reviewer_note
    req.resolved_at = datetime.now(timezone.utc)
    db.add(
        AuditLog(
            actor=claims.get("sub", "human_reviewer"),
            action=f"approval_{payload.decision}",
            resource_type="approval",
            resource_id=approval_id,
            details={"note": payload.reviewer_note},
        )
    )
    await db.commit()

    asyncio.create_task(resume_after_approval(req.task_id, payload.decision == "approved"))
    return {"id": approval_id, "status": req.status}


# ---------------- MCP & A2A & INTEGRATIONS & SETTINGS ----------------
@app.get("/api/mcp/servers")
async def get_mcp_servers():
    return mcp_registry.list_servers()


@app.post("/api/mcp/invoke", dependencies=[Depends(enforce_rate_limit)])
async def invoke_mcp_tool(
    payload: MCPToolInvoke,
    _claims: dict = Depends(require_roles("admin", "analyst")),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await mcp_registry.invoke_tool(
            db, server_id=payload.server_id, tool_name=payload.tool_name, arguments=payload.arguments
        )
    except (ValueError, PermissionError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/mcp/history")
async def get_mcp_history(db: AsyncSession = Depends(get_db)):
    rows = await mcp_registry.get_history(db)
    return [
        {
            "id": r.id,
            "agent_id": r.agent_id,
            "tool_name": r.tool_name,
            "mcp_server": r.mcp_server,
            "status": r.status,
            "duration_ms": r.duration_ms,
            "result_summary": r.result_summary,
            "error_message": r.error_message,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@app.get("/api/a2a/agents")
async def a2a_discover_agents(
    authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)
):
    if not verify_a2a_token(authorization):
        raise HTTPException(status_code=401, detail="Invalid A2A authorization token")
    return await a2a_service.get_agent_cards(db)


@app.post("/api/a2a/tasks", dependencies=[Depends(enforce_rate_limit)])
async def a2a_create_task(
    payload: A2ATaskRequest,
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not verify_a2a_token(authorization):
        raise HTTPException(status_code=401, detail="Invalid A2A authorization token")
    try:
        return await a2a_service.submit_a2a_task(
            db,
            sender_agent=payload.sender_agent,
            target_agent=payload.target_agent,
            objective=sanitize_untrusted_text(payload.objective, 2000),
            payload=payload.payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.get("/api/a2a/tasks")
async def a2a_list_tasks(db: AsyncSession = Depends(get_db)):
    return await a2a_service.list_a2a_tasks(db)


@app.get("/api/integrations")
async def list_integrations(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Integration))).scalars().all()
    return {
        "integrations": [
            {
                "id": i.id,
                "name": i.name,
                "category": i.category,
                "status": i.status,
                "endpoint": i.endpoint,
                "enabled": i.enabled,
            }
            for i in rows
        ],
        "llm_providers": llm_service.get_available_providers(),
    }


@app.get("/api/settings")
async def get_app_settings(db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(select(SystemSetting).where(SystemSetting.key == "runtime"))
    ).scalar_one_or_none()
    if row and isinstance(row.value_json, dict):
        for k, v in row.value_json.items():
            if hasattr(settings, k):
                setattr(settings, k, v)
    return {
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "default_llm_provider": settings.DEFAULT_LLM_PROVIDER,
        "default_llm_model": settings.DEFAULT_LLM_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "max_workflow_retries": settings.MAX_WORKFLOW_RETRIES,
        "agent_execution_timeout_seconds": settings.AGENT_EXECUTION_TIMEOUT_SECONDS,
        "require_approval_for_reports": settings.REQUIRE_APPROVAL_FOR_REPORTS,
        "configured_llm_providers": settings.configured_llm_providers,
    }


@app.patch("/api/settings")
async def update_app_settings(
    payload: SettingsUpdate,
    _claims: dict = Depends(require_roles("admin", "analyst")),
    db: AsyncSession = Depends(get_db),
):
    if payload.default_llm_provider is not None:
        settings.DEFAULT_LLM_PROVIDER = payload.default_llm_provider
    if payload.default_llm_model is not None:
        settings.DEFAULT_LLM_MODEL = payload.default_llm_model
    if payload.max_workflow_retries is not None:
        settings.MAX_WORKFLOW_RETRIES = payload.max_workflow_retries
    if payload.require_approval_for_reports is not None:
        settings.REQUIRE_APPROVAL_FOR_REPORTS = payload.require_approval_for_reports

    runtime_vals = {
        "DEFAULT_LLM_PROVIDER": settings.DEFAULT_LLM_PROVIDER,
        "DEFAULT_LLM_MODEL": settings.DEFAULT_LLM_MODEL,
        "MAX_WORKFLOW_RETRIES": settings.MAX_WORKFLOW_RETRIES,
        "REQUIRE_APPROVAL_FOR_REPORTS": settings.REQUIRE_APPROVAL_FOR_REPORTS,
    }
    row = (
        await db.execute(select(SystemSetting).where(SystemSetting.key == "runtime"))
    ).scalar_one_or_none()
    if row:
        row.value_json = runtime_vals
    else:
        db.add(SystemSetting(key="runtime", value_json=runtime_vals))
    await db.commit()
    return await get_app_settings(db)
