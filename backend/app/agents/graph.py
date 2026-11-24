"""LangGraph StateGraph compilation, checkpointing, conditional routing, and execution runner."""

from datetime import datetime, timezone
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from sqlalchemy import select
from app.agents.nodes import (
    analyst_node,
    extraction_node,
    report_node,
    research_node,
    strategy_node,
    supervisor_node,
    verification_node,
)
from app.agents.state import WorkflowState
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.models.domain import Task
from app.services.event_bus import event_bus

_checkpointer = MemorySaver()


def _route_after_verification(state: WorkflowState) -> str:
    if state.get("verification_status") == "needs_research":
        return "research"
    return "strategy"


def _route_after_strategy(state: WorkflowState) -> str:
    if state.get("approval_required") and state.get("approval_status") == "pending":
        return END
    return "report"


def build_workflow_graph():
    builder = StateGraph(WorkflowState)
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("research", research_node)
    builder.add_node("extraction", extraction_node)
    builder.add_node("analyst", analyst_node)
    builder.add_node("verification", verification_node)
    builder.add_node("strategy", strategy_node)
    builder.add_node("report", report_node)

    builder.add_edge(START, "supervisor")
    builder.add_edge("supervisor", "research")
    builder.add_edge("research", "extraction")
    builder.add_edge("extraction", "analyst")
    builder.add_edge("analyst", "verification")
    builder.add_conditional_edges(
        "verification",
        _route_after_verification,
        {"research": "research", "strategy": "strategy"},
    )
    builder.add_conditional_edges(
        "strategy",
        _route_after_strategy,
        {"report": "report", END: END},
    )
    builder.add_edge("report", END)

    return builder.compile(checkpointer=_checkpointer)


workflow_graph = build_workflow_graph()


async def run_task_workflow(task_id: str) -> None:
    """Execute the LangGraph workflow for a persisted Task and stream events."""
    settings = get_settings()
    async with AsyncSessionLocal() as db:
        task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
        if not task:
            return
        task.started_at = datetime.now(timezone.utc)
        task.status = "running"
        await db.commit()

        initial_state: WorkflowState = {
            "task_id": task.id,
            "project_id": task.project_id,
            "objective": task.objective,
            "research_depth": task.research_depth,
            "priority": task.priority,
            "execution_mode": task.execution_mode,
            "attached_document_ids": (task.workflow_state or {}).get("attached_document_ids", []),
            "retry_count": 0,
            "max_retries": settings.MAX_WORKFLOW_RETRIES,
            "total_tokens": 0,
            "errors": [],
        }

    config = {"configurable": {"thread_id": task_id}}
    try:
        final_state = await workflow_graph.ainvoke(initial_state, config=config)
        async with AsyncSessionLocal() as db:
            task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
            if task:
                task.workflow_state = dict(final_state)
                await db.commit()
    except Exception as exc:
        logger.exception("Workflow execution failed for task %s: %s", task_id, exc)
        async with AsyncSessionLocal() as db:
            task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
            if task:
                task.status = "failed"
                task.error_message = str(exc)
                task.completed_at = datetime.now(timezone.utc)
                await db.commit()
        await event_bus.publish(
            {
                "task_id": task_id,
                "event_type": "task_failed",
                "status": "failed",
                "message": f"Workflow failed: {exc}",
            }
        )


async def resume_after_approval(task_id: str, approved: bool) -> None:
    """Resume or reject a paused workflow after Human-in-the-Loop decision."""
    config = {"configurable": {"thread_id": task_id}}
    async with AsyncSessionLocal() as db:
        task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
        if not task:
            return
        saved_state = dict(task.workflow_state or {})
        if not approved:
            task.status = "cancelled"
            task.result_summary = "Workflow rejected by human reviewer."
            task.completed_at = datetime.now(timezone.utc)
            await db.commit()
            await event_bus.publish(
                {
                    "task_id": task_id,
                    "event_type": "task_rejected",
                    "status": "cancelled",
                    "message": "Workflow rejected by human reviewer.",
                }
            )
            return

    saved_state["approval_status"] = "approved"
    saved_state["approval_required"] = False
    # Continue directly into report_node using persisted state
    result_state = await report_node(saved_state)
    saved_state.update(result_state)
    async with AsyncSessionLocal() as db:
        task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
        if task:
            task.workflow_state = saved_state
            await db.commit()
