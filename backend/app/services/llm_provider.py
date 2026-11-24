"""Configurable multi-provider LLM abstraction with fallback handling."""

import json
from typing import Any, Optional
from pydantic import BaseModel
from app.core.config import get_settings
from app.core.logging import logger


class LLMResponse(BaseModel):
    content: str
    provider: str
    model: str
    tokens_used: int = 0
    is_fallback_mode: bool = False


class LLMProviderService:
    """Unified interface over OpenAI, Google Gemini, and Anthropic with graceful fallback."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def _build_client(self, provider: str, model: str):
        p = provider.lower()
        if p == "openai" and self.settings.OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI

            return ChatOpenAI(
                model=model or "gpt-4o-mini",
                api_key=self.settings.OPENAI_API_KEY,
                temperature=0.2,
                timeout=45,
            )
        if p in ("gemini", "google") and self.settings.GOOGLE_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI

            return ChatGoogleGenerativeAI(
                model=model or "gemini-2.0-flash",
                google_api_key=self.settings.GOOGLE_API_KEY,
                temperature=0.2,
            )
        if p == "anthropic" and self.settings.ANTHROPIC_API_KEY:
            from langchain_anthropic import ChatAnthropic

            return ChatAnthropic(
                model=model or "claude-3-5-sonnet-latest",
                api_key=self.settings.ANTHROPIC_API_KEY,
                temperature=0.2,
            )
        return None

    def get_available_providers(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "openai",
                "name": "OpenAI",
                "configured": bool(self.settings.OPENAI_API_KEY),
                "models": ["gpt-4o-mini", "gpt-4o", "o3-mini"],
            },
            {
                "id": "gemini",
                "name": "Google Gemini",
                "configured": bool(self.settings.GOOGLE_API_KEY),
                "models": ["gemini-2.0-flash", "gemini-2.5-pro"],
            },
            {
                "id": "anthropic",
                "name": "Anthropic",
                "configured": bool(self.settings.ANTHROPIC_API_KEY),
                "models": ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
            },
        ]

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        fallback_data: Optional[dict[str, Any]] = None,
    ) -> LLMResponse:
        target_provider = provider or self.settings.DEFAULT_LLM_PROVIDER
        target_model = model or self.settings.DEFAULT_LLM_MODEL

        # Try primary, then configured fallbacks
        candidates = [(target_provider, target_model)]
        for alt_p, alt_m in [
            ("openai", "gpt-4o-mini"),
            ("gemini", "gemini-2.0-flash"),
            ("anthropic", "claude-3-5-sonnet-latest"),
        ]:
            if alt_p != target_provider:
                candidates.append((alt_p, alt_m))

        for p, m in candidates:
            client = self._build_client(p, m)
            if client is None:
                continue
            try:
                from langchain_core.messages import HumanMessage, SystemMessage

                msg = await client.ainvoke(
                    [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
                )
                usage = getattr(msg, "usage_metadata", None) or {}
                tokens = int(usage.get("total_tokens", 0) or (len(str(msg.content)) // 4))
                return LLMResponse(
                    content=str(msg.content),
                    provider=p,
                    model=m,
                    tokens_used=tokens,
                    is_fallback_mode=False,
                )
            except Exception as exc:
                logger.warning("LLM provider %s (%s) failed: %s", p, m, exc)

        # Deterministic structured fallback when no live LLM key is configured
        content = (
            json.dumps(fallback_data, indent=2)
            if fallback_data is not None
            else f"[Structured Synthesis Mode - No Live LLM Key Configured]\n{user_prompt[:600]}"
        )
        return LLMResponse(
            content=content,
            provider="deterministic-engine",
            model="local-structured-v1",
            tokens_used=max(64, len(content) // 4),
            is_fallback_mode=True,
        )


llm_service = LLMProviderService()
