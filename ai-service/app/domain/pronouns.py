"""Messenger pronouns — port of messenger-pronouns.ts"""

from __future__ import annotations

import re
from typing import Literal, TypedDict


class MessengerPronouns(TypedDict):
    shop: Literal["em", "anh", "mình"]
    customer: Literal["anh", "em", "chị", "bạn"]


class PronounChatTurn(TypedDict):
    role: Literal["user", "assistant"]
    content: str


def customer_self_refers_as_em(text: str) -> bool:
    lower = text.lower().strip()
    return bool(
        re.match(r"^(em|e|cho em|cho e|em oi|e oi)\b", lower)
        or re.search(r"\b(em|e)\s+(xin|hoi|muon|dat|can|muon hoi)", lower)
        or re.search(r"cho\s+(em|e)\s+(xin|hoi|muon|dat|can)", lower)
        or re.search(r"\btai em\b|\btai e\b", lower)
        or re.search(r"\bem ko\b|\bem khong\b|\be ko\b|\be khong\b", lower)
    )


def customer_addresses_shop_as_anh(text: str) -> bool:
    lower = text.lower().strip()
    return bool(
        re.search(r"\banh\s*$", lower, re.I)
        or re.search(r"\banh\s*(oi|a|ah|ạ)\s*$", lower, re.I)
        or re.search(r"(cho|hoi|xin|muon).*\banh\b", lower)
    )


def customer_addresses_shop_as_anh_at_start(text: str) -> bool:
    """Khách gọi shop là anh ở đầu câu (anh còn, anh ơi, a ơi…) — không coi là khách xưng anh."""
    lower = text.lower().strip()
    return bool(re.match(r"^(anh|a)(\s+|$)", lower) or re.match(r"^a\s+oi\b", lower))


def customer_addresses_shop_as_chi(text: str) -> bool:
    lower = text.lower().strip()
    return bool(
        re.search(r"\bchi\s*$", lower, re.I)
        or re.search(r"\bchi\s*(oi|a|ah|ạ)\s*$", lower, re.I)
        or re.search(r"(cho|hoi|xin).*\bchi\b", lower)
    )


def customer_addresses_shop_as_chi_at_start(text: str) -> bool:
    lower = text.lower().strip()
    return bool(re.match(r"^chi(\s+|$)", lower))


def resolve_messenger_pronouns(
    text: str,
    history: list[PronounChatTurn] | None = None,
) -> MessengerPronouns:
    history = history or []
    user_texts = [m["content"] for m in history if m["role"] == "user"] + [text]
    latest = user_texts[-1] if user_texts else text

    if customer_self_refers_as_em(latest):
        return {"shop": "anh", "customer": "em"}
    if customer_addresses_shop_as_chi(latest):
        return {"shop": "em", "customer": "chị"}
    if customer_addresses_shop_as_anh(latest):
        return {"shop": "em", "customer": "anh"}
    if customer_addresses_shop_as_chi_at_start(latest):
        return {"shop": "em", "customer": "bạn"}
    if customer_addresses_shop_as_anh_at_start(latest):
        return {"shop": "em", "customer": "bạn"}

    for t in reversed(user_texts):
        if customer_self_refers_as_em(t):
            return {"shop": "anh", "customer": "em"}
        if customer_addresses_shop_as_chi(t):
            return {"shop": "em", "customer": "chị"}
        if customer_addresses_shop_as_anh(t):
            return {"shop": "em", "customer": "anh"}
        if customer_addresses_shop_as_chi_at_start(t):
            return {"shop": "em", "customer": "bạn"}
        if customer_addresses_shop_as_anh_at_start(t):
            return {"shop": "em", "customer": "bạn"}

    return {"shop": "mình", "customer": "bạn"}
