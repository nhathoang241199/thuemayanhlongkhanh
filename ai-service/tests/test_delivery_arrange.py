from app.domain.canned import (
    delivery_arrangement_reply,
    is_delivery_arrangement_request,
)
from app.domain.pronouns import resolve_messenger_pronouns


def test_delivery_arrange_detection_batched_lk():
    msg = (
        "a oi\n---\n"
        "mai a đem máy ảnh ra lk dc k ak, tại em ko vô nhà anh dc á"
    )
    assert is_delivery_arrangement_request(msg)


def test_delivery_arrange_not_generic_ship_policy():
    assert not is_delivery_arrangement_request("có ship không ạ")
    assert not is_delivery_arrangement_request("bạn ship hay mình tự tới lấy")


def test_delivery_arrange_reply_pronouns():
    msg = (
        "a oi\n---\n"
        "mai a đem máy ảnh ra lk dc k ak, tại em ko vô nhà anh dc á"
    )
    assert resolve_messenger_pronouns(msg) == {"shop": "anh", "customer": "em"}
    assert (
        delivery_arrangement_reply(msg)
        == "Em để lại địa chỉ, sđt và thời gian nhận máy giúp anh nhé."
    )
