"""Availability reply logic — port of messenger-availability.ts"""

from __future__ import annotations

import re
import unicodedata

from app.domain.formatters import camera_model_short_label
from app.domain.price_quote import is_price_quote_question, match_camera_in_text
from app.domain.pronouns import PronounChatTurn, resolve_messenger_pronouns
from app.domain.pricing import add_days_date_str, today_calendar_day_vn


def _normalize_avail(text: str) -> str:
    nfd = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def is_availability_question(text: str) -> bool:
    if is_price_quote_question(text):
        return False
    norm = _normalize_avail(text)
    return bool(
        re.search(r"con (may|lich|slot)", norm)
        or re.search(r"lich trong", norm)
        or re.search(r"trong khong", norm)
        or re.search(r"het lich", norm)
        or re.search(r"con cho thue", norm)
        or re.search(r"check lich", norm)
        or (
            re.search(r"\bcon\s+", norm)
            and (
                re.search(r"\bngay\s+(mai|hom nay)\b|\bmai\b|\bhom nay\b", norm)
                or re.search(r"\bkhong\b", norm)
            )
        )
    )


def parse_availability_date(text: str) -> dict | None:
    norm = _normalize_avail(text)
    today = today_calendar_day_vn()

    if re.search(r"\bngay mai\b|\bmai\b", norm) and not re.search(r"ngay mai nay", norm):
        d = add_days_date_str(today, 1)
        return {"start_date": d, "end_date": d, "label": "Ngày mai"}
    if re.search(r"\bhom nay\b", norm):
        return {"start_date": today, "end_date": today, "label": "Hôm nay"}
    return None


def build_book_url(frontend_url: str) -> str:
    return f"{frontend_url.rstrip('/')}/book"


def format_availability_reply(
    *,
    day_label: str,
    model_label: str | None,
    available: bool,
    book_url: str,
    pronouns: dict,
) -> str:
    shop = pronouns["shop"]
    customer = pronouns["customer"]
    link = build_book_url(book_url)

    if model_label:
        if available:
            return f"{model_label} {day_label} còn nhé ạ, {customer} lên {link} đặt lịch giúp {shop} nhé."
        return (
            f"{model_label} {day_label} hết lịch rồi ạ, {customer} thử ngày khác hoặc máy khác giúp {shop} nhé."
        )

    if available:
        return f"{day_label} {shop} còn máy ạ, {customer} lên {link} xem và đặt lịch giúp {shop} nhé."
    return f"{day_label} {shop} hết lịch rồi ạ, {customer} thử ngày khác giúp {shop} nhé."


def resolve_availability_reply_input(
    text: str,
    history: list[PronounChatTurn],
    cameras: list[dict],
    has_available_camera: bool,
    book_url: str,
) -> str | None:
    if not is_availability_question(text):
        return None
    date = parse_availability_date(text)
    if not date:
        return None

    pronouns = resolve_messenger_pronouns(text, history)
    camera = match_camera_in_text(text, cameras)
    model_label = (
        camera_model_short_label(camera["brand"], camera["name"]) if camera else None
    )

    return format_availability_reply(
        day_label=date["label"],
        model_label=model_label,
        available=has_available_camera,
        book_url=book_url,
        pronouns=pronouns,
    )
