from datetime import date

from app.domain.formatters import (
    format_shop_promotion_tool_result,
    is_shop_promotion_visible,
)


def test_promotion_not_visible_when_zero_percent():
    assert not is_shop_promotion_visible(
        {"discount_percent": 0, "start_date": None, "end_date": None}
    )


def test_promotion_visible_open_ended():
    assert is_shop_promotion_visible(
        {"discount_percent": 20, "start_date": None, "end_date": None}
    )


def test_promotion_expired():
    assert not is_shop_promotion_visible(
        {
            "discount_percent": 15,
            "start_date": date(2026, 1, 1),
            "end_date": date(2026, 1, 31),
        },
        today=date(2026, 2, 1),
    )


def test_format_active_with_range():
    text = format_shop_promotion_tool_result(
        {
            "discount_percent": 20,
            "start_date": date(2026, 9, 1),
            "end_date": date(2026, 9, 30),
        },
        today=date(2026, 9, 11),
    )
    assert "20%" in text
    assert "01/09/2026" in text
    assert "30/09/2026" in text


def test_format_customer_reply_no_promo():
    from app.domain.canned import format_shop_promotion_customer_reply

    reply = format_shop_promotion_customer_reply(
        {"discount_percent": 0, "start_date": None, "end_date": None},
        "có giảm giá không",
    )
    assert "chưa có chương trình giảm giá" in reply


def test_format_inactive():
    text = format_shop_promotion_tool_result(
        {"discount_percent": 0, "start_date": None, "end_date": None},
        today=date(2026, 9, 11),
    )
    assert "không có chương trình giảm giá" in text.lower()
