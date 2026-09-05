"""Formatters — port of messenger-formatters.ts"""

from __future__ import annotations

import re
from urllib.parse import urlparse

from app.domain.pricing import (
    BookingSlot,
    discounted_rental_vnd,
    rental_amount_with_options_vnd,
)


def format_vnd(amount: int) -> str:
    return f"{amount:,}".replace(",", ".") + "đ"


def format_vnd_short(amount: int) -> str:
    if amount >= 1_000_000:
        tr = amount / 1_000_000
        if tr == int(tr):
            return f"{int(tr)}tr"
        s = f"{tr:.1f}".rstrip("0").rstrip(".")
        return f"{s}tr"
    return f"{round(amount / 1000)}k"


def camera_model_short_label(_brand: str, name: str) -> str:
    s = re.sub(r"\s+", " ", name.strip())

    pocket = re.match(r"^pocket\s*(\d+)$", s, re.I)
    if pocket:
        return f"Pocket {pocket.group(1)}"

    canon = re.match(r"^([rm])(\d+)(?:\s+ii)?$", s, re.I)
    if canon:
        suffix = " II" if re.search(r"\s+ii$", s, re.I) else ""
        return f"{canon.group(1).upper()}{canon.group(2)}{suffix}"

    xt = re.match(r"^xt(\d+)$", s, re.I)
    if xt:
        return f"XT{xt.group(1)}"

    xs = re.match(r"^xs(\d+)$", s, re.I)
    if xs:
        return f"XS{xs.group(1)}"

    xt_dash = re.match(r"^x-t(\d+)$", s, re.I)
    if xt_dash:
        return f"X-T{xt_dash.group(1)}"

    if re.match(r"^x100vi$", s, re.I):
        return "X100VI"

    return " ".join(w.capitalize() for w in s.split(" "))


def format_camera_price_template(
    brand: str, name: str, day_count: int, total_vnd: int
) -> str:
    label = camera_model_short_label(brand, name)
    return f"Mẫu trả lời: {label} {day_count} ngày {format_vnd_short(total_vnd)} nhé ạ."


def format_camera_list(cameras: list[dict], one_day_price_template: bool = False) -> str:
    if not cameras:
        return "Hiện không có máy nào trong danh sách."
    lines: list[str] = []
    for c in cameras:
        discount = f" (giảm {c['discount_percent']}%)" if c.get("discount_percent", 0) > 0 else ""
        avail = ""
        if "available" in c:
            avail = " — còn trống" if c["available"] else " — hết lịch"
        line = (
            f"- {c['brand']} {c['name']} (id: {c['id']}): "
            f"ngày {format_vnd(c['day_price'])}, buổi {format_vnd(c['shift_price'])}"
            f"{discount}{avail}"
        )
        if one_day_price_template:
            one_day = round(c["day_price"] * (1 - max(0, c.get("discount_percent", 0)) / 100))
            line += f"\n  {format_camera_price_template(c['brand'], c['name'], 1, one_day)}"
        lines.append(line)
    return "\n".join(lines)


def format_lens_list(lenses: list[dict]) -> str:
    if not lenses:
        return "Không có lens phù hợp cho máy này."
    lines = []
    for l in lenses:
        disc = f" (giảm {l['discount_percent']}%)" if l.get("discount_percent", 0) > 0 else ""
        lines.append(
            f"- {l['name']} (id: {l['id']}): ngày {format_vnd(l['day_price'])}, "
            f"buổi {format_vnd(l['shift_price'])}{disc}"
        )
    return "\n".join(lines)


def parse_brand(value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    upper = value.strip().upper()
    if upper in ("FUJIFILM", "CANON", "DJI"):
        return upper
    return None


def parse_slot(value: str | None) -> BookingSlot:
    slot = (value or "").strip().upper()
    if slot in ("FULL_DAY", "MORNING", "AFTERNOON", "EVENING"):
        return slot  # type: ignore[return-value]
    return "FULL_DAY"


def compute_camera_rental_total(camera: dict, day_count: int, slot: BookingSlot = "FULL_DAY") -> int:
    rental = rental_amount_with_options_vnd(
        day_count,
        camera["day_price"],
        camera["shift_price"],
        slot,
    )
    return discounted_rental_vnd(rental, camera.get("discount_percent", 0))


def format_price_quote_customer_reply(camera: dict, day_count: int, total_vnd: int) -> str:
    label = camera_model_short_label(camera["brand"], camera["name"])
    return f"{label} {day_count} ngày {format_vnd_short(total_vnd)} nhé ạ."


def _is_localhost_url(url: str) -> bool:
    host = urlparse(url.strip()).netloc.lower()
    return not host or host.startswith("localhost") or host.startswith("127.0.0.1")


def resolve_public_frontend_url(context_url: str | None, default_url: str) -> str:
    """Prefer public URL — ignore localhost from caller when default is production."""
    ctx = (context_url or "").strip().rstrip("/")
    default = (default_url or "").strip().rstrip("/")
    if ctx and not _is_localhost_url(ctx):
        return ctx
    if default and not _is_localhost_url(default):
        return default
    return ctx or default


def public_book_url(frontend_url: str) -> str:
    base = frontend_url.rstrip("/")
    return f"{base}/book" if base else "/book"


_MD_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
_MD_ITALIC_RE = re.compile(r"(?<!\*)\*([^*\n]+?)\*(?!\*)")
_MD_CODE_RE = re.compile(r"`([^`]+)`")


def format_messenger_reply(text: str) -> str:
    """Plain text for Messenger — strip Markdown the model sometimes emits."""
    t = text.strip()
    if not t:
        return t
    for _ in range(3):
        t = _MD_BOLD_RE.sub(r"\1", t)
    t = _MD_ITALIC_RE.sub(r"\1", t)
    t = _MD_CODE_RE.sub(r"\1", t)
    return re.sub(r"[ \t]+", " ", t).strip()
