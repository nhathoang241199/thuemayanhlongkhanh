"""Canned reply detection — port of messenger-canned-replies.ts + shop-address.ts"""

from __future__ import annotations

import re
import unicodedata
from urllib.parse import urlparse

from app.domain.pronouns import resolve_messenger_pronouns

HOW_TO_RENT_PHRASES = [
    "cách thuê",
    "cach thue",
    "làm sao để thuê",
    "lam sao de thue",
    "làm sao thuê",
    "lam sao thue",
    "hướng dẫn thuê",
    "huong dan thue",
    "quy trình thuê",
    "quy trinh thue",
    "thuê máy ảnh như thế nào",
    "thue may anh nhu the nao",
    "cách đặt lịch",
    "cach dat lich",
]

ACCESSORY_REQUEST_HINT = re.compile(
    r"thêm|them|xin|cho|mượn|muon|được không|duoc khong|có được|co duoc|thêm được|them duoc"
)


def _normalize_booking(text: str) -> str:
    nfd = unicodedata.normalize("NFD", text.lower())
    base = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return base.replace("đ", "d")


def is_greeting_only(text: str) -> bool:
    t = text.strip()
    if not t or len(t) > 45:
        return False
    lower = t.lower()
    if re.search(
        r"giá|gia\b|bao nhiêu|may|máy|còn|con may|thuê|thue|pin|địa chỉ|dia chi|ship|đặt|dat|book",
        lower,
    ):
        return False
    return bool(
        re.match(
            r"^(hi|hello|hey|chào|chao|xin chào|xin chao|alo)(\s+(anh|chi|em|a|ah|ạ|shop|ơi|oi))*\s*$",
            t,
            re.I,
        )
    )


def greeting_reply(text: str) -> str:
    customer = resolve_messenger_pronouns(text)["customer"]
    return f"Hi! {customer} cần gì ạ"


def is_how_to_rent_question(text: str) -> bool:
    lower = text.lower().strip()
    return any(p in lower for p in HOW_TO_RENT_PHRASES)


def is_booking_redirect_question(text: str) -> bool:
    if is_how_to_rent_question(text):
        return True
    norm = _normalize_booking(text)
    if re.search(r"con (may|lich)|lich trong|trong khong", norm) and not re.search(
        r"dat lich|dat may|muon dat|book", norm
    ):
        return False
    return bool(
        re.search(
            r"dat lich|dat may|muon dat|muon book|/book\b|\bbook\b|link dat|kiem tra.*dat|dat tren (web|trang)",
            norm,
        )
        or re.search(r"đặt lịch|đặt máy", text.lower())
    )


def booking_redirect_reply(site_url: str, text: str) -> str:
    from app.domain.formatters import public_book_url

    p = resolve_messenger_pronouns(text)
    link = public_book_url(site_url)
    return (
        f"{p['customer'].capitalize()} lên {link} kiểm tra lịch trống "
        f"và đặt lịch giúp {p['shop']} nhé."
    )


def is_shop_promotion_question(text: str) -> bool:
    """Khách hỏi chương trình KM / giảm giá shop — không phải hỏi giá một máy."""
    norm = _normalize_booking(text)
    if not norm.strip():
        return False
    return bool(
        re.search(
            r"khuyen\s*mai|uu\s*dai|"
            r"chuong\s*trinh.*(giam|sale|km|uu\s*dai)|"
            r"co\s+(chuong\s*trinh\s+)?(giam\s*gia|khuyen\s*mai|uu\s*dai|sale)|"
            r"dang\s+(giam\s*gia|khuyen\s*mai|sale)|"
            r"giam\s*gia\s*(gi|j|gi\s*do|khong|ko|k\b|toan|shop|may)|"
            r"\bsale\b|"
            r"promo(tion)?",
            norm,
        )
    )


def format_shop_promotion_customer_reply(
    promo: dict,
    text: str,
    history: list | None = None,
) -> str:
    """Short Messenger reply for shop-wide promotion questions."""
    from app.domain.formatters import (
        _as_date,
        _format_vn_date,
        is_shop_promotion_visible,
    )

    if not is_shop_promotion_visible(promo):
        return "Hiện shop chưa có chương trình giảm giá toàn shop ạ."
    pct = int(promo.get("discount_percent") or 0)
    start = _as_date(promo.get("start_date"))
    end = _as_date(promo.get("end_date"))
    if start and end:
        return (
            f"Hiện shop đang giảm {pct}% từ {_format_vn_date(start)} "
            f"đến {_format_vn_date(end)} ạ."
        )
    if end:
        return f"Hiện shop đang giảm {pct}% đến hết {_format_vn_date(end)} ạ."
    if start:
        return f"Hiện shop đang giảm {pct}% từ {_format_vn_date(start)} ạ."
    return f"Hiện shop đang giảm {pct}% toàn đơn thuê ạ."


