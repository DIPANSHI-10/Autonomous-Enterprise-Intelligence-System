"""Model Context Protocol (MCP) server & tool registry with Pydantic input validation."""

import time
from typing import Any, Optional
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import sanitize_untrusted_text
from app.models.domain import ToolExecution
from app.services.rag_service import hybrid_search


class WebSearchArgs(BaseModel):
    query: str = Field(min_length=1, max_length=400)
    max_results: int = Field(default=5, ge=1, le=10)


class FetchUrlArgs(BaseModel):
    url: str = Field(min_length=8, max_length=1000)


class KBRetrieveArgs(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    top_k: int = Field(default=5, ge=1, le=20)
    collection: Optional[str] = None


class ComputeStatsArgs(BaseModel):
    values: list[float] = Field(min_length=1, max_length=5000)
    label: str = Field(default="series", max_length=120)


TOOL_SCHEMAS = {
    "web_search": WebSearchArgs,
    "fetch_url_summary": FetchUrlArgs,
    "knowledge_base_retrieve": KBRetrieveArgs,
    "compute_statistics": ComputeStatsArgs,
}


class MCPServerRegistry:
    """Manages MCP servers, tool permissions, Pydantic validation, and safe execution."""

    def __init__(self) -> None:
        self.servers: dict[str, dict[str, Any]] = {
            "mcp-research": {
                "id": "mcp-research",
                "name": "Enterprise Web Research MCP",
                "status": "connected",
                "transport": "in-process/mcp-schema",
                "permissions": ["read:web", "read:public_docs"],
                "tools": [
                    {
                        "name": "web_search",
                        "description": "Search public web intelligence with sanitized outputs.",
                        "parameters": {"query": "string", "max_results": "integer"},
                    },
                    {
                        "name": "fetch_url_summary",
                        "description": "Fetch and sanitize public webpage text.",
                        "parameters": {"url": "string"},
                    },
                ],
            },
            "mcp-knowledge": {
                "id": "mcp-knowledge",
                "name": "Knowledge Base & RAG MCP",
                "status": "connected",
                "transport": "in-process/mcp-schema",
                "permissions": ["read:documents", "read:vectors"],
                "tools": [
                    {
                        "name": "knowledge_base_retrieve",
                        "description": "Hybrid semantic + BM25 retrieval from indexed enterprise documents.",
                        "parameters": {"query": "string", "top_k": "integer"},
                    }
                ],
            },
            "mcp-analytics": {
                "id": "mcp-analytics",
                "name": "Quantitative Analysis MCP",
                "status": "connected",
                "transport": "in-process/mcp-schema",
                "permissions": ["compute:python_math"],
                "tools": [
                    {
                        "name": "compute_statistics",
                        "description": "Compute mean, median, std, min, max over numeric arrays.",
                        "parameters": {"values": "array[number]", "label": "string"},
                    }
                ],
            },
        }

    def list_servers(self) -> list[dict[str, Any]]:
        return list(self.servers.values())

    async def invoke_tool(
        self,
        db: AsyncSession,
        server_id: str,
        tool_name: str,
        arguments: dict[str, Any],
        agent_id: str = "mcp-client",
        task_id: Optional[str] = None,
    ) -> dict[str, Any]:
        start = time.perf_counter()
        if server_id not in self.servers:
            raise ValueError(f"Unknown MCP server: {server_id}")

        server = self.servers[server_id]
        allowed_tools = {t["name"] for t in server["tools"]}
        if tool_name not in allowed_tools:
            raise PermissionError(f"Tool '{tool_name}' is not permitted on server '{server_id}'")

        schema_cls = TOOL_SCHEMAS.get(tool_name)
        if schema_cls:
            try:
                validated = schema_cls.model_validate(arguments)
            except ValidationError as exc:
                raise ValueError(f"Invalid arguments for '{tool_name}': {exc}") from exc
        else:
            validated = None

        status_val = "success"
        err_msg = None
        result: dict[str, Any] = {}

        try:
            if tool_name == "knowledge_base_retrieve" and isinstance(validated, KBRetrieveArgs):
                query = sanitize_untrusted_text(validated.query, 500)
                hits = await hybrid_search(
                    db, query=query, top_k=validated.top_k, collection=validated.collection
                )
                result = {"matches": hits, "count": len(hits)}
            elif tool_name == "compute_statistics" and isinstance(validated, ComputeStatsArgs):
                import numpy as np

                arr = np.array(validated.values, dtype=float)
                result = {
                    "label": validated.label,
                    "count": len(validated.values),
                    "mean": round(float(np.mean(arr)), 4),
                    "median": round(float(np.median(arr)), 4),
                    "std_dev": round(float(np.std(arr)), 4),
                    "min": round(float(np.min(arr)), 4),
                    "max": round(float(np.max(arr)), 4),
                }
            elif tool_name == "web_search" and isinstance(validated, WebSearchArgs):
                from app.agents.tools import perform_web_search

                q = sanitize_untrusted_text(validated.query, 400)
                hits = await perform_web_search(q, max_results=validated.max_results)
                result = {"results": hits, "count": len(hits)}
            elif tool_name == "fetch_url_summary" and isinstance(validated, FetchUrlArgs):
                from app.agents.tools import fetch_and_clean_url

                if not validated.url.startswith(("http://", "https://")):
                    raise ValueError("URL must start with http:// or https://")
                text = await fetch_and_clean_url(validated.url)
                result = {"url": validated.url, "excerpt": text[:1500]}
        except Exception as exc:
            status_val = "error"
            err_msg = str(exc)
            result = {"error": err_msg}

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        log = ToolExecution(
            task_id=task_id,
            agent_id=agent_id,
            tool_name=tool_name,
            mcp_server=server_id,
            arguments=arguments,
            result_summary=str(result)[:600],
            status=status_val,
            duration_ms=elapsed_ms,
            error_message=err_msg,
        )
        db.add(log)
        await db.commit()
        return {"status": status_val, "duration_ms": elapsed_ms, "result": result}

    async def get_history(self, db: AsyncSession, limit: int = 50) -> list[ToolExecution]:
        res = await db.execute(
            select(ToolExecution).order_by(ToolExecution.created_at.desc()).limit(limit)
        )
        return list(res.scalars().all())


mcp_registry = MCPServerRegistry()
