from app.domain.pronouns import resolve_messenger_pronouns


def test_anh_at_end_shop_em_customer_anh():
    assert resolve_messenger_pronouns("ngày mai còn lịch trống không anh") == {
        "shop": "em",
        "customer": "anh",
    }


def test_anh_at_start_shop_em_customer_ban():
    assert resolve_messenger_pronouns("anh còn r50 không ạ") == {
        "shop": "em",
        "customer": "bạn",
    }


def test_em_self_reference():
    assert resolve_messenger_pronouns("em xin giá r50 1 ngày ạ") == {
        "shop": "anh",
        "customer": "em",
    }


def test_fb_shorthand_em():
    assert resolve_messenger_pronouns("a oi cho e xin lại giá thuê máy ảnh với ạ") == {
        "shop": "anh",
        "customer": "em",
    }


def test_tai_em_in_batched_message():
    msg = (
        "a oi\n---\n"
        "mai a đem máy ảnh ra lk dc k ak, tại em ko vô nhà anh dc á"
    )
    assert resolve_messenger_pronouns(msg) == {"shop": "anh", "customer": "em"}


def test_default_minh_ban():
    assert resolve_messenger_pronouns("còn máy không") == {
        "shop": "mình",
        "customer": "bạn",
    }
