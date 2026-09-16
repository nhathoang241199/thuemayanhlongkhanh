"""Formatters — port of messenger-formatters.ts"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlparse

from app.domain.pricing import (
    BookingSlot,
    add_days_date_str,
    discounted_rental_vnd,
    rental_amount_with_options_vnd,
    resolve_effective_discount_percent,
    today_calendar_day_vn,
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


def camera_with_effective_discount(
    camera: dict,
    promo: dict | None,
    day_count: int = 1,
) -> dict:
    """Apply shop-wide promotion over per-camera discount (same rules as booking)."""
    days = max(1, int(day_count or 1))
    start = today_calendar_day_vn()
    end = add_days_date_str(start, days - 1)
    effective = resolve_effective_discount_percent(
        int(camera.get("discount_percent") or 0),
        promo,
        start,
        end,
    )
    return {**camera, "discount_percent": effective}


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


_VN_TZ = timezone(timedelta(hours=7))


def today_vn() -> date:
    return datetime.now(_VN_TZ).date()


def _as_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return None


def _format_vn_date(value: date) -> str:
    return f"{value.day:02d}/{value.month:02d}/{value.year}"


def is_shop_promotion_visible(promo: dict, today: date | None = None) -> bool:
    """Match backend isShopPromotionVisible — % > 0 and not past endDate."""
    pct = int(promo.get("discount_percent") or 0)
    if pct <= 0:
        return False
    end = _as_date(promo.get("end_date"))
    if end is None:
        return True
    return (today or today_vn()) <= end


def format_shop_promotion_tool_result(promo: dict, today: date | None = None) -> str:
    """Text for the LLM tool — do not invent dates/% beyond DB."""
    pct = int(promo.get("discount_percent") or 0)
    start = _as_date(promo.get("start_date"))
    end = _as_date(promo.get("end_date"))
    if not is_shop_promotion_visible(promo, today):
        return (
            "Hiện shop không có chương trình giảm giá toàn shop đang áp dụng "
            f"(discountPercent={pct})."
        )
    if start and end:
        return (
            f"Shop đang giảm {pct}% toàn đơn thuê máy/lens "
            f"từ {_format_vn_date(start)} đến {_format_vn_date(end)}."
        )
    if end:
        return (
            f"Shop đang giảm {pct}% toàn đơn thuê máy/lens "
            f"đến hết {_format_vn_date(end)}."
        )
    if start:
        return (
            f"Shop đang giảm {pct}% toàn đơn thuê máy/lens "
            f"từ {_format_vn_date(start)} (không ghi ngày kết thúc)."
        )
    return f"Shop đang giảm {pct}% toàn đơn thuê máy/lens (không giới hạn ngày)."


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
