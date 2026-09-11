"""Intent routing — conditional edges entry point."""

from __future__ import annotations

from app.domain.availability import is_availability_question
from app.domain.canned import (
    is_booking_done_acknowledgment,
    is_booking_redirect_question,
    is_camera_comparison_question,
    is_delivery_arrangement_request,
    is_greeting_only,
    is_shop_address_question,
    is_shop_phone_question,
    is_shop_promotion_question,
    detect_policy_canned,
)
from app.domain.price_quote import is_duration_follow_up, is_price_quote_question, parse_day_count
from app.graph.state import ChatState


async def route_node(state: ChatState) -> dict:
    history = state.get("history") or []
    intent = detect_intent(state["user_message"], history)
    return {
        "intent": intent,
        "graph_trace": ["route"],
    }


def detect_intent(text: str, history: list | None = None) -> str:
    if is_greeting_only(text):
        return "greeting"
    if is_booking_done_acknowledgment(text):
        return "booking_done"
    if is_booking_redirect_question(text):
        return "booking_redirect"
    if is_delivery_arrangement_request(text):
        return "delivery_arrange"
    if is_shop_promotion_question(text):
        return "shop_promotion"
    if detect_policy_canned(text):
        return "policy_fees"
    if is_shop_address_question(text) or is_shop_phone_question(text):
        return "address_or_phone"
    if is_price_quote_question(text):
        return "price"
    if parse_day_count(text) and is_duration_follow_up(text):
        return "price"
    if is_availability_question(text):
        return "availability"
    if is_camera_comparison_question(text):
        return "camera_compare"
    return "general"


def route_decision(state: ChatState) -> str:
    return state.get("intent") or "general"