def is_booking_done_acknowledgment(text: str) -> bool:
    """Khách báo đã đặt lịch xong — trả lời canned, tránh agent bịa quy trình."""
    t = text.strip()
    if not t or len(t) > 100:
        return False
    lower = t.lower()
    norm = _normalize_booking(t)
    if re.search(r"chua\s|muon\s|cho\s+hoi|co\s+the\s+dat|lam\s+sao", norm):
        return False
    return bool(
        re.search(
            r"(dat|book)(\s+(lich|may))?\s+(roi|r\s*oi|xong|ok|oke|o\s*k)\b|"
            r"\bda\s+(dat|book)\b|"
            r"dat\s+xong|book\s+xong|order\s+xong",
            norm,
        )
        or re.search(
            r"đặt\s+(rồi|xong|ok)|book\s+(rồi|xong)|đặt lịch rồi|em đặt rồi|anh đặt rồi",
            lower,
        )
    )


def booking_done_reply(text: str, history: list | None = None) -> str:
    p = resolve_messenger_pronouns(text, history or [])
    return f"Oke, {p['shop']} thấy rồi nha"


def price_check_web_reply(site_url: str, text: str, history: list | None = None) -> str:
    """Khách hỏi giá — nhắc khách tự lên web xem giá, không báo số tiền trong chat."""
    from app.domain.formatters import public_book_url

    pronouns = resolve_messenger_pronouns(text, history or [])
    shop = pronouns["shop"]
    customer = pronouns["customer"]
    link = public_book_url(site_url)
    return f"{customer.capitalize()} lên {link} xem giá và đặt lịch giúp {shop} nhé."


def is_extra_accessory_request(text: str) -> bool:
    lower = text.lower().strip()
    if not ACCESSORY_REQUEST_HINT.search(lower):
        return False
    wants_pin = bool(re.search(r"\bpin\b", lower))
    wants_card = bool(re.search(r"thẻ nhớ|the nho|\bthẻ\b", lower))
    return wants_pin or wants_card


def is_color_grading_request(text: str) -> bool:
    lower = text.lower().strip()
    return "chỉnh màu" in lower or "chinh mau" in lower


def is_deposit_received_question(text: str) -> bool:
    """Khách hỏi shop đã nhận cọc/chuyển khoản chưa (thường sau khi đặt)."""
    lower = text.lower().strip()
    norm = _normalize_booking(lower)
    combined = lower + " " + norm
    return bool(
        re.search(
            r"(nhận|nhan|nhan duoc|nhận được|nhan dc|nhận dc|check|xác nhận|xac nhan)"
            r".*(coc|cọc|chuyển|chuyen|tiền|tien|ck\b)",
            combined,
        )
        or re.search(
            r"(coc|cọc|chuyển|chuyen|tiền|tien).*(chưa|chua|chưa nhận|chua nhan|"
            r"nhận chưa|nhan chua|được chưa|duoc chua|nhận được|nhan duoc)",
            combined,
        )
        or re.search(r"(có|co)\s+(nhận|nhan)\s+(coc|cọc)", combined)
        or re.search(r"(nhận|nhan)\s+(coc|cọc)\s+(chưa|chua|rồi|roi)", combined)
    )


def deposit_received_reply(text: str, history: list | None = None) -> str:
    p = resolve_messenger_pronouns(text, history or [])
    return f"{p['shop'].capitalize()} nhận được rồi nha"


def is_deposit_question(text: str) -> bool:
    if is_deposit_received_question(text):
        return False
    lower = text.lower().strip()
    norm = _normalize_booking(lower)
    if _asks_rental_price(text):
        return False
    return bool(
        re.search(r"\bcoc\b|cọc|cccd|vnid", lower)
        or re.search(r"\bcoc\b|cccd|vnid", norm)
        or re.search(r"giấy tờ|giay to|cần cọc|can coc|cần mang gì|can mang gi", lower)
    )


def deposit_reply(text: str, history: list | None = None) -> str:
    p = resolve_messenger_pronouns(text, history or [])
    return f"Bên {p['shop']} chỉ xin chụp CCCD hoặc VNID gốc thôi nhé."


def early_pickup_reply(text: str, history: list | None = None) -> str:
    p = resolve_messenger_pronouns(text, history or [])
    return f"Được {p['customer']} nha"


