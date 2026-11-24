# Autonomous Enterprise Intelligence System

> **Multi-Agent AI Powered Enterprise Intelligence Platform**
>
> A fully integrated, production-oriented agentic AI system where multiple specialized agents collaborate through LangGraph workflows to research, analyze, verify, strategize, and generate executive intelligence reports — with real-time streaming, hybrid RAG, persistent memory, MCP tooling, and A2A interoperability.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [Key Features](#4-key-features)
5. [Architecture Overview](#5-architecture-overview)
6. [Agent Architecture](#6-agent-architecture)
7. [LangGraph Workflow](#7-langgraph-workflow)
8. [MCP Integration](#8-mcp-integration)
9. [A2A Architecture](#9-a2a-architecture)
10. [RAG Pipeline](#10-rag-pipeline)
11. [Memory Architecture](#11-memory-architecture)
12. [Database Schema](#12-database-schema)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Backend Architecture](#14-backend-architecture)
15. [Technology Stack](#15-technology-stack)
16. [Folder Structure](#16-folder-structure)
17. [Installation Prerequisites](#17-installation-prerequisites)
18. [Environment Configuration](#18-environment-configuration)
19. [Backend Setup](#19-backend-setup)
20. [Frontend Setup](#20-frontend-setup)
21. [Docker Setup](#21-docker-setup)
22. [How to Run](#22-how-to-run)
23. [LLM Provider Configuration](#23-llm-provider-configuration)
24. [MCP Tool Configuration](#24-mcp-tool-configuration)
25. [API Endpoint Documentation](#25-api-endpoint-documentation)
26. [Sample Research Queries](#26-sample-research-queries)
27. [Example Agent Workflow](#27-example-agent-workflow)
28. [Testing Instructions](#28-testing-instructions)
29. [Security Architecture](#29-security-architecture)
30. [Known Limitations](#30-known-limitations)
31. [Troubleshooting](#31-troubleshooting)
32. [Future Improvements](#32-future-improvements)

---

## 1. Project Overview

The **Autonomous Enterprise Intelligence System** is a production-oriented, multi-agent AI platform. Users submit complex natural-language objectives such as:

> *"Research the top 10 AI companies, compare their products, pricing, technologies, customer feedback and market positioning. Identify competitive gaps and generate a detailed strategic report."*

The system autonomously:
- Decomposes the objective using the Supervisor Agent
- Executes parallel web research and hybrid RAG retrieval
- Extracts normalized structured entities via Pydantic schemas
- Runs real Python/NumPy quantitative analysis
- Verifies every claim against retrieved sources
- Synthesizes evidence-backed strategic recommendations
- Generates a comprehensive report with PDF export and source citations
- Streams every execution event to the browser in real time

---

## 2. Problem Statement

Enterprise teams need reliable, verifiable intelligence — not hallucinated LLM summaries. Single-model chatbots cannot:
- Execute multi-step, long-horizon research workflows
- Verify claims against primary sources
- Perform real numerical analysis (they invent numbers)
- Maintain persistent organizational knowledge
- Provide auditable execution histories
- Coordinate specialized agents for different cognitive tasks

---

## 3. Objectives

- Build a **genuine multi-agent system** where agents have distinct roles, permissions, and tools
- Implement **verifiable execution** — no claim is marked verified without source evidence
- Provide **real-time observability** of every agent transition via SSE streaming
- Create a **premium enterprise UI** that reflects actual backend state
- Support **human-in-the-loop authorization** via LangGraph checkpoints and interrupts
- Enable **enterprise document intelligence** through hybrid RAG (semantic + keyword + reranking)
- Persist **three-layer memory** (short-term, long-term, episodic) across restarts
- Expose **MCP and A2A protocols** for ecosystem interoperability

---

## 4. Key Features

| Feature | Implementation |
|---|---|
| Multi-agent orchestration | LangGraph StateGraph with 7 specialized agents |
| Real-time streaming | Server-Sent Events (SSE) event bus |
| 3D Neural Globe | Three.js + React Three Fiber + Drei, 1,600 particles |
| Workflow visualization | React Flow (@xyflow/react) with animated particle edges |
| Hybrid RAG | Cosine similarity + BM25 keyword + phrase boost reranking |
| Persistent memory | 3-layer DB model (short-term, long-term, episodic) |
| PDF report export | ReportLab with citations and analytics |
| Human approval gate | LangGraph interrupts + checkpoint resume |
| MCP integration | In-process tool registry with permission enforcement |
| A2A interoperability | Agent card discovery and task protocol |
| Security | Prompt injection sanitization, rate limiting, audit logs |
| Provider abstraction | OpenAI / Google Gemini / Anthropic with graceful fallback |

---

## 5. Architecture Overview

```mermaid
flowchart TD
    UI["React Frontend\n(Vite + Three.js + React Flow)"]
    API["FastAPI Backend"]
    LG["LangGraph Orchestration Engine"]
    DB["SQLite / PostgreSQL + pgvector\n(SQLAlchemy Async)"]
    RAG["Hybrid RAG Service\n(Cosine + BM25 + Reranking)"]
    MEM["Memory Service\n(Short-Term / Long-Term / Episodic)"]
    MCP["MCP Tool Registry\n(Research / Analytics / KB)"]
    A2A["A2A Gateway\n(Agent Card Discovery)"]
    LLM["LLM Provider Abstraction\n(OpenAI / Gemini / Anthropic)"]
    SSE["SSE Event Bus\n(Real-Time Streaming)"]
    PDF["ReportLab PDF Generator"]

    UI <-->|REST + SSE| API
    API --> LG
    LG --> LLM
    LG --> RAG
    LG --> MEM
    LG --> MCP
    LG --> PDF
    API --> A2A
    API --> DB
    RAG --> DB
    MEM --> DB
    LG -->|Events| SSE
    SSE -->|live stream| UI
```

---

## 6. Agent Architecture

| Agent | Role | Key Tools |
|---|---|---|
| **Supervisor Agent** | Central orchestrator — decomposes objectives, routes agents, handles HITL | task_planner, state_router, approval_gate |
| **Research Agent** | Web search, URL fetching, hybrid RAG knowledge retrieval | web_search, fetch_url_summary, knowledge_base_retrieve |
| **Data Extraction Agent** | Pydantic schema normalization of entities, products, pricing, technologies | pydantic_extractor, entity_normalizer |
| **Data Analyst Agent** | Python/NumPy quantitative analysis, outlier detection, chart datasets | compute_statistics, chart_dataset_builder |
| **Verification Agent** | Cross-checks claims against source URLs and RAG evidence; triggers retry | claim_verifier, source_cross_check |
| **Strategy Agent** | Competitive gap analysis, market positioning, evidence-based recommendations | gap_analyzer, positioning_matrix |
| **Report Agent** | Markdown + PDF report compilation with verified citations | markdown_compiler, pdf_exporter |

---

## 7. LangGraph Workflow

```mermaid
flowchart TD
    START --> SUPERVISOR
    SUPERVISOR --> RESEARCH
    RESEARCH --> EXTRACTION
    EXTRACTION --> ANALYST
    ANALYST --> VERIFICATION
    VERIFICATION -->|verified / partial| STRATEGY
    VERIFICATION -->|needs_research retry| RESEARCH
    STRATEGY -->|autonomous mode| REPORT
    STRATEGY -->|supervised mode| HITL["HITL Approval Gate\n(LangGraph Interrupt)"]
    HITL -->|approved| REPORT
    HITL -->|rejected| END_CANCEL["END — Cancelled"]
    REPORT --> END
```

**State transitions** are persisted via LangGraph `MemorySaver` checkpoints, enabling workflow resumption after human approval decisions.

---

## 8. MCP Integration

Three built-in MCP servers with permission-enforced tool execution:

| Server | Permission | Tools |
|---|---|---|
| `mcp-research` | `read:web`, `read:public_docs` | `web_search`, `fetch_url_summary` |
| `mcp-knowledge` | `read:documents`, `read:vectors` | `knowledge_base_retrieve` |
| `mcp-analytics` | `compute:python_math` | `compute_statistics` |

All tool invocations are logged to `tool_executions` with arguments, results, and latency. Agents never receive unrestricted shell or database access.

---

## 9. A2A Architecture

```mermaid
sequenceDiagram
    participant External as External Agent
    participant Gateway as A2A Gateway (/api/a2a)
    participant Registry as AgentDefinition Registry
    participant TargetAgent as Target Agent Node

    External->>Gateway: GET /api/a2a/agents (discover agent cards)
    Gateway->>Registry: SELECT enabled agents
    Registry-->>Gateway: Agent capability cards
    Gateway-->>External: JSON A2A agent cards

    External->>Gateway: POST /api/a2a/tasks {sender, target, objective}
    Gateway->>Registry: Validate target agent exists
    Gateway->>TargetAgent: Delegate objective with payload
    TargetAgent-->>Gateway: Structured result
    Gateway-->>External: A2A task result with protocol/v1 envelope
```

---

## 10. RAG Pipeline

```
Document Upload (PDF / DOCX / TXT / MD)
        │
        ▼
  Document Parsing (pypdf / python-docx / UTF-8 decode)
        │
        ▼
  Text Sanitization (prompt injection removal + control char stripping)
        │
        ▼
  Sliding-Window Chunking (750 chars, 120 char overlap)
        │
        ▼
  Local Hash-Projection Embedding (128-dim, deterministic, offline-ready)
        │
        ▼
  SQLAlchemy Async Persistence (DocumentChunk table with JSON embedding)
        │
        ▼
  Hybrid Retrieval Query:
    ├── Cosine Vector Similarity (60% weight)
    ├── BM25-style Token Overlap (40% weight)
    └── Exact Phrase Boost (+0.15 reranking bonus)
        │
        ▼
  Top-K Ranked Results with relevance_score, filename, and citations
        │
        ▼
  Agent Context Assembly → LLM Generation
```

> **Note**: Plug in OpenAI Embeddings or Sentence Transformers to replace the local hash projection for production-grade semantic quality.

---

## 11. Memory Architecture

| Layer | Storage | Persistence | Contents |
|---|---|---|---|
| **Short-Term** | `memory_records` (layer=short_term) | Session scoped | Active conversation state, transient context |
| **Long-Term** | `memory_records` (layer=long_term) | Permanent | User preferences, approved knowledge, recurring patterns |
| **Episodic** | `memory_records` (layer=episodic) | Permanent | Past workflow outcomes, lessons learned, strategic context |

All layers persist across application restarts (database-backed). The `/api/memory` endpoints support search, creation, and deletion per record or per task.

---

## 12. Database Schema

Core tables (SQLAlchemy Async + Alembic migrations):

| Table | Purpose |
|---|---|
| `users` | User accounts and preferences |
| `projects` | Research project workspaces |
| `tasks` | Submitted objectives with workflow state |
| `agent_definitions` | Configured agent specs (model, tools, instructions) |
| `agent_executions` | Per-agent execution records (tokens, latency, I/O) |
| `workflow_events` | Every LangGraph state transition (SSE source) |
| `tool_executions` | MCP tool invocations with arguments and results |
| `documents` | Uploaded Knowledge Base documents |
| `document_chunks` | Chunked text with local embeddings (JSON) |
| `memory_records` | Three-layer persistent memory |
| `reports` | Generated intelligence reports with citations and PDF path |
| `approval_requests` | HITL approval requests linked to tasks |
| `integrations` | LLM/MCP/A2A integration registry |
| `audit_logs` | Full audit trail of all system actions |

---

## 13. Frontend Architecture

```
frontend/src/
├── main.tsx                     # React 18 StrictMode entry point
├── App.tsx                      # Root layout: Sidebar + TopNav + Page Router + Toasts
├── index.css                    # Tailwind CSS v4 + design system tokens
├── types/index.ts               # Shared TypeScript interfaces
├── services/api.ts              # Typed fetch-based API client
├── store/useAppStore.ts         # Zustand global state store with SSE integration
├── components/
│   ├── common/
│   │   ├── GlassCard.tsx        # Animated glassmorphism card primitive
│   │   ├── CommandInput.tsx     # Sophisticated natural-language task submission form
│   │   └── ApprovalModal.tsx    # Human-in-the-Loop approval decision modal
│   ├── layout/
│   │   ├── Sidebar.tsx          # 12-item navigation sidebar
│   │   └── TopNav.tsx           # Global search, SSE status, notifications, profile
│   ├── neural/
│   │   └── NeuralGlobe.tsx      # Three.js 3D neural intelligence globe (1,600 particles)
│   └── studio/
│       ├── AgentNode.tsx        # React Flow agent card node with hover telemetry panel
│       └── AnimatedEdge.tsx     # Animated particle edges reflecting LangGraph transitions
└── pages/
    ├── NeuralDashboard.tsx      # Dashboard 1: Neural Globe + 4 sidebar panels + analytics
    ├── OrchestrationStudio.tsx  # Dashboard 2: React Flow workflow + agent inspector
    ├── ProjectsPage.tsx
    ├── AgentsPage.tsx
    ├── ResearchWorkspacePage.tsx
    ├── KnowledgeBasePage.tsx
    ├── MemoryPage.tsx
    ├── ReportsPage.tsx
    ├── ExecutionLogsPage.tsx
    ├── AnalyticsPage.tsx
    ├── IntegrationsPage.tsx
    └── SettingsPage.tsx
```

---

## 14. Backend Architecture

```
backend/
├── app/
│   ├── main.py                  # FastAPI application, all API endpoints, lifespan events
│   ├── core/
│   │   ├── config.py            # Pydantic Settings v2 with env validation
│   │   ├── database.py          # Async SQLAlchemy engine, session factory, init_db
│   │   ├── security.py          # Sanitization, rate limiter, A2A token validation
│   │   ├── logging.py           # Structured logging configuration
│   │   └── seed.py              # Default agent definitions and integration records
│   ├── models/
│   │   └── domain.py            # 14 normalized SQLAlchemy ORM models
│   ├── schemas/
│   │   └── api.py               # Pydantic v2 request/response schemas
│   ├── agents/
│   │   ├── state.py             # Typed LangGraph WorkflowState TypedDict
│   │   ├── tools.py             # Web search, URL fetch, Pydantic extraction, NumPy analysis
│   │   ├── nodes.py             # 7 specialized agent node implementations
│   │   └── graph.py             # LangGraph StateGraph compilation and async execution
│   └── services/
│       ├── event_bus.py         # Async SSE event bus with per-task subscriptions
│       ├── llm_provider.py      # Multi-provider LLM abstraction with fallback
│       ├── rag_service.py       # Hybrid RAG: parsing, chunking, embedding, retrieval
│       ├── memory_service.py    # Three-layer persistent memory CRUD
│       ├── mcp_service.py       # MCP server registry and safe tool execution
│       ├── a2a_service.py       # A2A agent card discovery and task protocol
│       ├── report_service.py    # ReportLab PDF generation
│       └── analytics_service.py # Real database-derived dashboard metrics
├── tests/
│   └── test_platform.py        # Comprehensive async pytest integration tests
├── alembic/
│   └── env.py                   # Async Alembic migration environment
├── alembic.ini
├── pyproject.toml
└── requirements.txt
```

---

## 15. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 6 | Build tool and dev server |
| Tailwind CSS | 4 | Utility-first design system |
| Framer Motion | 11 | UI animations and page transitions |
| Three.js | 0.170 | 3D neural globe rendering |
| React Three Fiber | 8 | Declarative Three.js in React |
| @react-three/drei | 9 | Three.js helpers (OrbitControls, Html) |
| @xyflow/react | 12 | Interactive workflow graph (React Flow) |
| Recharts | 2 | Analytical charts |
| Zustand | 5 | Global state management |
| Lucide React | 0.468 | Icon library |
| Vitest | 2 | Unit and component tests |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.115 | Async web framework |
| Pydantic v2 | 2.10 | Schema validation and settings |
| SQLAlchemy (async) | 2.0 | ORM and database layer |
| aiosqlite | 0.20 | Async SQLite driver (local dev) |
| asyncpg | 0.30 | Async PostgreSQL driver (production) |
| Alembic | 1.14 | Database migrations |
| LangGraph | 0.2 | Multi-agent workflow orchestration |
| LangChain | 0.3 | LLM abstractions and tool calling |
| langchain-openai | 0.2 | OpenAI integration |
| langchain-google-genai | 2.0 | Google Gemini integration |
| langchain-anthropic | 0.3 | Anthropic Claude integration |
| pypdf | 5 | PDF text extraction |
| python-docx | 1.1 | DOCX text extraction |
| numpy | 1.26 | Quantitative analysis |
| BeautifulSoup4 | 4.12 | Web content sanitization |
| httpx | 0.28 | Async HTTP client |
| ReportLab | 4.2 | PDF report generation |
| sse-starlette | 3 | Server-Sent Events |
| mcp | 1.2 | Model Context Protocol SDK |
| pytest-asyncio | 0.25 | Async test execution |

---

## 16. Folder Structure

```
AgenticAI/
├── .env.example                 # Environment template (never commit .env)
├── .gitignore
├── CONTRIBUTING.md
├── DEVELOPMENT_PROGRESS.md      # Live milestone tracker
├── Dockerfile
├── docker-compose.yml
├── README.md
├── backend/
│   ├── .venv/                   # Python virtual environment (uv)
│   ├── alembic.ini
│   ├── alembic/env.py
│   ├── app/                     # Application package
│   ├── generated_reports/       # PDF output directory (auto-created)
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── tests/
└── frontend/
    ├── index.html
    ├── package.json
    ├── src/                     # React application source
    ├── tests/                   # Vitest test suite
    ├── tsconfig.json
    └── vite.config.ts
```

---

## 17. Installation Prerequisites

| Requirement | Minimum Version |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 8+ |
| uv (Python package manager) | 0.4+ |

**Optional for production:**
- Docker + Docker Compose (for PostgreSQL + Redis)
- PostgreSQL 16 with pgvector extension

---

## 18. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` and configure at minimum:

```env
# Required for live LLM execution (at least one):
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...

# Optional for web search (DuckDuckGo fallback available without key):
TAVILY_API_KEY=tvly-...

# Optional for production database:
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/enterprise_intelligence
```

> The system operates in **Deterministic Structured Mode** when no LLM API key is configured — all agent workflows execute with structured fallback responses, enabling full testing without API costs.

---

## 19. Backend Setup

```bash
cd backend

# Create virtual environment with uv
uv venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
uv pip install -r requirements.txt --python .\.venv\Scripts\python.exe

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend automatically:
- Creates all database tables on startup (`init_db`)
- Seeds 7 default agent definitions and 6 integration records
- Creates the `generated_reports/` directory for PDF exports

---

## 20. Frontend Setup

```bash
cd frontend

npm install

# Development server (proxies /api to localhost:8000)
npm run dev

# Production build
npm run build

# Run tests
npm test
```

---

## 21. Docker Setup

```bash
# Start PostgreSQL + Redis + Backend
docker-compose up -d

# Backend available at http://localhost:8000
# Frontend (dev): cd frontend && npm run dev
```

---

## 22. How to Run

**Full stack (development):**

```bash
# Terminal 1 — Backend
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## 23. LLM Provider Configuration

The system auto-selects providers in priority order: OpenAI → Gemini → Anthropic → Deterministic Fallback.

| Provider | Environment Variable | Recommended Model |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` (default) |
| Google Gemini | `GOOGLE_API_KEY` | `gemini-2.0-flash` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-3-5-sonnet-latest` |

Configure per-agent model via **Settings → Platform Settings** UI or `PATCH /api/agents/{id}`.

---

## 24. MCP Tool Configuration

Three MCP servers are registered automatically:

| Server ID | Transport | Test Command |
|---|---|---|
| `mcp-research` | HTTP/SDK | `POST /api/mcp/invoke` with `tool_name: web_search` |
| `mcp-knowledge` | In-process | `POST /api/mcp/invoke` with `tool_name: knowledge_base_retrieve` |
| `mcp-analytics` | In-process | `POST /api/mcp/invoke` with `tool_name: compute_statistics` |

---

## 25. API Endpoint Documentation

### Core
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | System health check |
| GET | `/api/dashboard/metrics` | Real-time operational metrics |

### Tasks
| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Submit new research objective (triggers LangGraph) |
| GET | `/api/tasks/{id}` | Task detail with executions and events |
| POST | `/api/tasks/{id}/cancel` | Cancel a running task |
| POST | `/api/tasks/{id}/retry` | Retry a failed task |
| GET | `/api/events/stream?task_id=` | Server-Sent Events live stream |

### Agents / Projects / Memory / Documents / Reports
| Method | Path | Description |
|---|---|---|
| GET/PATCH | `/api/agents`, `/api/agents/{id}` | List and configure agents |
| GET/POST/PATCH | `/api/projects` | Project management |
| GET/POST | `/api/memory` | Memory CRUD |
| POST | `/api/documents/upload` | RAG document ingestion |
| GET | `/api/documents/search?query=` | Hybrid vector+keyword search |
| GET | `/api/reports` | List intelligence reports |
| GET | `/api/reports/{id}/pdf` | Download PDF report |

### HITL / MCP / A2A / Settings
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/approvals` | List/decide approval requests |
| GET | `/api/mcp/servers` | MCP server registry |
| POST | `/api/mcp/invoke` | Execute MCP tool |
| GET | `/api/a2a/agents` | A2A agent card discovery |
| POST | `/api/a2a/tasks` | Submit A2A task |
| GET/PATCH | `/api/settings` | Platform configuration |

---

## 26. Sample Research Queries

```
Research the top 10 AI companies, compare their products, pricing, technologies,
customer feedback and market positioning. Identify competitive gaps and generate
a detailed strategic report.

Analyze enterprise RAG and multi-agent orchestration frameworks, benchmark
latency and accuracy tradeoffs, and recommend an architecture decision.

Investigate global AI governance and compliance standards (EU AI Act, NIST AI RMF)
and produce an executive readiness checklist with risk assessment.

Compare cloud hyperscaler AI platform offerings (AWS Bedrock, Azure AI Foundry,
Google Vertex AI) on pricing, capabilities, and enterprise integrations.
```

---

## 27. Example Agent Workflow

1. **User submits objective** via Command Input on Neural Dashboard
2. **API creates Task** record, launches `run_task_workflow` as async background task
3. **Supervisor Agent** decomposes objective into 6-step plan, persists to DB
4. **Research Agent** queries web search + hybrid RAG, logs tool executions to MCP
5. **Data Extraction Agent** normalizes entities into Pydantic `ExtractedEntity` schemas
6. **Data Analyst Agent** runs NumPy statistics on extracted sentiment and technology data
7. **Verification Agent** cross-checks entity source URLs against retrieved references
   - If verification fails and retries < max: routes back to Research Agent
   - If verification passes: routes to Strategy Agent
8. **Strategy Agent** generates evidence-backed recommendations
   - If `supervised` mode: creates ApprovalRequest, pauses via LangGraph checkpoint
   - User approves in UI → workflow resumes
9. **Report Agent** compiles Markdown + PDF, stores in DB with citations
10. **SSE event bus** streams all 7 agent transitions to the browser in real time
11. Frontend updates Neural Globe, Orchestration Studio graph, and Execution Logs

---

## 28. Testing Instructions

### Backend Tests (Pytest)
```bash
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```

**Test suite covers:**
- Health and dashboard metrics endpoints
- Project creation and agent listing (7 agents seeded)
- RAG document ingestion and hybrid retrieval
- Memory CRUD across layers
- MCP tool invocation (compute_statistics returns correct values)
- A2A agent discovery and task protocol
- End-to-end LangGraph workflow (autonomous mode)
- Human-in-the-Loop approval gate and workflow resumption

### Frontend Tests (Vitest)
```bash
cd frontend
npm test
```

**Test suite covers:**
- Project name rendering (`Autonomous Enterprise Intelligence System`)
- All 12 navigation items present
- Page navigation to Orchestration Studio and Settings

### TypeScript Type Check + Production Build
```bash
cd frontend
npm run build
```

---

## 29. Security Architecture

| Concern | Mitigation |
|---|---|
| Prompt injection | `sanitize_untrusted_text()` strips injection patterns from all external content |
| Path traversal | `sanitize_filename()` strips path separators from uploads |
| Rate limiting | `InMemoryRateLimiter` (120 req/60s per IP) on task submission |
| File upload safety | Extension whitelist (pdf/docx/txt/md), size limit (20MB default) |
| API secrets | Never exposed in frontend code, logs, or API responses |
| A2A authentication | Bearer token validation on all A2A endpoints |
| Audit trail | `audit_logs` table records all create, modify, approval actions |
| Tool permissions | MCP servers enforce allowlisted tools; no unrestricted shell/DB access |
| Input validation | Pydantic v2 schema validation on all API request bodies |

---

## 30. Known Limitations

- **Embedding quality**: The local hash-projection embedding (128-dim) is offline-ready and deterministic but lower quality than OpenAI `text-embedding-3-small` or Sentence Transformers. Plug in an embedding API for production RAG.
- **In-memory event bus**: The SSE event bus is in-process. For multi-worker production, replace with Redis Pub/Sub.
- **LangGraph MemorySaver**: Uses in-memory checkpointing. For production, use `AsyncPostgresSaver` from `langgraph-checkpoint-postgres`.
- **A2A task execution**: A2A tasks invoke agents in a lightweight simulation mode. Full A2A remote agent invocation requires external agent endpoints.
- **Web search**: Without a Tavily API key, DuckDuckGo HTML search is used as fallback; it may be rate-limited.

---

## 31. Troubleshooting

| Issue | Resolution |
|---|---|
| `ModuleNotFoundError` | Run `uv pip install -r requirements.txt --python .venv\Scripts\python.exe` |
| Frontend build fails | Run `npm install` in `frontend/`, check Node.js ≥18 |
| Database locked (SQLite) | Only one Uvicorn worker; use PostgreSQL for multi-worker |
| Backend not reachable from frontend | Check Vite proxy config (`/api` → `localhost:8000`) |
| No LLM responses | Configure at least one LLM API key; system uses structured fallback otherwise |
| PDF export missing | Ensure `generated_reports/` directory is writable |
| SSE stream disconnects | Browser reconnects automatically; check `ALLOWED_ORIGINS` in `.env` |

---

## 32. Future Improvements

- **OpenAI Embeddings / Sentence Transformers** for production-grade RAG
- **Redis Pub/Sub** for multi-worker SSE event distribution
- **PostgreSQL + AsyncPostgresSaver** for production LangGraph checkpointing
- **pgvector** for native vector similarity queries
- **Mem0 integration** for semantic long-term memory management
- **Langfuse observability** for LLM trace visualization and cost tracking
- **Playwright E2E tests** for full browser workflow automation
- **OAuth2 / JWT authentication** with role-based access control
- **Scheduled intelligence tasks** (cron-triggered autonomous research)
- **Multi-tenant project isolation** for enterprise team deployments
- **Streaming LLM responses** (token-by-token) for the Neural Dashboard
- **Custom MCP server deployment** via the official MCP SDK stdio/SSE transport
