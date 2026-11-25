"""Application configuration and environment validation."""

from functools import lru_cache
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Autonomous Enterprise Intelligence System"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = Field(default="dev-secret-key-change-in-production-32chars")

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./enterprise_intelligence.db"

    # Vector Store & RAG
    VECTOR_BACKEND: str = "local_hybrid"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 750
    CHUNK_OVERLAP: int = 120
    HYBRID_SEMANTIC_WEIGHT: float = 0.65
    HYBRID_BM25_WEIGHT: float = 0.35

    # Redis
    REDIS_URL: str = ""

    # LLM Providers
    DEFAULT_LLM_PROVIDER: str = "openai"
    DEFAULT_LLM_MODEL: str = "gpt-4o-mini"
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Research Tools
    TAVILY_API_KEY: str = ""
    SERPER_API_KEY: str = ""

    # Memory & Observability
    MEM0_API_KEY: str = ""
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    # Security & Limits
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    AUTH_REQUIRED: bool = False
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    A2A_SHARED_SECRET: str = ""
    MAX_UPLOAD_SIZE_MB: int = 20
    MAX_WORKFLOW_RETRIES: int = 2
    AGENT_EXECUTION_TIMEOUT_SECONDS: int = 120
    REQUIRE_APPROVAL_FOR_REPORTS: bool = False

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def configured_llm_providers(self) -> dict[str, bool]:
        return {
            "openai": bool(self.OPENAI_API_KEY.strip()),
            "gemini": bool(self.GOOGLE_API_KEY.strip()),
            "anthropic": bool(self.ANTHROPIC_API_KEY.strip()),
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
