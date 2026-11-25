"""Three-layer persistent memory system with workspace/session isolation and retention policies."""

from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import MemoryRecord


async def store_memory(
    db: AsyncSession,
    layer: str,
    content: str,
    category: str = "general",
    source: str = "system",
    task_id: Optional[str] = None,
    project_id: Optional[str] = None,
    session_id: Optional[str] = None,
    relevance_score: float = 1.0,
    ttl_hours: Optional[int] = None,
    metadata_json: Optional[dict] = None,
) -> MemoryRecord:
    expires_at = None
    if ttl_hours is not None and ttl_hours > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
    elif layer == "short_term":
        # Default short-term conversation memory retention: 24 hours
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    record = MemoryRecord(
        layer=layer,
        category=category,
        content=content,
        source=source,
        task_id=task_id,
        project_id=project_id,
        session_id=session_id,
        relevance_score=relevance_score,
        expires_at=expires_at,
        metadata_json=metadata_json or {},
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def purge_expired_memories(db: AsyncSession) -> int:
    now = datetime.now(timezone.utc)
    res = await db.execute(
        delete(MemoryRecord).where(
            MemoryRecord.expires_at.is_not(None),
            MemoryRecord.expires_at < now,
        )
    )
    await db.commit()
    return int(res.rowcount or 0)


async def search_memories(
    db: AsyncSession,
    query: Optional[str] = None,
    layer: Optional[str] = None,
    project_id: Optional[str] = None,
    session_id: Optional[str] = None,
    limit: int = 50,
) -> list[MemoryRecord]:
    await purge_expired_memories(db)
    now = datetime.now(timezone.utc)
    stmt = (
        select(MemoryRecord)
        .where(or_(MemoryRecord.expires_at.is_(None), MemoryRecord.expires_at >= now))
        .order_by(MemoryRecord.created_at.desc())
    )
    if layer:
        stmt = stmt.where(MemoryRecord.layer == layer)
    if project_id:
        stmt = stmt.where(MemoryRecord.project_id == project_id)
    if session_id:
        stmt = stmt.where(MemoryRecord.session_id == session_id)
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
