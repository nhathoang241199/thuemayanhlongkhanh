from app.domain.price_quote import (
    build_price_quote_from_camera,
    is_duration_follow_up,
    is_price_quote_question,
    match_camera_in_text,
    parse_day_count,
    resolve_price_quote_request,
    text_contains_model,
)

CAMERAS = [
    {
        "id": "1",
        "name": "r50",
        "brand": "CANON",
        "day_price": 450_000,
        "shift_price": 250_000,
        "discount_percent": 0,
    },
    {
        "id": "2",
        "name": "m50",
        "brand": "CANON",
        "day_price": 400_000,
        "shift_price": 220_000,
        "discount_percent": 0,
    },
    {
        "id": "3",
        "name": "pocket 3",
        "brand": "DJI",
        "day_price": 280_000,
        "shift_price": 160_000,
        "discount_percent": 0,
    },
    {
        "id": "4",
        "name": "xt30",
        "brand": "FUJIFILM",
        "day_price": 350_000,
        "shift_price": 200_000,
        "discount_percent": 0,
    },
    {
        "id": "5",
        "name": "xt3",
        "brand": "FUJIFILM",
        "day_price": 300_000,
        "shift_price": 180_000,
        "discount_percent": 0,
    },
]


def test_is_price_quote_question():
    assert is_price_quote_question("em xin giá pocket3 giá 1 ngày ạ")
    assert is_price_quote_question("r50 2 ngày bao nhiêu")
    assert not is_price_quote_question("hi shop")
    assert not is_price_quote_question("cách thuê máy")


def test_parse_day_count():
    assert parse_day_count("giá 1 ngày") == 1
    assert parse_day_count("r50 2 ngày") == 2
    assert parse_day_count("anh còn r50 ngày mai không ạ") is None
    assert parse_day_count("pocket 3 1 tuần giá bao nhiêu") == 7
    assert parse_day_count("giá r50") is None


def test_match_camera_in_text():
    assert match_camera_in_text("xin giá pocket3 1 ngày", CAMERAS)["name"] == "pocket 3"
    assert match_camera_in_text("pocket 3 1 tuần giá bao nhiêu ạ", CAMERAS)["name"] == "pocket 3"
    assert match_camera_in_text("r50 giá 2 ngày", CAMERAS)["name"] == "r50"
    assert match_camera_in_text("giá xt30 1 ngày", CAMERAS)["name"] == "xt30"
    assert match_camera_in_text("giá xt3 1 ngày", CAMERAS)["name"] == "xt3"
    assert not text_contains_model("br50 giá", "r50")
    assert text_contains_model("r50 giá", "r50")


def test_is_duration_follow_up():
    assert is_duration_follow_up("còn 3 ngày")
    assert is_duration_follow_up("thuê 2 ngày")
    assert not is_duration_follow_up("còn máy 3 ngày không")


def test_resolve_price_quote_from_history():
    history = [
        {"role": "user", "content": "giá pocket 3 1 ngày"},
        {"role": "assistant", "content": "Pocket 3 1 ngày 280k nhé ạ."},
    ]
    req = resolve_price_quote_request("còn 3 ngày", CAMERAS, history)
    assert req is not None
    camera, days = req
    assert camera["name"] == "pocket 3"
    assert days == 3


def test_resolve_price_follow_up_with_history():
    history = [
        {"role": "user", "content": "anh còn r50 ngày mai không ạ"},
        {"role": "assistant", "content": "R50 Ngày mai còn nhé ạ, bạn lên http://localhost:3001/book đặt lịch giúp em nhé."},
    ]
    req = resolve_price_quote_request("giá 3 ngày bao nhiêu v anh", CAMERAS, history)
    assert req is not None
    camera, days = req
    assert camera["name"] == "r50"
    assert days == 3


def test_match_full_camera_name():
    cameras = [
        {
            **CAMERAS[0],
            "name": "EOS R50 kit RF-S 18-45mm",
        }
    ]
    assert match_camera_in_text("anh còn r50 ngày mai không ạ", cameras) is not None


def test_build_price_quote():
    reply = build_price_quote_from_camera(CAMERAS[0], 2)
    assert "R50" in reply
    assert "2 ngày" in reply
