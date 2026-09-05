from app.domain.canned import deposit_received_reply, detect_policy_canned, is_deposit_received_question
from app.graph.nodes.route import detect_intent


def test_deposit_received_question():
    assert is_deposit_received_question("a có nhận cọc chưa ạ?")
    assert is_deposit_received_question("anh nhận cọc chưa")


def test_deposit_received_reply():
    assert deposit_received_reply("a có nhận cọc chưa ạ?") == "Anh nhận được rồi nha"


def test_deposit_received_routes_to_policy():
    assert detect_intent("a có nhận cọc chưa ạ?", []) == "policy_fees"
    assert detect_policy_canned("a có nhận cọc chưa ạ?") == "Anh nhận được rồi nha"
