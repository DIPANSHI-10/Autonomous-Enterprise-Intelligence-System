"""Advanced RAG pipeline: PDF/DOCX/TXT parsing, chunking, embeddings, hybrid retrieval, and reranking."""

import hashlib
import io
import math
import re
from typing import Any, Optional
import numpy as np
from pypdf import PdfReader
from docx import Document as DocxDocument
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import sanitize_untrusted_text
from app.models.domain import Document, DocumentChunk


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9]{2,}", text.lower())


def compute_local_embedding(text: str, dim: int = 128) -> list[float]:
    """Deterministic normalized hash-projection embedding (works offline and with pgvector/local)."""
    vec = np.zeros(dim, dtype=np.float32)
    tokens = _tokenize(text)
    if not tokens:
        return vec.tolist()
    for tok in tokens:
        digest = hashlib.sha256(tok.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "little") % dim
        sign = 1.0 if (digest[4] % 2 == 0) else -1.0
        vec[idx] += sign
    norm = float(np.linalg.norm(vec))
    if norm > 0:
        vec /= norm
    return vec.tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    denom = float(np.linalg.norm(va) * np.linalg.norm(vb))
    if denom == 0.0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def parse_document_bytes(filename: str, raw_bytes: bytes) -> str:
    """Extract clean text from PDF, DOCX, or TXT files."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(raw_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return sanitize_untrusted_text("\n\n".join(pages), max_length=250000)
    if lower.endswith(".docx"):
        doc = DocxDocument(io.BytesIO(raw_bytes))
        paras = [p.text for p in doc.paragraphs if p.text.strip()]
        return sanitize_untrusted_text("\n\n".join(paras), max_length=250000)
    # Default: TXT / MD / CSV / JSON
    text = raw_bytes.decode("utf-8", errors="replace")
    return sanitize_untrusted_text(text, max_length=250000)


def chunk_text(text: str, chunk_size: int = 750, overlap: int = 120) -> list[str]:
    """Split text into overlapping semantic chunks."""
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(clean):
        end = min(len(clean), start + chunk_size)
        chunks.append(clean[start:end].strip())
        if end >= len(clean):
            break
        start = max(0, end - overlap)
    return chunks


async def ingest_document(
    db: AsyncSession,
    filename: str,
    content_type: str,
    raw_bytes: bytes,
    collection: str = "default",
    project_id: Optional[str] = None,
) -> Document:
    """Parse, chunk, embed, and persist a document into the Knowledge Base."""
    text = parse_document_bytes(filename, raw_bytes)
    chunks = chunk_text(text)

    doc = Document(
        filename=filename,
        content_type=content_type,
        file_size_bytes=len(raw_bytes),
        collection=collection,
        project_id=project_id,
        chunk_count=len(chunks),
        status="indexed" if chunks else "empty",
        metadata_json={"char_count": len(text)},
    )
    db.add(doc)
    await db.flush()

    for idx, chunk_str in enumerate(chunks):
        emb = compute_local_embedding(chunk_str)
        db.add(
            DocumentChunk(
                document_id=doc.id,
                chunk_index=idx,
                content=chunk_str,
                embedding=emb,
                metadata_json={"filename": filename, "collection": collection, "chunk_index": idx},
            )
        )
    await db.commit()
    await db.refresh(doc)
    return doc


async def hybrid_search(
    db: AsyncSession,
    query: str,
    top_k: int = 5,
    collection: Optional[str] = None,
    document_ids: Optional[list[str]] = None,
) -> list[dict[str, Any]]:
    """Hybrid retrieval combining cosine vector similarity + BM25-style keyword overlap + reranking."""
    stmt = (
        select(DocumentChunk, Document)
        .join(Document, DocumentChunk.document_id == Document.id)
    )
    if collection:
        stmt = stmt.where(Document.collection == collection)
    if document_ids:
        stmt = stmt.where(Document.id.in_(document_ids))

    result = await db.execute(stmt)
    rows = result.all()
    if not rows:
        return []

    query_emb = compute_local_embedding(query)
    query_tokens = set(_tokenize(query))

    scored: list[dict[str, Any]] = []
    for chunk, doc in rows:
        vec_score = max(0.0, cosine_similarity(query_emb, chunk.embedding))
        chunk_tokens = set(_tokenize(chunk.content))
        if query_tokens and chunk_tokens:
            overlap = len(query_tokens & chunk_tokens)
            kw_score = overlap / math.sqrt(len(query_tokens) * len(chunk_tokens))
        else:
            kw_score = 0.0

        # Hybrid fusion + exact phrase boost reranking
        phrase_boost = 0.15 if query.lower() in chunk.content.lower() else 0.0
        final_score = round(0.60 * vec_score + 0.40 * kw_score + phrase_boost, 4)

        scored.append(
            {
                "chunk_id": chunk.id,
                "document_id": doc.id,
                "filename": doc.filename,
                "collection": doc.collection,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "semantic_score": round(vec_score, 4),
                "keyword_score": round(kw_score, 4),
                "relevance_score": final_score,
            }
        )

    scored.sort(key=lambda item: item["relevance_score"], reverse=True)
    return scored[:top_k]
