"""Three-layer persistent memory system (Short-term, Long-term, Episodic) with optional Mem0."""

from typing import Optional
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import MemoryRecord


async def store_memory(
    db: AsyncSession,
    layer: str,
    content: str,
    category: str = "general",
    source: str = "system",
    task_id: Optional[str] = None,
    relevance_score: float = 1.0,
    metadata_json: Optional[dict] = None,
) -> MemoryRecord:
    record = MemoryRecord(
        layer=layer,
        category=category,
        content=content,
        source=source,
        task_id=task_id,
        relevance_score=relevance_score,
        metadata_json=metadata_json or {},
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def search_memories(
    db: AsyncSession,
    query: Optional[str] = None,
    layer: Optional[str] = None,
    limit: int = 50,
) -> list[MemoryRecord]:
    stmt = select(MemoryRecord).order_by(MemoryRecord.created_at.desc())
    if layer:
        stmt = stmt.where(MemoryRecord.layer == layer)
    if query:
        stmt = stmt.where(MemoryRecord.content.ilike(f"%{query}%"))
    stmt = stmt.limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def delete_memory(db: AsyncSession, memory_id: str) -> bool:
    res = await db.execute(delete(MemoryRecord).where(MemoryRecord.id == memory_id))
    await db.commit()
    return (res.rowcount or 0) > 0


async def clear_task_memory(db: AsyncSession, task_id: str) -> int:
    res = await db.execute(delete(MemoryRecord).where(MemoryRecord.task_id == task_id))
    await db.commit()
    return int(res.rowcount or 0)
