"""Fallback when LLM is off — chuyển admin, không tự trả lời."""

from __future__ import annotations

from app.graph.state import ChatState

HANDOFF_REPLY = "Mình sẽ gửi lời nhắn đến Admin, bạn chờ chút nhé."


async def handoff_node(state: ChatState) -> dict:
    return {
        "reply": HANDOFF_REPLY,
        "reply_raw": HANDOFF_REPLY,
        "canned": True,
        "handoff": True,
        "intent": "handoff_admin",
        "graph_trace": ["handoff_node"],
    }