def late_morning_return_reply(text: str, history: list | None = None) -> str:
    p = resolve_messenger_pronouns(text, history or [])
    return (
        f"Được ạ, thuê theo ngày {p['shop']} có thể cho {p['customer']} "
        f"trả trễ đến sáng hôm sau khi đã thỏa thuận nhé."
    )


def delivery_pickup_reply(text: str, history: list | None = None) -> str:
    p = resolve_messenger_pronouns(text, history or [])
    return (
        f"Đa phần khách tự tới lấy và trả ạ, {p['shop']} vẫn có thể giao một số trường hợp "
        f"khu vực Long Khánh — {p['customer']} nhắn {p['shop']} trước nhé."
    )


def is_early_pickup_question(text: str) -> bool:
    lower = text.lower().strip()
    norm = _normalize_booking(lower)
    combined = lower + " " + norm
    asks_pickup = bool(
        re.search(r"(lấy|lay|nhận|nhan).*(máy|may)", combined)
        or re.search(r"(máy|may).*(lấy|lay|nhận|nhan)", combined)
        or re.search(r"\b(lấy|lay|nhận|nhan)\b", combined)
    )
    early_timing = bool(
        re.search(
            r"tối hôm trước|toi hom truoc|tối hôm trc|toi hom trc|hôm trc|hom trc|"
            r"hôm trước.*(lấy|lay|nhận|nhan)|(lấy|lay|nhận|nhan).*hôm trước|"
            r"hom truoc.*(lay|nhan)|(lay|nhan).*hom truoc|lấy sớm|lay som|nhận sớm|nhan som|"
            r"tối thứ|toi thu|lấy.*tối|lay.*toi",
            combined,
        )
    )
    return asks_pickup and early_timing


def is_late_morning_return_question(text: str) -> bool:
    lower = text.lower().strip()
    asks_late = bool(
        re.search(r"trả trễ|tra tre|trả muộn|tra muon", lower)
        or (re.search(r"\b(trả|tra)\b", lower) and re.search(r"(máy|may)", lower))
    )
    morning = bool(
        re.search(
            r"(sáng|sang).*(thứ|thu|hôm sau|hom sau)|(thứ|thu).*(sáng|sang)|vào sáng|vao sang|trả.*sáng|tra.*sang",
            lower,
        )
    )
    return asks_late and morning


def is_late_return_fee_question(text: str) -> bool:
    lower = text.lower().strip()
    late_return = bool(
        re.search(r"trả trễ|tra tre|trả muộn|tra muon|trả máy trễ|tra may tre", lower)
        or (
            re.search(r"\b(trả|tra)\b", lower)
            and re.search(r"(máy|may)", lower)
            and re.search(r"trễ|tre|muộn|muon", lower)
        )
    )
    asks_fee = bool(
        re.search(
            r"tính thêm|tinh them|thêm tiền|them tien|phụ thu|phu thu|phí trễ|phi tre|phạt trễ|phat tre|"
            r"mất tiền|mat tien|mất phí|mat phi|có thêm tiền|co them tien",
            lower,
        )
    )
    short_fee = asks_fee and re.search(r"(không|ko)", lower) and len(lower) < 80
    return (late_return and asks_fee) or short_fee


def _asks_price_not_delivery(text: str) -> bool:
    return bool(re.search(r"(^|\s)gi[aá](\s|$)", text) or re.search(r"bao nhiêu|bao nhieu", text))


def is_delivery_arrangement_request(text: str) -> bool:
    """Khách muốn shop đem/giao máy ra (Long Khánh hoặc chỗ khách), không tự tới shop."""
    norm = _normalize_booking(text)
    has_camera = bool(re.search(r"may", norm))
    brings_out = bool(
        re.search(r"dem\s+.*\bra\b", norm)
        or re.search(r"giao\s+.*\bra\b", norm)
        or re.search(r"ship\s+.*\bra\b", norm)
        or re.search(r"dua may ra", norm)
    )
    if not brings_out and not (
        has_camera and re.search(r"\b(dem|giao|ship)\b", norm)
    ):
        return False
    to_lk = bool(re.search(r"\blk\b|long khanh", norm))
    cannot_come = bool(
        re.search(
            r"ko\s+(vao|vo)\s+nha|khong\s+(vao|vo)\s+nha|"
            r"ko\s+(den|vao)\s+(nha|shop)|khong\s+(den|vao)\s+(nha|shop)",
            norm,
        )
    )
    asks_can = bool(re.search(r"duoc k|dc k|duoc khong|dc khong", norm))
    if brings_out and (to_lk or cannot_come or asks_can):
        return True
    if has_camera and to_lk and re.search(r"\b(dem|giao|ship)\b", norm):
        return True
    return False


