# Remaining Tasks & Environment-Dependent Items

1. **Live External LLM Provider Verification**: `OPENAI_API_KEY`, `GOOGLE_API_KEY`, and `ANTHROPIC_API_KEY` are not set in this local environment. Once keys are added to `.env`, run an end-to-end task to verify live generative synthesis and token billing metadata from the chosen provider.
2. **Live Langfuse Tracing Verification**: `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` hooks are wired in `llm_provider.py`; verify live trace ingestion against a Langfuse cloud or self-hosted project once keys are configured.
3. **Production PostgreSQL + pgvector / Docker Verification**: Docker Engine is not installed on this Windows machine, so `docker-compose.yml` (PostgreSQL + pgvector + Redis + backend) was not executed locally. Run `docker compose up --build` in a Docker-enabled environment before production deployment.
4. **Production Auth Enforcement**: Set `AUTH_REQUIRED=true`, a strong `SECRET_KEY`, and `A2A_SHARED_SECRET` in `.env` before exposing the API to untrusted networks.
