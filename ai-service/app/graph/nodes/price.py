"""Price question node — quote from DB when camera/duration known."""

from __future__ import annotations

from app.config import get_settings
from app.db.pool import get_pool
from app.db.repositories import availability as avail_repo
from app.db.repositories.cameras import get_camera, get_shop_promotion, list_public_cameras
from app.domain.availability import parse_availability_date
from app.domain.formatters import (
    camera_model_short_label,
    camera_with_effective_discount,
    parse_slot,
)
from app.domain.price_quote import (
    build_price_quote_from_camera,
    is_price_quote_question,
    match_camera_in_text,
    parse_day_count,
    resolve_price_quote_request,
)
from app.domain.pronouns import resolve_messenger_pronouns
from app.graph.state import ChatState

DEFAULT_SLOT = "FULL_DAY"


async def price_node(state: ChatState) -> dict:
    pool = await get_pool()
    text = state["user_message"]
    history = state.get("history") or []
    cameras = await list_public_cameras(pool)
    pronouns = resolve_messenger_pronouns(text, history)
    customer = pronouns["customer"]

    resolved = resolve_price_quote_request(text, cameras, history)
    if resolved:
        matched, day_count = resolved
        # Re-fetch by id so dayPrice/discount always match latest DB.
        camera = await get_camera(pool, matched["id"]) or matched
        promo = await get_shop_promotion(pool)
        camera = camera_with_effective_discount(camera, promo, day_count)
        reply = build_price_quote_from_camera(camera, day_count)

        date = parse_availability_date(text)
        if date:
            ok = await avail_repo.has_any_available_camera(
                pool,
                date["start_date"],
                date["end_date"],
                parse_slot(DEFAULT_SLOT),
                camera_id=camera["id"],
            )
            label = camera_model_short_label(camera["brand"], camera["name"])
            avail_bit = (
                f"{label} {date['label']} còn nhé ạ."
                if ok
                else f"{label} {date['label']} hết lịch rồi ạ."
            )
            reply = f"{reply} {avail_bit}"

        return {
            "reply": reply,
            "reply_raw": reply,
            "canned": True,
            "graph_trace": ["price_node"],
        }

    camera = match_camera_in_text(
        " ".join([*(t.get("content", "") for t in history[-6:]), text]),
        cameras,
    )
    if camera and is_price_quote_question(text) and not parse_day_count(text):
        label = camera_model_short_label(camera["brand"], camera["name"])
        reply = f"{customer.capitalize()} thuê {label} mấy ngày ạ?"
        return {
            "reply": reply,
            "reply_raw": reply,
            "canned": True,
            "graph_trace": ["price_node_ask_days"],
        }

    if is_price_quote_question(text) and not camera:
        reply = f"{customer.capitalize()} muốn xem giá máy nào ạ?"
        return {
            "reply": reply,
            "reply_raw": reply,
            "canned": True,
            "graph_trace": ["price_node_ask_model"],
        }

    # Incomplete / ambiguous — let agent use tools
    return {
        "intent": "general",
        "graph_trace": ["price_node_miss"],
    }


def price_decision(state: ChatState) -> str:
    if state.get("reply"):
        return "end"
    return "agent" if get_settings().llm_routing_enabled else "handoff"
