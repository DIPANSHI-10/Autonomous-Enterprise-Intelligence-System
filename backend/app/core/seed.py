"""Seed default agent definitions and integrations on startup."""

from sqlalchemy import select
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.domain import AgentDefinition, Integration, Project, User

DEFAULT_AGENTS = [
    {
        "id": "supervisor",
        "name": "Supervisor Agent",
        "role": "Central Workflow Orchestrator",
        "description": "Understands objectives, decomposes subtasks, coordinates specialized agents, and manages approvals.",
        "system_instructions": "Coordinate multi-agent execution, enforce verification, and ensure strategic alignment.",
        "tools": ["task_planner", "state_router", "approval_gate"],
        "capabilities": ["planning", "orchestration", "error_recovery"],
        "color_theme": "violet",
    },
    {
        "id": "research",
        "name": "Research Agent",
        "role": "External & Knowledge Intelligence",
        "description": "Searches the web, inspects public sources, queries RAG knowledge base, and collects citations.",
        "system_instructions": "Gather verifiable evidence from web search and enterprise documents. Never fabricate URLs.",
        "tools": ["web_search", "fetch_url_summary", "knowledge_base_retrieve"],
        "capabilities": ["web_research", "rag_retrieval", "source_collection"],
        "color_theme": "cyan-green",
    },
    {
        "id": "extraction",
        "name": "Data Extraction Agent",
        "role": "Structured Schema Normalization",
        "description": "Extracts company, product, pricing, and technology attributes into strict Pydantic schemas.",
        "system_instructions": "Normalize unstructured findings into clean typed records and flag missing fields.",
        "tools": ["pydantic_extractor", "entity_normalizer"],
        "capabilities": ["structured_extraction", "schema_validation"],
        "color_theme": "cyan",
    },
    {
        "id": "analyst",
        "name": "Data Analyst Agent",
        "role": "Quantitative & Statistical Analysis",
        "description": "Performs Python/NumPy statistical calculations, outlier detection, and chart dataset generation.",
        "system_instructions": "Use Python calculations for all numerical metrics. Never invent numbers.",
        "tools": ["compute_statistics", "chart_dataset_builder"],
        "capabilities": ["statistical_analysis", "trend_detection", "benchmarking"],
        "color_theme": "gold",
    },
    {
        "id": "verification",
        "name": "Verification Agent",
        "role": "Evidence & Fact Verification",
        "description": "Cross-checks claims against retrieved sources, flags unsupported statements, and triggers retries.",
        "system_instructions": "Verify every claim against retrieved source URLs or document chunks.",
        "tools": ["claim_verifier", "source_cross_check"],
        "capabilities": ["fact_checking", "contradiction_detection"],
        "color_theme": "emerald",
    },
    {
        "id": "strategy",
        "name": "Strategy Agent",
        "role": "Competitive & Decision Intelligence",
        "description": "Identifies market positioning, competitive gaps, and evidence-based strategic recommendations.",
        "system_instructions": "Synthesize verified findings into actionable enterprise strategy.",
        "tools": ["gap_analyzer", "positioning_matrix"],
        "capabilities": ["competitive_analysis", "strategic_reasoning"],
        "color_theme": "blue",
    },
    {
        "id": "report",
        "name": "Report Agent",
        "role": "Executive Intelligence Synthesis",
        "description": "Compiles verified findings, citations, and analytics into structured Markdown and PDF reports.",
        "system_instructions": "Produce executive-ready reports grounded strictly in verified findings and citations.",
        "tools": ["markdown_compiler", "pdf_exporter"],
        "capabilities": ["report_generation", "pdf_export", "citation_formatting"],
        "color_theme": "orange",
    },
]


async def seed_defaults() -> None:
    settings = get_settings()
    async with AsyncSessionLocal() as db:
        for ag in DEFAULT_AGENTS:
            existing = (
                await db.execute(select(AgentDefinition).where(AgentDefinition.id == ag["id"]))
            ).scalar_one_or_none()
            if not existing:
                db.add(
                    AgentDefinition(
                        id=ag["id"],
                        name=ag["name"],
                        role=ag["role"],
                        description=ag["description"],
                        system_instructions=ag["system_instructions"],
                        model_provider=settings.DEFAULT_LLM_PROVIDER,
                        model_name=settings.DEFAULT_LLM_MODEL,
                        tools=ag["tools"],
                        capabilities=ag["capabilities"],
                        color_theme=ag["color_theme"],
                        enabled=True,
                    )
                )

        default_proj = (
            await db.execute(select(Project).where(Project.name == "Enterprise AI Market Intelligence"))
        ).scalar_one_or_none()
        if not default_proj:
            db.add(
                Project(
                    name="Enterprise AI Market Intelligence",
                    description="Default workspace for autonomous multi-agent competitive and market intelligence.",
                    status="active",
                )
            )

        admin_user = (
            await db.execute(select(User).where(User.email == "admin@enterprise-ai.local"))
        ).scalar_one_or_none()
        if not admin_user:
            db.add(
                User(
                    email="admin@enterprise-ai.local",
                    full_name="Enterprise Administrator",
                    hashed_password=hash_password("EnterpriseAI#2026"),
                    role="admin",
                    is_active=True,
                )
            )

        integrations = [
            {
                "id": "llm-openai",
                "name": "OpenAI",
                "category": "llm",
                "status": "connected" if settings.OPENAI_API_KEY else "standby",
                "endpoint": "https://api.openai.com/v1",
            },
            {
                "id": "llm-gemini",
                "name": "Google Gemini",
                "category": "llm",
                "status": "connected" if settings.GOOGLE_API_KEY else "standby",
                "endpoint": "https://generativelanguage.googleapis.com",
            },
            {
                "id": "llm-anthropic",
                "name": "Anthropic Claude",
                "category": "llm",
                "status": "connected" if settings.ANTHROPIC_API_KEY else "standby",
                "endpoint": "https://api.anthropic.com",
            },
            {
                "id": "mcp-sdk",
                "name": "Model Context Protocol (MCP)",
                "category": "mcp",
                "status": "connected",
                "endpoint": "in-process://mcp-registry",
            },
            {
                "id": "a2a-protocol",
                "name": "Agent2Agent (A2A) Gateway",
                "category": "a2a",
                "status": "connected",
                "endpoint": "/api/a2a",
            },
            {
                "id": "vector-rag",
                "name": f"Vector RAG ({settings.VECTOR_BACKEND})",
                "category": "database",
                "status": "connected",
                "endpoint": settings.QDRANT_URL if settings.VECTOR_BACKEND == "qdrant" else "local://hybrid",
            },
        ]
        for integ in integrations:
            existing_i = (
                await db.execute(select(Integration).where(Integration.id == integ["id"]))
            ).scalar_one_or_none()
            if not existing_i:
                db.add(Integration(**integ))

        await db.commit()
