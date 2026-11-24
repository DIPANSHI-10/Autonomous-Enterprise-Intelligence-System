"""Model Context Protocol (MCP) server & tool registry with safe validated execution."""

import time
from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import sanitize_untrusted_text
from app.models.domain import ToolExecution
from app.services.rag_service import hybrid_search


class MCPServerRegistry:
    """Manages MCP servers, tool permissions, and safe validated execution."""

    def __init__(self) -> None:
        self.servers: dict[str, dict[str, Any]] = {
            "mcp-research": {
                "id": "mcp-research",
                "name": "Enterprise Web Research MCP",
                "status": "connected",
                "transport": "stdio/sdk",
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
                "transport": "in-process/sdk",
                "permissions": ["read:documents", "read:vectors"],
                "tools": [
                    {
                        "name": "knowledge_base_retrieve",
                        "description": "Hybrid semantic + keyword retrieval from indexed enterprise documents.",
                        "parameters": {"query": "string", "top_k": "integer"},
                    }
                ],
            },
            "mcp-analytics": {
                "id": "mcp-analytics",
                "name": "Quantitative Analysis MCP",
                "status": "connected",
                "transport": "in-process/sdk",
                "permissions": ["compute:python_math"],
                "tools": [
                    {
                        "name": "compute_statistics",
                        "description": "Compute mean, median, std, min, max, and growth metrics over numeric arrays.",
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

        status_val = "success"
        err_msg = None
        result: dict[str, Any] = {}

        try:
            if tool_name == "knowledge_base_retrieve":
                query = sanitize_untrusted_text(str(arguments.get("query", "")), 500)
                top_k = min(10, max(1, int(arguments.get("top_k", 5))))
                hits = await hybrid_search(db, query=query, top_k=top_k)
                result = {"matches": hits, "count": len(hits)}
            elif tool_name == "compute_statistics":
                import numpy as np

                raw_vals = arguments.get("values", [])
                vals = [float(x) for x in raw_vals if isinstance(x, (int, float))]
                if not vals:
                    result = {"error": "No numeric values provided"}
                else:
                    arr = np.array(vals, dtype=float)
                    result = {
                        "label": str(arguments.get("label", "series")),
                        "count": len(vals),
                        "mean": round(float(np.mean(arr)), 4),
                        "median": round(float(np.median(arr)), 4),
                        "std_dev": round(float(np.std(arr)), 4),
                        "min": round(float(np.min(arr)), 4),
                        "max": round(float(np.max(arr)), 4),
                    }
            elif tool_name == "web_search":
                from app.agents.tools import perform_web_search

                q = sanitize_untrusted_text(str(arguments.get("query", "")), 400)
                max_r = min(10, max(1, int(arguments.get("max_results", 5))))
                hits = await perform_web_search(q, max_results=max_r)
                result = {"results": hits, "count": len(hits)}
            elif tool_name == "fetch_url_summary":
                from app.agents.tools import fetch_and_clean_url

                url = str(arguments.get("url", "")).strip()
                text = await fetch_and_clean_url(url)
                result = {"url": url, "excerpt": text[:1500]}
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