def delivery_arrangement_reply(text: str, history: list | None = None) -> str:
    pronouns = resolve_messenger_pronouns(text, history or [])
    customer = pronouns["customer"]
    shop = pronouns["shop"]
    return (
        f"{customer.capitalize()} để lại địa chỉ, sđt và thời gian nhận máy giúp {shop} nhé."
    )


def is_delivery_pickup_question(text: str) -> bool:
    lower = text.lower().strip()
    delivery = bool(
        re.search(
            r"\bship\b|giao hàng|giao hang|giao máy|giao may|giao tận|giao tan|tận nơi|tan noi",
            lower,
        )
    )
    pickup = bool(
        re.search(
            r"tự (tới|toi|đến|den) lấy|tu (toi|den) lay|tự lấy|tu lay|đến shop|den shop|"
            r"qua shop|tới shop lấy|toi shop lay|mình tự tới|minh tu toi",
            lower,
        )
    )
    if delivery and pickup:
        return True
    if delivery and re.search(r"(hay|hoặc|hoac|hay là|hay la)", lower):
        return True
    if pickup and re.search(r"(hay|hoặc|hoac|\bship\b|giao)", lower):
        return True
    if delivery and re.search(r"(không|khong|\bko\b)", lower) and len(lower) < 80:
        return not _asks_price_not_delivery(lower)
    if re.search(r"có (ship|giao)|co (ship|giao)", lower) and len(lower) < 80:
        return not _asks_price_not_delivery(lower)
    return False


def is_shop_address_question(text: str) -> bool:
    lower = text.lower().strip()
    norm = _normalize_booking(lower)
    if re.search(r"địa chỉ|dia chi|địa điểm|dia diem|chỉ đường|chi duong", lower):
        return True
    if re.search(r"nhà.*(ở đâu|o dau|đâu|dau)|nha.*(o dau|ở đâu)", lower + norm):
        return True
    if re.search(r"(shop|cửa hàng|cua hang|tiệm|tiem|bạn|ban|mình|minh).*(ở đâu|o dau)", lower):
        return True
    if re.search(r"(ở đâu|o dau).*(shop|cửa hàng|cua hang|lấy máy|lay may|nhà|nha)", lower):
        return True
    if re.search(r"\banh\b.*(ở đâu|o dau)", lower) and re.search(r"nhà|nha|chỗ|cho|địa|dia", lower):
        return True
    if re.match(r"^(ở đâu|o dau|đâu vậy|dau vay)", lower) and len(lower) < 35:
        return True
    return False


def is_shop_phone_question(text: str) -> bool:
    lower = text.lower().strip()
    if re.search(r"số điện thoại|so dien thoai|\bsdt\b|hotline|số phone|so phone|zalo", lower):
        return True
    if re.search(r"(gọi|goi).*(shop|bạn|ban|mình|minh|liên hệ|lien he)", lower):
        return True
    if re.search(r"(liên hệ|lien he|contact).*(shop|số|so|phone)", lower) or re.search(
        r"(shop).*(liên hệ|lien he|số|so)", lower
    ):
        return True
    if re.match(r"^(gọi|goi|call)\b", lower) and len(lower) < 40:
        return True
    return False


def format_shop_address_reply(info: dict, shop: str = "anh") -> str | None:
    map_url = (info.get("map_url") or "").strip()
    address = (info.get("address") or "").strip()
    link = map_url or (address if address.startswith("http") else "")
    if link:
        return f"Bên {shop} đây nhé: {link}"
    if address:
        return f"Bên {shop} ở {address} nhé ạ."
    return None


def format_shop_phone_reply(info: dict, shop: str = "anh") -> str | None:
    phone = (info.get("phone") or "").strip()
    if not phone:
        return None
    return f"Số {shop} đây nhé: {phone}"


COMPARE_HINT = re.compile(
    r"dep hon|tot hon|nen chon|so sanh|khac nhau|khac gi|manh hon|xin hon|"
    r"hon a\b|hon ah|hon em|hon chi|hon anh|may nao|máy nào"
)


def is_camera_comparison_question(text: str) -> bool:
    norm = _normalize_booking(text)
    if not COMPARE_HINT.search(norm):
        return False
    models = re.findall(r"\b(xt\d+|xs\d+|r\d+v?|m\d+|pocket\s?\d+|nano)\b", norm)
    return len(set(models)) >= 2


