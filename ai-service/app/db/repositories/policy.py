"""Policy RAG retrieve — port of policy-rag-retrieve.service.ts"""

from __future__ import annotations

import asyncpg
import httpx

from app.config import get_settings

BOOKING_TERMS_SOURCE_ID = "booking-terms"


async def embed_query(text: str) -> list[float]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={"model": settings.openai_embedding_model, "input": text},
        )
        res.raise_for_status()
        data = res.json()
        return data["data"][0]["embedding"]


def embedding_to_sql(vector: list[float]) -> str:
    return "[" + ",".join(str(x) for x in vector) + "]"


async def search_policy(pool: asyncpg.Pool, query: str, top_k: int | None = None) -> list[dict]:
    settings = get_settings()
    if not settings.rag_enabled:
        return []

    trimmed = query.strip()
    if not trimmed:
        return []

    limit = top_k or settings.policy_rag_top_k
    vector = await embed_query(trimmed)
    embedding_sql = embedding_to_sql(vector)

    rows = await pool.fetch(
        '''
        SELECT section, content, (embedding <=> $1::vector) AS score
        FROM "PolicyChunk"
        WHERE "sourceId" = $2
        ORDER BY score ASC
        LIMIT $3
        ''',
        embedding_sql,
        BOOKING_TERMS_SOURCE_ID,
        limit,
    )
    return [
        {"section": r["section"], "content": r["content"], "score": float(r["score"])}
        for r in rows
    ]


def format_hits_for_tool(hits: list[dict]) -> str:
    if not hits:
        return "Không tìm thấy đoạn chính sách liên quan trong index RAG."
    lines = []
    for i, hit in enumerate(hits, 1):
        heading = f"[{hit['section']}] " if hit.get("section") else ""
        lines.append(f"{i}. {heading}{hit['content']}")
    return "\n".join(lines)
