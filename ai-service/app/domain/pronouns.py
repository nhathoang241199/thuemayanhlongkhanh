"""Messenger pronouns — port of messenger-pronouns.ts"""

from __future__ import annotations

import re
import unicodedata
from typing import Literal, TypedDict


class MessengerPronouns(TypedDict):
    shop: Literal["em", "anh", "mình"]
    customer: Literal["anh", "em", "chị", "bạn"]


class PronounChatTurn(TypedDict):
    role: Literal["user", "assistant"]
    content: str


DEFAULT_PRONOUNS: MessengerPronouns = {"shop": "anh", "customer": "em"}


def _norm(text: str) -> str:
    nfd = unicodedata.normalize("NFD", text.lower().strip())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def customer_self_refers_as_em(text: str) -> bool:
    lower = text.lower().strip()
    return bool(
        re.match(r"^(em|e|cho em|cho e|em oi|e oi)\b", lower)
        or re.search(r"\b(em|e)\s+(xin|hoi|muon|dat|can|muon hoi)", lower)
        or re.search(r"cho\s+(em|e)\s+(xin|hoi|muon|dat|can)", lower)
        or re.search(r"\btai em\b|\btai e\b", lower)
        or re.search(r"\bem ko\b|\bem khong\b|\be ko\b|\be khong\b", lower)
    )


def customer_self_refers_as_anh(text: str) -> bool:
    """Khách tự xưng anh (anh muốn, anh cần thuê…)."""
    lower = _norm(text)
    return bool(
        re.match(
            r"^(anh|a)\s+(muon|can|xin|dat|thue|hoi|cho|dang|dinh)\b",
            lower,
        )
    )


def customer_addresses_shop_as_chi(text: str) -> bool:
    lower = _norm(text)
    return bool(
        re.search(r"\bchi\s*$", lower)
        or re.search(r"\bchi\s*(oi|a|ah|a)\s*$", lower)
        or re.search(r"(cho|hoi|xin).*\bchi\b", lower)
        or re.match(r"^chi(\s+|$)", lower)
    )


def resolve_messenger_pronouns(
    text: str,
    history: list[PronounChatTurn] | None = None,
) -> MessengerPronouns:
    history = history or []
    user_texts = [m["content"] for m in history if m["role"] == "user"] + [text]

    for t in reversed(user_texts):
        if customer_self_refers_as_em(t):
            return {"shop": "anh", "customer": "em"}
        if customer_self_refers_as_anh(t):
            return {"shop": "em", "customer": "anh"}
        if customer_addresses_shop_as_chi(t):
            return {"shop": "em", "customer": "chị"}

    return DEFAULT_PRONOUNS
