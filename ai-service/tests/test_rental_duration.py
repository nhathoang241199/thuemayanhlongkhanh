"""Tests for rental duration policy canned replies."""

from app.domain.canned import (
    detect_policy_canned,
    is_full_day_duration_question,
    is_shift_duration_question,
    rental_duration_reply,
)
from app.graph.nodes.route import detect_intent


def test_shift_duration_question():
    assert is_shift_duration_question("1 buổi bên mình bnh tiếng vậy ạ")
    assert is_shift_duration_question("thuê 1 buổi mấy tiếng")
    assert not is_shift_duration_question("1 buổi bao nhiêu tiền")


def test_full_day_duration_question():
    assert is_full_day_duration_question("1 ngày mấy tiếng vậy")
    assert not is_full_day_duration_question("1 ngày bao nhiêu tiền")


def test_rental_duration_reply():
    assert rental_duration_reply("1 buổi mấy tiếng") == "1 buổi bên anh tính 6 tiếng ạ."
    assert (
        rental_duration_reply("1 ngày mấy tiếng")
        == "1 ngày bên anh tính từ 7h đến 23h ạ."
    )


def test_route_intent_shift_duration():
    msg = "1 buổi bên mình bnh tiếng vậy ạ"
    assert detect_intent(msg, []) == "policy_fees"
    assert detect_policy_canned(msg) == "1 buổi bên anh tính 6 tiếng ạ."


def test_early_pickup_toi_hom_trc():
    msg = "e lấy máy tối hôm trc đc ko a"
    assert detect_intent(msg, []) == "policy_fees"
    assert detect_policy_canned(msg) == "Được em nha"
