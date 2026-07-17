"""Canned reply nodes."""

from __future__ import annotations

from app.domain.canned import (
    booking_redirect_reply,
    delivery_arrangement_reply,
    detect_policy_canned,
    format_shop_address_reply,
    format_shop_phone_reply,
    greeting_reply,
    is_shop_address_question,
    is_shop_phone_question,
)
from app.db.repositories.cameras import get_shop_info
from app.db.pool import get_pool
from app.graph.state import ChatState


async def greeting_node(state: ChatState) -> dict:
    reply = greeting_reply(state["user_message"])
    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "graph_trace": ["greeting_node"],
    }


async def booking_node(state: ChatState) -> dict:
    reply = booking_redirect_reply(state.get("frontend_url", ""), state["user_message"])
    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "graph_trace": ["booking_node"],
    }


async def delivery_arrange_node(state: ChatState) -> dict:
    reply = delivery_arrangement_reply(
        state["user_message"],
        state.get("history") or [],
    )
    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "graph_trace": ["delivery_arrange_node"],
    }


async def policy_fees_node(state: ChatState) -> dict:
    reply = detect_policy_canned(state["user_message"]) or (
        "Em chưa rõ câu hỏi — anh/chị mô tả thêm giúp em nhé?"
    )
    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "graph_trace": ["policy_fees_node"],
    }


async def shop_contact_node(state: ChatState) -> dict:
    pool = await get_pool()
    info = await get_shop_info(pool)
    text = state["user_message"]
    reply = None
    if is_shop_address_question(text):
        reply = format_shop_address_reply(
            {"address": info["address"], "map_url": info["map_url"]}
        )
    if not reply and is_shop_phone_question(text):
        reply = format_shop_phone_reply({"phone": info["phone"]})
    if not reply:
        reply = format_shop_address_reply(
            {"address": info["address"], "map_url": info["map_url"]}
        ) or format_shop_phone_reply({"phone": info["phone"]})
    if not reply:
        reply = "Em nhờ admin gửi địa chỉ/số điện thoại giúp anh/chị nhé."
    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "graph_trace": ["shop_contact_node"],
    }
