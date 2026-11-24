"""Comprehensive backend integration tests for Autonomous Enterprise Intelligence System."""

import asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.database import init_db
from app.core.seed import seed_defaults
from app.main import app


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="module")
async def client():
    """Module-scoped async httpx client that triggers FastAPI lifespan once."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        # Manually bootstrap DB since lifespan may not fire in test transport
        await init_db()
        await seed_defaults()
        yield c


@pytest.mark.asyncio
async def test_health_and_metrics(client: AsyncClient):
    res = await client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["application"] == "Autonomous Enterprise Intelligence System"
    assert data["status"] == "healthy"

    metrics = await client.get("/api/dashboard/metrics")
    assert metrics.status_code == 200
    m = metrics.json()
    assert "operational_index" in m
    assert "cognitive_load" in m
    assert "diagnostics" in m
    assert m["diagnostics"]["backend"] == "connected"


@pytest.mark.asyncio
async def test_projects_and_agents(client: AsyncClient):
    agents_res = await client.get("/api/agents")
    assert agents_res.status_code == 200
    agents = agents_res.json()
    assert len(agents) == 7

    proj_res = await client.post(
        "/api/projects",
        json={"name": "Pytest Intelligence Project", "description": "Automated verification"},
    )
    assert proj_res.status_code == 200
    proj = proj_res.json()
    assert proj["name"] == "Pytest Intelligence Project"


@pytest.mark.asyncio
async def test_rag_pipeline_and_memory(client: AsyncClient):
    files = {
        "file": (
            "ai_market.txt",
            b"Enterprise AI platforms rely on LangGraph orchestration, hybrid RAG retrieval, and strict verification.",
            "text/plain",
        )
    }
    up = await client.post("/api/documents/upload", files=files, data={"collection": "pytest"})
    assert up.status_code == 200
    doc = up.json()
    assert doc["chunk_count"] >= 1

    search = await client.get("/api/documents/search", params={"query": "LangGraph hybrid RAG", "collection": "pytest"})
    assert search.status_code == 200
    hits = search.json()["results"]
    assert len(hits) >= 1
    assert "LangGraph" in hits[0]["content"]

    mem = await client.post(
        "/api/memory",
        json={"layer": "long_term", "category": "preference", "content": "Prefer cited enterprise benchmarks"},
    )
    assert mem.status_code == 200
    mem_id = mem.json()["id"]

    list_m = await client.get("/api/memory", params={"layer": "long_term"})
    assert list_m.status_code == 200
    assert any(m["id"] == mem_id for m in list_m.json())

    del_m = await client.delete(f"/api/memory/{mem_id}")
    assert del_m.status_code == 200


@pytest.mark.asyncio
async def test_mcp_and_a2a_protocols(client: AsyncClient):
    servers = await client.get("/api/mcp/servers")
    assert servers.status_code == 200
    assert len(servers.json()) >= 3

    inv = await client.post(
        "/api/mcp/invoke",
        json={
            "server_id": "mcp-analytics",
            "tool_name": "compute_statistics",
            "arguments": {"values": [10, 20, 30, 40], "label": "revenue_growth"},
        },
    )
    assert inv.status_code == 200
    assert inv.json()["result"]["mean"] == 25.0

    cards = await client.get("/api/a2a/agents")
    assert cards.status_code == 200
    assert len(cards.json()) == 7

    a2a_task = await client.post(
        "/api/a2a/tasks",
        json={
            "sender_agent": "external-coordinator",
            "target_agent": "strategy",
            "objective": "Evaluate enterprise AI positioning",
            "payload": {"region": "Global"},
        },
    )
    assert a2a_task.status_code == 200
    assert a2a_task.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_end_to_end_langgraph_workflow_and_hitl(client: AsyncClient):
    # 1. Autonomous task
    t_res = await client.post(
        "/api/tasks",
        json={
            "objective": "Compare top enterprise AI orchestration platforms and generate strategic report",
            "research_depth": "standard",
            "priority": "high",
            "execution_mode": "autonomous",
        },
    )
    assert t_res.status_code == 200
    task_id = t_res.json()["id"]

    # Wait for background workflow to complete (up to 30s)
    detail = None
    for _ in range(120):
        await asyncio.sleep(0.25)
        d_res = await client.get(f"/api/tasks/{task_id}")
        detail = d_res.json()
        if detail["task"]["status"] in ("completed", "failed"):
            break

    assert detail is not None
    assert detail["task"]["status"] == "completed"
    assert detail["task"]["progress"] == 100.0
    assert len(detail["executions"]) >= 6

    reports = (await client.get("/api/reports")).json()
    matching = [r for r in reports if r["task_id"] == task_id]
    assert len(matching) == 1
    assert matching[0]["has_pdf"] is True

    # 2. Supervised HITL task
    s_res = await client.post(
        "/api/tasks",
        json={
            "objective": "Investigate AI compliance frameworks with human approval gate",
            "research_depth": "quick",
            "priority": "critical",
            "execution_mode": "supervised",
        },
    )
    assert s_res.status_code == 200
    s_task_id = s_res.json()["id"]

    for _ in range(60):
        await asyncio.sleep(0.25)
        d_res = await client.get(f"/api/tasks/{s_task_id}")
        if d_res.json()["task"]["status"] == "awaiting_approval":
            break

    approvals = (await client.get("/api/approvals", params={"status": "pending"})).json()
    target_app = [a for a in approvals if a["task_id"] == s_task_id]
    assert len(target_app) == 1

    dec = await client.post(
        f"/api/approvals/{target_app[0]['id']}/decide",
        json={"decision": "approved", "reviewer_note": "Verified by QA"},
    )
    assert dec.status_code == 200

    for _ in range(60):
        await asyncio.sleep(0.25)
        d_res = await client.get(f"/api/tasks/{s_task_id}")
        if d_res.json()["task"]["status"] == "completed":
            break

    final_s = (await client.get(f"/api/tasks/{s_task_id}")).json()
    assert final_s["task"]["status"] == "completed"