def format_camera_comparison_reply(
    text: str,
    cameras: list[dict],
    frontend_url: str,
) -> str:
    from app.domain.formatters import camera_model_short_label
    from app.domain.price_quote import match_cameras_in_text

    p = resolve_messenger_pronouns(text)
    link = f"{frontend_url.rstrip('/')}/book"
    matched = match_cameras_in_text(text, cameras)
    if len(matched) >= 2:
        labels = [
            camera_model_short_label(c["brand"], c["name"]) for c in matched[:3]
        ]
        if len(labels) == 2:
            names = f"{labels[0]} và {labels[1]}"
        else:
            names = ", ".join(labels[:-1]) + f" và {labels[-1]}"
        return (
            f"Dạ {names} mỗi máy một ưu điểm ạ, khó nói máy nào hơn vì còn tùy gu {p['customer']}. "
            f"{p['customer'].capitalize()} lên {link} xem thông số từng máy hoặc nhắn {p['shop']} "
            f"nhu cầu chụp (du lịch, sự kiện…) để tư vấn kỹ hơn nhé."
        )
    return (
        f"Dạ câu này tùy gu {p['customer']} ạ. "
        f"{p['customer'].capitalize()} lên {link} xem chi tiết từng máy nhé."
    )


def _asks_rental_price(text: str) -> bool:
    lower = text.lower().strip()
    norm = _normalize_booking(text)
    return bool(
        re.search(r"tiền|mấy tiền", lower)
        or re.search(r"\bgiá\b", lower)
        or re.search(r"\btien\b", norm)
        or re.search(r"\bgia\b", norm)
        or re.search(r"may tien\b", norm)
    )


def is_shift_duration_question(text: str) -> bool:
    """Hỏi 1 buổi thuê bao nhiêu tiếng/giờ — không phải hỏi giá máy."""
    if _asks_rental_price(text):
        return False
    lower = text.lower().strip()
    norm = _normalize_booking(text)
    has_shift = bool(re.search(r"\bbuổi\b", lower) or re.search(r"\bbuoi\b", norm))
    if not has_shift:
        return False
    return bool(
        re.search(r"tiếng|tieng|giờ|gio", lower)
        or re.search(r"tieng|gio", norm)
        or re.search(r"bnh|bao nhiêu|bao nhieu|mấy|may", lower)
    )


def is_full_day_duration_question(text: str) -> bool:
    """Hỏi 1 ngày / cả ngày thuê bao nhiêu tiếng — không phải hỏi giá."""
    if _asks_rental_price(text):
        return False
    lower = text.lower().strip()
    norm = _normalize_booking(text)
    has_day = bool(
        re.search(r"\b1\s*ngày\b|\bcả ngày\b|\bca ngay\b", lower)
        or re.search(r"\b1 ngay\b|\bca ngay\b", norm)
    )
    if not has_day:
        return False
    return bool(
        re.search(r"tiếng|tieng|giờ|gio", lower)
        or re.search(r"tieng|gio", norm)
        or re.search(r"bnh|bao nhiêu|bao nhieu|mấy|may", lower)
    )


def rental_duration_reply(text: str, history: list | None = None) -> str:
    p = resolve_messenger_pronouns(text, history or [])
    shop = p["shop"]
    if is_full_day_duration_question(text) and not is_shift_duration_question(text):
        return f"1 ngày bên {shop} tính từ 7h đến 23h ạ."
    return f"1 buổi bên {shop} tính 6 tiếng ạ."


POLICY_CANNED_REPLIES = {
    "extra_accessory": ("is_extra", lambda: "Được nhen"),
    "color_grading": ("is_color", lambda: "Anh có hỗ trợ chỉnh màu giúp em nhé"),
    "late_return_fee": ("is_late_fee", lambda: "Không nhen"),
}


def detect_policy_canned(text: str, history: list | None = None) -> str | None:
    hist = history or []
    if is_shift_duration_question(text) or is_full_day_duration_question(text):
        return rental_duration_reply(text, hist)
    if is_deposit_received_question(text):
        return deposit_received_reply(text, hist)
    if is_deposit_question(text):
        return deposit_reply(text, hist)
    if is_delivery_pickup_question(text):
        return delivery_pickup_reply(text, hist)
    if is_early_pickup_question(text):
        return early_pickup_reply(text, hist)
    if is_late_morning_return_question(text):
        return late_morning_return_reply(text, hist)
    checks = [
        (is_extra_accessory_request, "extra_accessory"),
        (is_color_grading_request, "color_grading"),
        (is_late_return_fee_question, "late_return_fee"),
    ]
    for fn, key in checks:
        if fn(text):
            _, reply_fn = POLICY_CANNED_REPLIES[key]
            return reply_fn()
    return None
