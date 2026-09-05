from app.domain.canned import is_camera_comparison_question


def test_camera_comparison_question():
    assert is_camera_comparison_question("xt3 với xt30 máy nào đẹp hơn ạ")
    assert is_camera_comparison_question("r50 hay m50 tot hon")
    assert not is_camera_comparison_question("xt30 con may khong")


def test_route_comparison_intent():
    from app.graph.nodes.route import detect_intent

    assert detect_intent("xt3 với xt30 máy nào đẹp hơn ạ", []) == "camera_compare"
