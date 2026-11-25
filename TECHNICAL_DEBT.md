# Technical Debt Register — Autonomous Enterprise Intelligence System

| ID | Severity | Component | Description | Remediation |
|---|---|---|---|---|
| TD-01 | **Critical** | `rag_service.py` | Uses SHA-256 hash projection instead of pretrained semantic embeddings (`all-MiniLM-L6-v2`). | Replace with `sentence-transformers` `all-MiniLM-L6-v2` + index-version tracking & rebuild. |
| TD-02 | **Critical** | `rag_service.py` | Keyword score is simple token set overlap, not genuine BM25. | Replace with `rank-bm25` (`BM25Okapi`) + duplicate chunk filtering. |
| TD-03 | **High** | `llm_provider.py` | Returns hardcoded `fallback_data` and fabricated token counts when API keys are missing. | Return explicit `configuration_required` metadata; add retries, backoff, structured output, and Langfuse hook. |
| TD-04 | **High** | `agents/nodes.py` | `extraction_node` and `strategy_node` contain hardcoded products, pricing, sentiment scores, and recommendations. | Compute from real retrieved text/LLM structured output; flag unconfigured LLM honestly. |
| TD-05 | **High** | `a2a_service.py` | A2A tasks are stored in an in-memory `dict` and return simulated summaries. | Add `A2ATask` SQLAlchemy model and execute real agent/tool handlers. |
| TD-06 | **High** | `security.py` | `verify_a2a_token` allows empty headers; no JWT/RBAC endpoints exist despite `User` model. | Implement JWT auth, RBAC roles, strict A2A token verification, and broader rate limiting. |
| TD-07 | **Medium** | `agents/graph.py` | Uses `MemorySaver()` only; `resume_after_approval` bypasses graph execution. | Persist checkpoints in DB (`Task.workflow_state` + `AgentExecution`) and resume cleanly through graph. |
| TD-08 | **Medium** | `memory_service.py` | Lacks `project_id`/`session_id` isolation and retention/expiration (`expires_at`). | Add workspace/session columns, filtering, and retention cleanup. |
| TD-09 | **Medium** | `main.py` | `PATCH /api/settings` mutates in-memory singleton only and resets on restart. | Persist runtime settings in `Integration` / `SystemSetting` DB record. |
| TD-10 | **Medium** | `tests/` | Missing agent unit tests, RAG Recall@K/Precision@K/MRR evaluation, embedding consistency, and auth tests. | Add dedicated unit, security, and RAG/agent evaluation test suites. |
