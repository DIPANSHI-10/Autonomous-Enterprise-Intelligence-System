"""Persistent Agent2Agent (A2A) protocol service with real agent/tool execution."""

import uuid
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import A2ATask, AgentDefinition
from app.services.llm_provider import llm_service
from app.services.rag_service import hybrid_search


class A2AService:
    """Implements A2A-compatible agent card discovery and DB-backed task delegation."""

    async def get_agent_cards(self, db: AsyncSession) -> list[dict[str, Any]]:
        res = await db.execute(select(AgentDefinition).where(AgentDefinition.enabled.is_(True)))
        agents = res.scalars().all()
        return [
            {
                "protocol": "a2a/v1",
                "agent_id": a.id,
                "name": a.name,
                "role": a.role,
                "description": a.description,
                "capabilities": a.capabilities,
                "tools": a.tools,
                "endpoint": "/api/a2a/tasks",
                "auth_schemes": ["bearer"],
            }
            for a in agents
        ]

    async def submit_a2a_task(
        self,
        db: AsyncSession,
        sender_agent: str,
        target_agent: str,
        objective: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        res = await db.execute(select(AgentDefinition).where(AgentDefinition.id == target_agent))
        agent = res.scalar_one_or_none()
        if not agent:
            raise ValueError(f"Target A2A agent '{target_agent}' not found")

        a2a_task_id = f"a2a-{uuid.uuid4().hex[:12]}"
        result_data: dict[str, Any] = {
            "acknowledged_by": agent.name,
            "capabilities_invoked": agent.capabilities[:2],
        }

        # Execute real capability matching the target agent
        rag_hits = await hybrid_search(db, query=objective, top_k=3)
        result_data["rag_matches"] = len(rag_hits)

        if target_agent == "analyst" and isinstance(payload.get("values"), list):
            import numpy as np

            vals = [float(v) for v in payload["values"] if isinstance(v, (int, float))]
            if vals:
                arr = np.asarray(vals, dtype=float)
                result_data["statistics"] = {
                    "count": len(vals),
                    "mean": round(float(np.mean(arr)), 4),
                    "std_dev": round(float(np.std(arr)), 4),
                }

        llm_resp = await llm_service.generate(
            system_prompt=f"You are {agent.name} ({agent.role}). {agent.system_instructions}",
            user_prompt=(
                f"A2A delegation from '{sender_agent}'.\nObjective: {objective}\n"
                f"Payload: {payload}\nKnowledge Base matches: {len(rag_hits)}"
            ),
            provider=agent.model_provider,
            model=agent.model_name,
            trace_name=f"a2a_{target_agent}",
        )
        result_data["llm_configured"] = llm_resp.configured
        result_data["summary"] = (
            llm_resp.content[:800]
            if llm_resp.configured and llm_resp.content
            else f"{agent.name} retrieved {len(rag_hits)} KB matches; LLM synthesis skipped ({llm_resp.error_message})."
        )

        record = A2ATask(
            id=a2a_task_id,
            protocol="a2a/v1",
            sender_agent=sender_agent,
            target_agent=target_agent,
            objective=objective,
            payload=payload,
            status="completed",
            result=result_data,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return {
            "id": record.id,
            "protocol": record.protocol,
            "sender_agent": record.sender_agent,
            "target_agent": record.target_agent,
            "objective": record.objective,
            "payload": record.payload,
            "status": record.status,
            "result": record.result,
            "created_at": record.created_at.isoformat(),
        }

    async def get_a2a_task(self, db: AsyncSession, a2a_task_id: str) -> dict[str, Any] | None:
        row = (await db.execute(select(A2ATask).where(A2ATask.id == a2a_task_id))).scalar_one_or_none()
        if not row:
            return None
        return {
            "id": row.id,
            "protocol": row.protocol,
            "sender_agent": row.sender_agent,
            "target_agent": row.target_agent,
            "objective": row.objective,
            "payload": row.payload,
            "status": row.status,
            "result": row.result,
            "created_at": row.created_at.isoformat(),
        }

    async def list_a2a_tasks(self, db: AsyncSession, limit: int = 50) -> list[dict[str, Any]]:
        rows = (
            await db.execute(select(A2ATask).order_by(A2ATask.created_at.desc()).limit(limit))
        ).scalars().all()
        return [
            {
                "id": row.id,
                "protocol": row.protocol,
                "sender_agent": row.sender_agent,
                "target_agent": row.target_agent,
                "objective": row.objective,
                "payload": row.payload,
                "status": row.status,
                "result": row.result,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ]


a2a_service = A2AService()
