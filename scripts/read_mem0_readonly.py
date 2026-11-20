"""Strictly read-only exporter for local Mem0 memories (Qdrant + SQLite fallback).

Acquires the exact same cooperative portalocker lock used by ~/.mem0/mem0_engine.py
to guarantee zero lock contention and zero mutation of vector or history stores.
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any


def read_from_qdrant(mem0_home: Path, collection: str, user_id: str) -> list[dict[str, Any]]:
    import portalocker
    from qdrant_client import QdrantClient

    qdrant_path = mem0_home / "qdrant"
    lock_path = mem0_home / "qdrant.access.lock"
    if not qdrant_path.exists():
        return []

    records: list[dict[str, Any]] = []
    with portalocker.Lock(str(lock_path), timeout=8):
        client = QdrantClient(path=str(qdrant_path))
        try:
            collections = [c.name for c in client.get_collections().collections]
            if collection not in collections:
                return []
            offset = None
            while True:
                points, offset = client.scroll(
                    collection_name=collection,
                    limit=256,
                    offset=offset,
                    with_payload=True,
                    with_vectors=False,
                )
                for pt in points:
                    payload = dict(pt.payload or {})
                    if user_id and payload.get("user_id") and payload.get("user_id") != user_id:
                        continue
                    text = str(payload.get("data") or payload.get("memory") or "").strip()
                    if not text:
                        continue
                    category = str(payload.get("category") or "general")
                    records.append(
                        {
                            "id": str(pt.id),
                            "memory": text,
                            "category": category,
                            "user_id": str(payload.get("user_id") or user_id),
                            "created_at": str(payload.get("created_at") or ""),
                            "updated_at": str(payload.get("updated_at") or payload.get("created_at") or ""),
                            "hash": str(payload.get("hash") or ""),
                        }
                    )
                if offset is None:
                    break
        finally:
            try:
                client.close()
            except Exception:
                pass
    return records


def read_from_sqlite_fallback(mem0_home: Path) -> list[dict[str, Any]]:
    history_db = mem0_home / "history.db"
    if not history_db.exists():
        return []
    uri = f"file:{history_db.as_posix()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=5)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT memory_id, new_memory, event, created_at, updated_at, is_deleted
            FROM history
            ORDER BY id ASC
            """
        )
        latest: dict[str, dict[str, Any]] = {}
        for memory_id, new_memory, event, created_at, updated_at, is_deleted in cur.fetchall():
            if is_deleted or str(event).upper() == "DELETE":
                latest.pop(str(memory_id), None)
            elif new_memory:
                latest[str(memory_id)] = {
                    "id": str(memory_id),
                    "memory": str(new_memory),
                    "category": "general",
                    "user_id": os.environ.get("MEM0_USER_ID", "default"),
                    "created_at": str(created_at or ""),
                    "updated_at": str(updated_at or created_at or ""),
                    "hash": "",
                }
        return list(latest.values())
    finally:
        conn.close()


def main() -> int:
    mem0_home = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / ".mem0"
    collection = sys.argv[2] if len(sys.argv) > 2 else "antigravity_memories"
    user_id = sys.argv[3] if len(sys.argv) > 3 else "default"

    source_mode = "qdrant"
    try:
        items = read_from_qdrant(mem0_home, collection, user_id)
    except Exception as exc:
        source_mode = f"sqlite_fallback ({type(exc).__name__})"
        items = read_from_sqlite_fallback(mem0_home)

    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps({"mode": source_mode, "count": len(items), "results": items}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
