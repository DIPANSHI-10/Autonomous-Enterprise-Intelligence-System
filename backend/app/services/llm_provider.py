"""Configurable multi-provider LLM abstraction with retries, structured outputs, and Langfuse tracing."""

import asyncio
import json
import re
from typing import Any, Optional, Type, TypeVar
from pydantic import BaseModel
from app.core.config import get_settings
from app.core.logging import logger

T = TypeVar("T", bound=BaseModel)


class LLMResponse(BaseModel):
    content: str
    provider: str
    model: str
    tokens_used: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    configured: bool = True
    is_fallback_mode: bool = False
    error_message: Optional[str] = None
    parsed_data: Optional[dict[str, Any]] = None


class LLMProviderService:
    """Unified interface over OpenAI, Google Gemini, and Anthropic with retries and observability."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._langfuse = None
        if self.settings.LANGFUSE_PUBLIC_KEY and self.settings.LANGFUSE_SECRET_KEY:
            try:
                from langfuse import Langfuse

                self._langfuse = Langfuse(
                    public_key=self.settings.LANGFUSE_PUBLIC_KEY,
                    secret_key=self.settings.LANGFUSE_SECRET_KEY,
                    host=self.settings.LANGFUSE_HOST,
                )
            except Exception as exc:
                logger.warning("Langfuse initialization skipped: %s", exc)

    def has_configured_provider(self) -> bool:
        return any(self.settings.configured_llm_providers.values())

    def _build_client(self, provider: str, model: str, timeout: int):
        p = provider.lower()
        if p == "openai" and self.settings.OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI

            return ChatOpenAI(
                model=model or "gpt-4o-mini",
                api_key=self.settings.OPENAI_API_KEY,
                temperature=0.2,
                timeout=timeout,
                max_retries=0,
            )
        if p in ("gemini", "google") and self.settings.GOOGLE_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI

            return ChatGoogleGenerativeAI(
                model=model or "gemini-2.0-flash",
                google_api_key=self.settings.GOOGLE_API_KEY,
                temperature=0.2,
                timeout=timeout,
            )
        if p == "anthropic" and self.settings.ANTHROPIC_API_KEY:
            from langchain_anthropic import ChatAnthropic

            return ChatAnthropic(
                model=model or "claude-3-5-sonnet-latest",
                api_key=self.settings.ANTHROPIC_API_KEY,
                temperature=0.2,
                timeout=timeout,
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

    @staticmethod
    def render_prompt(template: str, **variables: Any) -> str:
        """Safe prompt template rendering."""
        return template.format(**variables)

    def _trace_langfuse(
        self,
        trace_name: str,
        provider: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        output: str,
        tokens_used: int,
    ) -> None:
        if not self._langfuse:
            return
        try:
            trace = self._langfuse.trace(name=trace_name)
            trace.generation(
                name=f"{provider}:{model}",
                model=model,
                input={"system": system_prompt[:1000], "user": user_prompt[:2000]},
                output=output[:2000],
                usage={"total": tokens_used},
            )
        except Exception as exc:
            logger.debug("Langfuse trace failed: %s", exc)

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: int = 45,
        max_attempts: int = 2,
        trace_name: str = "aeis_llm_call",
    ) -> LLMResponse:
        target_provider = provider or self.settings.DEFAULT_LLM_PROVIDER
        target_model = model or self.settings.DEFAULT_LLM_MODEL

        if not self.has_configured_provider():
            msg = (
                "LLM provider credentials are not configured. Set OPENAI_API_KEY, "
                "GOOGLE_API_KEY, or ANTHROPIC_API_KEY in .env to enable generative synthesis."
            )
            return LLMResponse(
                content="",
                provider="unconfigured",
                model="none",
                tokens_used=0,
                configured=False,
                is_fallback_mode=True,
                error_message=msg,
            )

        candidates = [(target_provider, target_model)]
        for alt_p, alt_m in [
            ("openai", "gpt-4o-mini"),
            ("gemini", "gemini-2.0-flash"),
            ("anthropic", "claude-3-5-sonnet-latest"),
        ]:
            if alt_p != target_provider:
                candidates.append((alt_p, alt_m))

        last_err = ""
        for p, m in candidates:
            client = self._build_client(p, m, timeout=timeout_seconds)
            if client is None:
                continue
            for attempt in range(max_attempts):
                try:
                    from langchain_core.messages import HumanMessage, SystemMessage

                    msg = await asyncio.wait_for(
                        client.ainvoke(
                            [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
                        ),
                        timeout=timeout_seconds,
                    )
                    usage = getattr(msg, "usage_metadata", None) or {}
                    prompt_tok = int(usage.get("input_tokens", 0) or 0)
                    comp_tok = int(usage.get("output_tokens", 0) or 0)
                    total_tok = int(usage.get("total_tokens", 0) or (prompt_tok + comp_tok))
                    content = str(msg.content)
                    self._trace_langfuse(
                        trace_name, p, m, system_prompt, user_prompt, content, total_tok
                    )
                    return LLMResponse(
                        content=content,
                        provider=p,
                        model=m,
                        tokens_used=total_tok,
                        prompt_tokens=prompt_tok,
                        completion_tokens=comp_tok,
                        configured=True,
                        is_fallback_mode=False,
                    )
                except Exception as exc:
                    last_err = str(exc)
                    logger.warning(
                        "LLM provider %s (%s) attempt %d failed: %s", p, m, attempt + 1, exc
                    )
                    if attempt + 1 < max_attempts:
                        await asyncio.sleep(0.5 * (2**attempt))

        return LLMResponse(
            content="",
            provider=target_provider,
            model=target_model,
            tokens_used=0,
            configured=True,
            is_fallback_mode=True,
            error_message=f"All configured LLM providers failed: {last_err}",
        )

    async def generate_structured(
        self,
        schema: Type[T],
        system_prompt: str,
        user_prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
    ) -> tuple[Optional[T], LLMResponse]:
        """Request JSON conforming to a Pydantic schema and validate it."""
        schema_hint = json.dumps(schema.model_json_schema(), indent=2)
        augmented_system = (
            f"{system_prompt}\n\nReturn ONLY valid JSON matching this schema:\n{schema_hint}"
        )
        resp = await self.generate(
            system_prompt=augmented_system,
            user_prompt=user_prompt,
            provider=provider,
            model=model,
            trace_name=f"structured_{schema.__name__}",
        )
        if not resp.content:
            return None, resp

        raw = resp.content.strip()
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
        if match:
            raw = match.group(1).strip()
        try:
            parsed = schema.model_validate_json(raw)
            resp.parsed_data = parsed.model_dump()
            return parsed, resp
        except Exception as exc:
            logger.warning("Structured output validation failed for %s: %s", schema.__name__, exc)
            resp.error_message = f"Structured JSON validation error: {exc}"
            return None, resp


llm_service = LLMProviderService()
