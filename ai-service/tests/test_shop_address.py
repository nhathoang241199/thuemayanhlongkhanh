from app.domain.canned import format_shop_address_reply, is_shop_address_question


def test_nha_anh_o_dau_is_address_question():
    assert is_shop_address_question("nhà anh ở đâu")


def test_format_shop_address_reply_prefers_map_url():
    reply = format_shop_address_reply(
        {
            "map_url": "https://maps.app.goo.gl/QuD6HpHiBBzWC2HXA",
            "address": "Long Khánh",
        },
        "anh",
    )
    assert reply == "Bên anh đây nhé: https://maps.app.goo.gl/QuD6HpHiBBzWC2HXA"
