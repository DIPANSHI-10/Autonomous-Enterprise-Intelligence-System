# Implementation Roadmap — Autonomous Enterprise Intelligence System

This roadmap sequences all corrections from `PROJECT_AUDIT.md` while preserving the existing architecture, API contracts, and visual UI identity.

---

## Phase A: Core AI, RAG & Memory Upgrades
1. **LLM Provider Abstraction (`backend/app/services/llm_provider.py`)**
   - Add exponential backoff retries for transient errors and rate limits, configurable timeouts, and structured Pydantic output parsing.
   - Remove fake `fallback_data` responses that pretend AI synthesis occurred when API keys are missing; instead, return an explicit `configuration_required` status and clear message while keeping deterministic non-LLM data tools (NumPy analytics, BM25/vector retrieval, PDF rendering) clearly labeled.
   - Wire optional Langfuse tracing when `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are configured.
2. **Genuine Hybrid RAG (`backend/app/services/rag_service.py`)**
   - Replace SHA-256 hash projection with a real pretrained embedding model (`sentence-transformers` `all-MiniLM-L6-v2`, with clean model-name metadata tracking).
   - Implement genuine BM25 scoring using `rank-bm25`.
   - Track `embedding_model`, `chunk_size`, and `chunk_overlap` on `Document` / `DocumentChunk` and implement automatic/explicit index rebuild when configuration changes.
   - Add chunk deduplication, metadata filtering, configurable `top_k`, and a grounded RAG QA endpoint (`POST /api/documents/ask`) that cites retrieved chunks or explicitly states when evidence is insufficient.
3. **Persistent Memory & Checkpointing (`backend/app/services/memory_service.py`, `backend/app/agents/graph.py`)**
   - Add `workspace_id` (`project_id`), `session_id`, and `expires_at` retention support to `MemoryRecord`.
   - Persist LangGraph workflow checkpoints cleanly in the database alongside `Task.workflow_state`, and make `resume_after_approval` resume through the workflow graph cleanly.

## Phase B: Genuine 7-Agent Logic, MCP & A2A
4. **7 Specialized Agents (`backend/app/agents/nodes.py`, `backend/app/agents/tools.py`)**
   - Eliminate hardcoded entity attributes in `extraction_node` and hardcoded recommendations in `strategy_node`.
   - Derive entities, metrics, and recommendations from actual retrieved web/RAG evidence (via LLM structured output when configured, or honest evidence-derived extraction + explicit "LLM API key not configured for generative synthesis" notice when unconfigured).
   - Never fabricate `internal://knowledge-base/baseline` URLs as real retrieved sources.
5. **MCP & A2A (`backend/app/services/mcp_service.py`, `backend/app/services/a2a_service.py`)**
   - Add strict Pydantic argument validation per MCP tool.
   - Persist A2A tasks in a new `A2ATask` database table and route `submit_a2a_task` through real agent/tool execution rather than canned strings.

## Phase C: Security, Auth, RBAC & Backend Hardening
6. **Authentication, RBAC & Security (`backend/app/core/security.py`, `backend/app/main.py`)**
   - Implement JWT + password hashing (`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`) with seeded demo/admin user and configurable `AUTH_REQUIRED` flag (so local single-user dev works seamlessly while production enforces RBAC).
   - Fix `verify_a2a_token` using `A2A_SHARED_SECRET` / JWT validation.
   - Apply rate limiting to upload, MCP, A2A, and task endpoints; persist runtime settings to DB.

## Phase D: Frontend States, Testing, Evaluation & Docs
7. **Frontend Verification (`frontend/src/`)**
   - Surface clear LLM configuration status banner when no provider key is set, plus RAG "Ask Knowledge Base" grounded QA UI, without altering the existing visual layout or palette.
   - Verify loading, empty, error, and success states across all 12 pages.
8. **Comprehensive Testing & RAG/Agent Evaluation (`backend/tests/`, `frontend/tests/`)**
   - Add unit tests for all 7 agents, RAG evaluation suite (Recall@K, Precision@K, MRR, citation correctness), embedding consistency & reindex tests, auth/RBAC tests, prompt-injection tests, and HITL resume tests.
9. **Deployment & Final Documentation**
   - Update `Dockerfile`, `docker-compose.yml`, `.env.example`, `README.md`, and generate `FINAL_AUDIT_REPORT.md`, `COMPLETED_FEATURES.md`, `REMAINING_TASKS.md`, and `TEST_RESULTS.md`.
