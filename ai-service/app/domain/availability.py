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
    """Parse relative/absolute dates into YYYY-MM-DD range (VN calendar)."""
    norm = _normalize_avail(text)
    today = today_calendar_day_vn()
    year, month, day = map(int, today.split("-"))

    if re.search(r"\bngay mai\b|\bmai\b", norm) and not re.search(
        r"ngay mai nay", norm
    ):
        d = add_days_date_str(today, 1)
        return {"start_date": d, "end_date": d, "label": "Ngày mai"}
    if re.search(r"\bhom nay\b", norm):
        return {"start_date": today, "end_date": today, "label": "Hôm nay"}

    # 15/9, 15-09, 15.9, 15/09/2026
    m = re.search(
        r"\b(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{2,4}))?\b",
        norm,
    )
    if m:
        dd, mm = int(m.group(1)), int(m.group(2))
        yy = year
        if m.group(3):
            raw_y = int(m.group(3))
            yy = raw_y if raw_y >= 100 else 2000 + raw_y
        if 1 <= mm <= 12 and 1 <= dd <= 31:
            try:
                d = f"{yy:04d}-{mm:02d}-{dd:02d}"
                # validate via datetime
                from datetime import datetime

                datetime(yy, mm, dd)
                return {
                    "start_date": d,
                    "end_date": d,
                    "label": f"ngày {dd}/{mm}",
                }
            except ValueError:
                pass

    # ngày 15 tháng 9
    m2 = re.search(r"ngay\s+(\d{1,2})\s+thang\s+(\d{1,2})", norm)
    if m2:
        dd, mm = int(m2.group(1)), int(m2.group(2))
        if 1 <= mm <= 12 and 1 <= dd <= 31:
            try:
                from datetime import datetime

                datetime(year, mm, dd)
                d = f"{year:04d}-{mm:02d}-{dd:02d}"
                return {
                    "start_date": d,
                    "end_date": d,
                    "label": f"ngày {dd}/{mm}",
                }
            except ValueError:
                pass

    # ngày 15 (tháng hiện tại; nếu đã qua thì tháng sau)
    m3 = re.search(r"\bngay\s+(\d{1,2})\b", norm)
    if m3 and not re.search(r"\bngay\s+(mai|hom nay)\b", norm):
        dd = int(m3.group(1))
        if 1 <= dd <= 31:
            from datetime import datetime

            mm, yy = month, year
            try:
                candidate = datetime(yy, mm, dd)
            except ValueError:
                candidate = None
            if candidate:
                today_dt = datetime(year, month, day)
                if candidate.date() < today_dt.date():
                    mm += 1
                    if mm > 12:
                        mm = 1
                        yy += 1
                    try:
                        candidate = datetime(yy, mm, dd)
                    except ValueError:
                        candidate = None
            if candidate:
                d = candidate.strftime("%Y-%m-%d")
                return {
                    "start_date": d,
                    "end_date": d,
                    "label": f"ngày {dd}/{candidate.month}",
                }

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
    _ = book_url  # kept for call-site compatibility; không ép lên web

    if model_label:
        if available:
            return f"{model_label} {day_label} còn nhé ạ."
        return (
            f"{model_label} {day_label} hết lịch rồi ạ, "
            f"{customer} thử ngày khác hoặc máy khác giúp {shop} nhé."
        )

    if available:
        return f"{day_label} {shop} còn máy ạ."
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
