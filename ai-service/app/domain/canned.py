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
    host = "thuemayanhlongkhanh.com"
    try:
        host = urlparse(site_url).netloc or host
    except Exception:
        pass
    customer = resolve_messenger_pronouns(text)["customer"]
    return f"Em lên trang {host} kiểm tra lịch trống và đặt lịch giúp {customer} nhé."


def price_check_web_reply(site_url: str, text: str, history: list | None = None) -> str:
    """Khách hỏi giá — nhắc khách tự lên web xem giá, không báo số tiền trong chat."""
    pronouns = resolve_messenger_pronouns(text, history or [])
    shop = pronouns["shop"]
    customer = pronouns["customer"]
    base = site_url.rstrip("/")
    link = f"{base}/book" if base else "/book"
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


def is_early_pickup_question(text: str) -> bool:
    lower = text.lower().strip()
    asks_pickup = bool(
        re.search(r"(lấy|lay|nhận|nhan).*(máy|may)", lower)
        or re.search(r"(máy|may).*(lấy|lay|nhận|nhan)", lower)
        or re.search(r"\b(lấy|lay|nhận|nhan)\b", lower)
    )
    early_timing = bool(
        re.search(
            r"tối hôm trước|toi hom truoc|hôm trước.*(lấy|lay|nhận|nhan)|(lấy|lay|nhận|nhan).*hôm trước|"
            r"hom truoc.*(lay|nhan)|(lay|nhan).*hom truoc|lấy sớm|lay som|nhận sớm|nhan som|tối thứ|toi thu",
            lower,
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
    if re.search(r"địa chỉ|dia chi|địa điểm|dia diem|chỉ đường|chi duong", lower):
        return True
    if re.search(r"(shop|cửa hàng|cua hang|tiệm|tiem|bạn|ban|mình|minh).*(ở đâu|o dau)", lower):
        return True
    if re.search(r"(ở đâu|o dau).*(shop|cửa hàng|cua hang|lấy máy|lay may)", lower):
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


def format_shop_address_reply(info: dict) -> str | None:
    link = (info.get("map_url") or "").strip() or (info.get("address") or "").strip()
    if not link:
        return None
    return f"Mình ở đây nhé ạ: {link}"


def format_shop_phone_reply(info: dict) -> str | None:
    phone = (info.get("phone") or "").strip()
    if not phone:
        return None
    return f"Số mình đây nhé: {phone}"


POLICY_CANNED_REPLIES = {
    "extra_accessory": ("is_extra", lambda: "Được nhen"),
    "color_grading": ("is_color", lambda: "Anh có hỗ trợ chỉnh màu giúp em nhé"),
    "early_pickup": (
        "is_early",
        lambda: "Được, Với đơn thuê tối thiểu 1 ngày thì em có thể lấy sớm vào tối ngày hôm trước",
    ),
    "late_return_fee": ("is_late_fee", lambda: "Không nhen"),
    "late_morning_return": ("is_late_morning", lambda: "Được nha"),
    "delivery_pickup": (
        "is_delivery",
        lambda: "Shop có hỗ trợ giao & trả tận nơi khu vực Long Khánh, phí ship 20k, hoặc bạn có thể tự tới lấy nhé.",
    ),
}


def detect_policy_canned(text: str) -> str | None:
    checks = [
        (is_extra_accessory_request, "extra_accessory"),
        (is_color_grading_request, "color_grading"),
        (is_early_pickup_question, "early_pickup"),
        (is_late_return_fee_question, "late_return_fee"),
        (is_late_morning_return_question, "late_morning_return"),
        (is_delivery_pickup_question, "delivery_pickup"),
    ]
    for fn, key in checks:
        if fn(text):
            _, reply_fn = POLICY_CANNED_REPLIES[key]
            return reply_fn()
    return None
