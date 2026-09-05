"""Availability canned node."""

from __future__ import annotations

from app.config import get_settings
from app.db.pool import get_pool
from app.db.repositories import availability as avail_repo
from app.db.repositories.cameras import list_public_cameras
from app.domain.availability import parse_availability_date, resolve_availability_reply_input
from app.domain.formatters import parse_slot
from app.domain.price_quote import match_camera_in_text
from app.graph.state import ChatState

DEFAULT_SLOT = "FULL_DAY"


async def availability_node(state: ChatState) -> dict:
    pool = await get_pool()
    text = state["user_message"]
    history = state.get("history") or []
    frontend_url = state.get("frontend_url", "")

    date = parse_availability_date(text)
    if not date:
        return {"intent": "general", "graph_trace": ["availability_node_miss"]}

    cameras = await list_public_cameras(pool)
    camera = match_camera_in_text(text, cameras)
    slot = parse_slot(DEFAULT_SLOT)

    if camera:
        has_available = await avail_repo.has_any_available_camera(
            pool,
            date["start_date"],
            date["end_date"],
            slot,
            camera_id=camera["id"],
        )
    else:
        has_available = await avail_repo.has_any_available_camera(
            pool,
            date["start_date"],
            date["end_date"],
            slot,
        )

    reply = resolve_availability_reply_input(
        text, history, cameras, has_available, frontend_url
    )
    if not reply:
        return {"intent": "general", "graph_trace": ["availability_node_miss"]}

    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "graph_trace": ["availability_node"],
    }


def availability_decision(state: ChatState) -> str:
    if state.get("reply"):
        return "end"
    return "agent" if get_settings().llm_routing_enabled else "handoff"
