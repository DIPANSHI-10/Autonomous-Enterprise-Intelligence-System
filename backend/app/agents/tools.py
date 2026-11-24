"""Specialized agent tools: web search, URL fetch, Pydantic extraction, Python analysis."""

import re
from typing import Any
from urllib.parse import quote_plus
import httpx
import numpy as np
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field
from app.core.config import get_settings
from app.core.security import sanitize_untrusted_text


class ExtractedEntity(BaseModel):
    name: str
    category: str = "AI Enterprise"
    products: list[str] = Field(default_factory=list)
    pricing_model: str = "Enterprise / Tiered"
    technologies: list[str] = Field(default_factory=list)
    market_positioning: str = ""
    sentiment_score: float = Field(default=0.75, ge=0.0, le=1.0)
    source_url: str = ""


async def perform_web_search(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """Search the web using Tavily if configured, otherwise DuckDuckGo HTML or structured fallback."""
    settings = get_settings()
    clean_q = sanitize_untrusted_text(query, max_length=300)

    if settings.TAVILY_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": settings.TAVILY_API_KEY,
                        "query": clean_q,
                        "max_results": max_results,
                        "include_answer": False,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return [
                        {
                            "title": sanitize_untrusted_text(r.get("title", ""), 200),
                            "url": r.get("url", ""),
                            "snippet": sanitize_untrusted_text(r.get("content", ""), 800),
                            "source": "tavily",
                        }
                        for r in data.get("results", [])[:max_results]
                    ]
        except Exception:
            pass

    # DuckDuckGo lightweight HTML search
    try:
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(clean_q)}"
        headers = {"User-Agent": "Mozilla/5.0 (compatible; AEIS-ResearchBot/1.0)"}
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                results: list[dict[str, Any]] = []
                for item in soup.select(".result")[:max_results]:
                    title_el = item.select_one(".result__a")
                    snip_el = item.select_one(".result__snippet")
                    if title_el:
                        results.append(
                            {
                                "title": sanitize_untrusted_text(title_el.get_text(" ", strip=True), 200),
                                "url": title_el.get("href", ""),
                                "snippet": sanitize_untrusted_text(
                                    snip_el.get_text(" ", strip=True) if snip_el else "", 600
                                ),
                                "source": "duckduckgo",
                            }
                        )
                if results:
                    return results
    except Exception:
        pass

    return []


async def fetch_and_clean_url(url: str) -> str:
    """Safely fetch a public HTTP/HTTPS URL and extract sanitized text."""
    if not url.startswith(("http://", "https://")):
        return ""
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "AEIS-ResearchBot/1.0"})
            if resp.status_code != 200:
                return ""
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "noscript"]):
                tag.decompose()
            text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
            return sanitize_untrusted_text(text, max_length=6000)
    except Exception:
        return ""


def run_quantitative_analysis(entities: list[dict[str, Any]]) -> dict[str, Any]:
    """Perform real Python/NumPy statistical calculations over extracted entities."""
    if not entities:
        return {
            "entity_count": 0,
            "avg_sentiment": 0.0,
            "median_sentiment": 0.0,
            "sentiment_std": 0.0,
            "top_technologies": [],
            "chart_datasets": [],
        }

    sentiments = np.array([float(e.get("sentiment_score", 0.7)) for e in entities], dtype=float)
    tech_counts: dict[str, int] = {}
    for e in entities:
        for tech in e.get("technologies", []):
            tech_counts[tech] = tech_counts.get(tech, 0) + 1

    sorted_tech = sorted(tech_counts.items(), key=lambda x: x[1], reverse=True)
    chart_data = [
        {
            "name": e.get("name", f"Entity {i+1}")[:24],
            "sentiment": round(float(e.get("sentiment_score", 0.7)) * 100, 1),
            "product_count": len(e.get("products", [])),
            "tech_count": len(e.get("technologies", [])),
        }
        for i, e in enumerate(entities)
    ]

    return {
        "entity_count": len(entities),
        "avg_sentiment": round(float(np.mean(sentiments)), 4),
        "median_sentiment": round(float(np.median(sentiments)), 4),
        "sentiment_std": round(float(np.std(sentiments)), 4),
        "min_sentiment": round(float(np.min(sentiments)), 4),
        "max_sentiment": round(float(np.max(sentiments)), 4),
        "top_technologies": [{"technology": k, "count": v} for k, v in sorted_tech[:8]],
        "chart_datasets": chart_data,
    }
