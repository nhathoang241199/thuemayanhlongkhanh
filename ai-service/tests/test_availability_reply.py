from app.domain.availability import format_availability_reply, parse_availability_date
from app.domain.pricing import today_calendar_day_vn


def test_parse_availability_relative():
    assert parse_availability_date("mai còn máy không")["label"] == "Ngày mai"
    assert parse_availability_date("hôm nay còn không")["label"] == "Hôm nay"


def test_parse_availability_absolute_slash():
    parsed = parse_availability_date("r50 ngày 15/9 còn không")
    assert parsed is not None
    assert parsed["label"] == "ngày 15/9"
    assert parsed["start_date"].endswith("-09-15")


def test_parse_availability_ngay_thang():
    parsed = parse_availability_date("còn máy ngày 20 tháng 10 không")
    assert parsed is not None
    assert parsed["label"] == "ngày 20/10"
    assert parsed["start_date"].endswith("-10-20")


def test_format_availability_no_book_push_when_available():
    reply = format_availability_reply(
        day_label="Ngày mai",
        model_label="R50",
        available=True,
        book_url="https://example.com",
        pronouns={"shop": "em", "customer": "anh"},
    )
    assert reply == "R50 Ngày mai còn nhé ạ."
    assert "/book" not in reply


def test_today_helper_exists():
    assert len(today_calendar_day_vn()) == 10
