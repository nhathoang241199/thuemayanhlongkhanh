"""Canned reply nodes."""

from __future__ import annotations

from app.domain.canned import (
    booking_done_reply,
    booking_redirect_reply,
    delivery_arrangement_reply,
    detect_policy_canned,
    format_camera_comparison_reply,
    format_shop_address_reply,
    format_shop_phone_reply,
    format_shop_promotion_customer_reply,
    greeting_reply,
    is_shop_address_question,
    is_shop_phone_question,
)
from app.domain.pronouns import resolve_messenger_pronouns
from app.db.repositories.cameras import get_shop_info, get_shop_promotion, list_public_cameras
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


async def booking_done_node(state: ChatState) -> dict:
    reply = booking_done_reply(state["user_message"], state.get("history") or [])
    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "graph_trace": ["booking_done_node"],
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
    history = state.get("history") or []
    reply = detect_policy_canned(state["user_message"], history) or (
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
    shop = resolve_messenger_pronouns(text, state.get("history") or [])["shop"]
    reply = None
    if is_shop_address_question(text):
        reply = format_shop_address_reply(
            {"address": info["address"], "map_url": info["map_url"]},
            shop,
        )
    if not reply and is_shop_phone_question(text):
        reply = format_shop_phone_reply({"phone": info["phone"]}, shop)
    if not reply:
        reply = format_shop_address_reply(
            {"address": info["address"], "map_url": info["map_url"]},
            shop,
        ) or format_shop_phone_reply({"phone": info["phone"]}, shop)
    if not reply:
        reply = "Em nhờ admin gửi địa chỉ/số điện thoại giúp anh/chị nhé."
    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "graph_trace": ["shop_contact_node"],
    }


async def shop_promotion_node(state: ChatState) -> dict:
    pool = await get_pool()
    promo = await get_shop_promotion(pool)
    reply = format_shop_promotion_customer_reply(
        promo,
        state["user_message"],
        state.get("history") or [],
    )
    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "intent": "shop_promotion",
        "graph_trace": ["shop_promotion_node"],
    }


async def comparison_node(state: ChatState) -> dict:
    pool = await get_pool()
    cameras = await list_public_cameras(pool)
    reply = format_camera_comparison_reply(
        state["user_message"],
        cameras,
        state.get("frontend_url", ""),
    )
    return {
        "reply": reply,
        "reply_raw": reply,
        "canned": True,
        "graph_trace": ["comparison_node"],
    }
