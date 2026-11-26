"""Tests for consecutive/concurrent multi-task report generation, PDF quality, and direct downloads."""

import asyncio
import io
import pytest
from httpx import ASGITransport, AsyncClient
from pypdf import PdfReader
from app.core.database import init_db
from app.core.seed import seed_defaults
from app.main import app


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="module")
async def mt_client():
    await init_db()
    await seed_defaults()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def _wait_for_task(client: AsyncClient, task_id: str, timeout_iters: int = 120) -> dict:
    detail = {}
    for _ in range(timeout_iters):
        await asyncio.sleep(0.25)
        res = await client.get(f"/api/tasks/{task_id}")
        assert res.status_code == 200
        detail = res.json()
        if detail["task"]["status"] in ("completed", "failed", "cancelled"):
            return detail
    return detail


@pytest.mark.asyncio
async def test_three_consecutive_tasks_and_pdf_quality(mt_client: AsyncClient):
    objectives = [
        "Analyze Cloud GPU & AI Inference Pricing Trends",
        "Evaluate Vector Databases <Qdrant vs pgvector> for Enterprise RAG",
        "Investigate Multi-Agent Governance & Audit Compliance Frameworks",
    ]

    report_ids: list[str] = []
    task_ids: list[str] = []

    for idx, obj in enumerate(objectives):
        create_res = await mt_client.post(
            "/api/tasks",
            json={
                "objective": obj,
                "research_depth": "standard",
                "priority": "high",
                "execution_mode": "autonomous",
            },
        )
        assert create_res.status_code == 200
        task_id = create_res.json()["id"]
        assert task_id not in task_ids
        task_ids.append(task_id)

        detail = await _wait_for_task(mt_client, task_id)
        assert detail["task"]["status"] == "completed", f"Task {idx+1} failed: {detail['task'].get('error_message')}"
        assert detail["task"]["progress"] == 100.0
        assert detail["report"] is not None, f"Task {idx+1} missing direct report link"
        assert detail["report"]["task_id"] == task_id
        assert detail["report"]["has_pdf"] is True

        report_id = detail["report"]["id"]
        assert report_id not in report_ids
        report_ids.append(report_id)

        # Direct PDF download from task detail's pdf_url
        pdf_res = await mt_client.get(detail["report"]["pdf_url"])
        assert pdf_res.status_code == 200
        assert pdf_res.headers["content-type"] == "application/pdf"
        assert pdf_res.content.startswith(b"%PDF-")

        # Inspect PDF text quality: relevant, no duplicate Executive Summary, no internal debug tokens
        reader = PdfReader(io.BytesIO(pdf_res.content))
        pdf_text = "\n".join(page.extract_text() or "" for page in reader.pages)
        assert obj[:30] in pdf_text
        assert pdf_text.count("Executive Summary") == 1
        assert "tokens_used" not in pdf_text
        assert "duration_ms" not in pdf_text

    # Verify Reports history retains all 3 distinct reports & all PDFs remain downloadable
    history = (await mt_client.get("/api/reports")).json()
    history_ids = {r["id"] for r in history}
    for rid in report_ids:
        assert rid in history_ids
        dl = await mt_client.get(f"/api/reports/{rid}/pdf")
        assert dl.status_code == 200


@pytest.mark.asyncio
async def test_concurrent_tasks_and_retry_isolation(mt_client: AsyncClient):
    res_a, res_b = await asyncio.gather(
        mt_client.post(
            "/api/tasks",
            json={"objective": "Concurrent Task Alpha: LLM Latency", "research_depth": "quick", "priority": "medium", "execution_mode": "autonomous"},
        ),
        mt_client.post(
            "/api/tasks",
            json={"objective": "Concurrent Task Beta: RAG Accuracy", "research_depth": "quick", "priority": "medium", "execution_mode": "autonomous"},
        ),
    )
    assert res_a.status_code == 200
    assert res_b.status_code == 200
    id_a, id_b = res_a.json()["id"], res_b.json()["id"]
    assert id_a != id_b

    det_a, det_b = await asyncio.gather(_wait_for_task(mt_client, id_a), _wait_for_task(mt_client, id_b))
    assert det_a["task"]["status"] == "completed"
    assert det_b["task"]["status"] == "completed"
    assert det_a["report"]["id"] != det_b["report"]["id"]
    assert "Alpha" in det_a["report"]["title"]
    assert "Beta" in det_b["report"]["title"]

    # Retry Task A and confirm it resets and produces a fresh report cleanly
    retry_res = await mt_client.post(f"/api/tasks/{id_a}/retry")
    assert retry_res.status_code == 200
    det_a_retry = await _wait_for_task(mt_client, id_a)
    assert det_a_retry["task"]["status"] == "completed"
    assert det_a_retry["report"]["has_pdf"] is True
