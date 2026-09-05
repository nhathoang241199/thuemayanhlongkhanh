from app.graph.nodes.route import detect_intent


def test_detect_greeting():
    assert detect_intent("hi") == "greeting"
    assert detect_intent("chào shop") == "greeting"


def test_detect_price():
    assert detect_intent("giá r50 2 ngày") == "price"
    assert detect_intent("còn 3 ngày") == "price"


def test_detect_booking_done():
    assert detect_intent("em đặt rồi ạ") == "booking_done"
    assert detect_intent("book rồi nhé") == "booking_done"


def test_detect_booking():
    assert detect_intent("cách đặt lịch") == "booking_redirect"


def test_detect_availability():
    assert detect_intent("ngày mai còn máy không") == "availability"
    assert detect_intent("anh còn r50 ngày mai không ạ") == "availability"


def test_detect_address():
    assert detect_intent("shop ở đâu") == "address_or_phone"
    assert detect_intent("nhà anh ở đâu") == "address_or_phone"


def test_detect_delivery_arrange_to_lk():
    msg = (
        "a oi\n---\n"
        "mai a đem máy ảnh ra lk dc k ak, tại em ko vô nhà anh dc á"
    )
    assert detect_intent(msg) == "delivery_arrange"
