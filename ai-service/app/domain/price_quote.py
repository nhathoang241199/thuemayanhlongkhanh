"""Price quote logic — port of messenger-price-quote.ts"""

from __future__ import annotations

import re
import unicodedata

from app.domain.canned import is_how_to_rent_question, is_late_return_fee_question
from app.domain.formatters import (
    compute_camera_rental_total,
    format_price_quote_customer_reply,
)
from app.domain.pronouns import PronounChatTurn

PRICE_HINT = re.compile(
    r"giá|gia\b|bao nhiêu|bao nhieu|\bbn\b|mấy tiền|may tien|tiền thuê|tien thue|thuê bao|thue bao|đi bao|di bao"
)


def normalize_model_token(value: str) -> str:
    nfd = unicodedata.normalize("NFD", value.lower())
    stripped = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return re.sub(r"[\s-]+", "", stripped)


def normalize_text_for_model_match(value: str) -> str:
    nfd = unicodedata.normalize("NFD", value.lower())
    stripped = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", stripped).strip()


def text_contains_model(text: str, camera_name: str) -> bool:
    spaced = normalize_text_for_model_match(text)
    name_parts = [p for p in normalize_text_for_model_match(camera_name).split(" ") if p]
    if name_parts:
        body = r"\s+".join(re.escape(p) for p in name_parts)
        if re.search(rf"(?:^| ){body}(?: |$)", spaced):
            return True
        glued = "".join(name_parts)
        if re.search(rf"(?:^| ){re.escape(glued)}(?: |$)", spaced):
            return True

    text_glued = spaced.replace(" ", "")
    for token in _model_tokens_from_camera_name(camera_name):
        if _model_token_in_text(token, spaced, text_glued):
            return True
    return False


def _model_token_in_text(token: str, spaced: str, text_glued: str) -> bool:
    if re.search(rf"(?:^| ){re.escape(token)}(?: |$)", spaced):
        return True
    for match in re.finditer(re.escape(token), text_glued):
        start, end = match.start(), match.end()
        before_ok = start == 0 or not text_glued[start - 1].isalnum()
        after_ok = end == len(text_glued) or not text_glued[end].isalnum()
        if before_ok and after_ok:
            return True
    return False


def _model_tokens_from_camera_name(camera_name: str) -> list[str]:
    norm = normalize_text_for_model_match(camera_name)
    raw: list[str] = []
    for pattern in (
        r"\br\d+(?: ii)?\b",
        r"\bm\d+\b",
        r"\bxt\d+\b",
        r"\bxs\d+\b",
        r"\bx-t\d+\b",
        r"\bx100vi\b",
        r"\bpocket \d+\b",
    ):
        for match in re.finditer(pattern, norm):
            raw.append(normalize_model_token(match.group()))
    raw.append(normalize_model_token(camera_name))
    seen: set[str] = set()
    tokens: list[str] = []
    for token in sorted(raw, key=len, reverse=True):
        if len(token) < 2 or token in seen:
            continue
        seen.add(token)
        tokens.append(token)
    return tokens


def is_price_quote_question(text: str) -> bool:
    lower = text.lower().strip()
    if is_how_to_rent_question(text) or is_late_return_fee_question(text):
        return False
    return bool(PRICE_HINT.search(lower))


def is_likely_availability_question(text: str) -> bool:
    norm = _normalize_for_duration(text)
    return bool(
        re.search(r"con (may|slot|lich)\b", norm)
        or re.search(r"het (lich|may)\b", norm)
        or re.search(r"trong khong", norm)
        or re.search(r"check lich", norm)
    )


def is_duration_follow_up(text: str) -> bool:
    if not parse_day_count(text):
        return False
    if is_likely_availability_question(text):
        return False
    if is_price_quote_question(text):
        return False
    norm = _normalize_for_duration(text).strip()
    return bool(
        re.match(r"^(con|thue|muon|vay|the)\b", norm)
        or re.search(r"\bthi sao\b", norm)
        or len(norm) <= 35
    )


def _normalize_for_duration(text: str) -> str:
    nfd = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def parse_day_count(text: str) -> int | None:
    normalized = _normalize_for_duration(text)
    week = re.search(r"(\d+)\s*tuan", normalized)
    if week:
        w = int(week.group(1))
        return w * 7 if w >= 1 else None
    day = re.search(r"(?<![a-z])(\d+)\s*ngay", normalized)
    if not day:
        return None
    n = int(day.group(1))
    return n if n >= 1 else None


def match_camera_in_text(text: str, cameras: list[dict]) -> dict | None:
    sorted_cams = sorted(
        cameras,
        key=lambda c: len(normalize_model_token(c["name"])),
        reverse=True,
    )
    for camera in sorted_cams:
        if text_contains_model(text, camera["name"]):
            return camera
    return None


def build_price_quote_context(text: str, history: list[PronounChatTurn]) -> str:
    turns = [*history, {"role": "user", "content": text}][-8:]
    return " ".join(t["content"] for t in turns)


def resolve_price_quote_request(
    text: str,
    cameras: list[dict],
    history: list[PronounChatTurn] | None = None,
) -> tuple[dict, int] | None:
    history = history or []
    day_count = parse_day_count(text)
    camera_in_message = match_camera_in_text(text, cameras)

    if camera_in_message and (is_price_quote_question(text) or day_count):
        return camera_in_message, day_count or 1

    if day_count and not camera_in_message:
        context = build_price_quote_context(text, history)
        camera_from_context = match_camera_in_text(context, cameras)
        if camera_from_context and (
            is_price_quote_question(text) or is_duration_follow_up(text)
        ):
            return camera_from_context, day_count

    return None


def build_price_quote_from_camera(camera: dict, day_count: int) -> str:
    total = compute_camera_rental_total(camera, day_count)
    return format_price_quote_customer_reply(camera, day_count, total)
