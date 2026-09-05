from app.domain.pronouns import resolve_messenger_pronouns


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


def test_default_anh_em():
    assert resolve_messenger_pronouns("còn máy không") == {
        "shop": "anh",
        "customer": "em",
    }


def test_anh_at_end_addresses_shop():
    assert resolve_messenger_pronouns("ngày mai còn lịch trống không anh") == {
        "shop": "anh",
        "customer": "em",
    }


def test_anh_at_start_addresses_shop():
    assert resolve_messenger_pronouns("anh còn r50 không ạ") == {
        "shop": "anh",
        "customer": "em",
    }


def test_customer_self_anh():
    assert resolve_messenger_pronouns("anh muốn thuê r50 ngày mai") == {
        "shop": "em",
        "customer": "anh",
    }


def test_chi_addresses_shop():
    assert resolve_messenger_pronouns("chị ơi còn máy không ạ") == {
        "shop": "em",
        "customer": "chị",
    }
