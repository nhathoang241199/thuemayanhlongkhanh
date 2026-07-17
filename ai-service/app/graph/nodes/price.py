"""Price question node — redirect to web, không báo giá trong chat."""

from __future__ import annotations

from app.domain.canned import price_check_web_reply
from app.graph.state import ChatState


async def price_node(state: ChatState) -> dict:
    history = state.get("history") or []
    reply = price_check_web_reply(
        state.get("frontend_url", ""),
        state["user_message"],
        history,
    )
    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "graph_trace": ["price_node"],
    }
