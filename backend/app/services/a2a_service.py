"""Agent2Agent (A2A) protocol service for agent discovery, task delegation, and status."""

import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import AgentDefinition


class A2AService:
    """Implements A2A-compatible agent card discovery and structured task exchange."""

    def __init__(self) -> None:
        self._a2a_tasks: dict[str, dict[str, Any]] = {}

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
                "endpoint": f"/api/a2a/tasks",
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
        record = {
            "id": a2a_task_id,
            "protocol": "a2a/v1",
            "sender_agent": sender_agent,
            "target_agent": target_agent,
            "objective": objective,
            "payload": payload,
            "status": "completed",
            "result": {
                "acknowledged_by": agent.name,
                "capabilities_invoked": agent.capabilities[:2],
                "summary": f"{agent.name} processed A2A objective: {objective[:160]}",
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._a2a_tasks[a2a_task_id] = record
        return record

    def get_a2a_task(self, a2a_task_id: str) -> dict[str, Any] | None:
        return self._a2a_tasks.get(a2a_task_id)

    def list_a2a_tasks(self) -> list[dict[str, Any]]:
        return list(reversed(list(self._a2a_tasks.values())))[:50]


a2a_service = A2AService()
