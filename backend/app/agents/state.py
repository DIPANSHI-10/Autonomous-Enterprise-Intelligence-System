"""Typed LangGraph shared workflow state."""

from typing import Any, TypedDict


class WorkflowState(TypedDict, total=False):
    task_id: str
    project_id: str | None
    objective: str
    research_depth: str
    priority: str
    execution_mode: str
    attached_document_ids: list[str]

    # Planning
    plan: list[dict[str, Any]]
    current_step: str

    # Research & RAG
    research_sources: list[dict[str, Any]]
    rag_references: list[dict[str, Any]]

    # Extraction
    extracted_entities: list[dict[str, Any]]

    # Analysis (computed in Python)
    analysis_metrics: dict[str, Any]
    chart_datasets: list[dict[str, Any]]
    analysis_insights: list[str]

    # Verification
    verification_status: str  # verified | needs_research | partial
    verified_claims: list[dict[str, Any]]
    unverified_claims: list[str]
    retry_count: int
    max_retries: int

    # Strategy & Report
    strategic_recommendations: list[dict[str, Any]]
    report_id: str | None
    report_title: str
    executive_summary: str
    report_markdown: str
    pdf_path: str | None

    # Approval / HITL
    approval_required: bool
    approval_status: str  # none | pending | approved | rejected
    approval_id: str | None

    # Errors & metrics
    total_tokens: int
    errors: list[str]
