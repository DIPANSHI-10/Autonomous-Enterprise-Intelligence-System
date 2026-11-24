"""Async in-process event bus for real-time Server-Sent Events (SSE) streaming."""

import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, AsyncGenerator


class EventBus:
    def __init__(self) -> None:
        self._subscribers: dict[str, list[asyncio.Queue[dict[str, Any]]]] = defaultdict(list)
        self._global_subscribers: list[asyncio.Queue[dict[str, Any]]] = []

    def subscribe(self, task_id: str | None = None) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=250)
        if task_id:
            self._subscribers[task_id].append(queue)
        else:
            self._global_subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]], task_id: str | None = None) -> None:
        if task_id and queue in self._subscribers[task_id]:
            self._subscribers[task_id].remove(queue)
        if queue in self._global_subscribers:
            self._global_subscribers.remove(queue)

    async def publish(self, event: dict[str, Any]) -> None:
        enriched = {
            **event,
            "timestamp": event.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        }
        task_id = enriched.get("task_id")
        targets = list(self._global_subscribers)
        if task_id and task_id in self._subscribers:
            targets.extend(self._subscribers[task_id])

        for queue in targets:
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            await queue.put(enriched)

    async def stream(self, task_id: str | None = None) -> AsyncGenerator[str, None]:
        queue = self.subscribe(task_id)
        try:
            yield f"data: {json.dumps({'event_type': 'connected', 'task_id': task_id})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(event, default=str)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            self.unsubscribe(queue, task_id)


event_bus = EventBus()
