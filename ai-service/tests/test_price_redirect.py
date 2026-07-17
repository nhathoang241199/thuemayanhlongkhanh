import asyncio

from app.domain.canned import price_check_web_reply
from app.graph.builder import run_chat


def test_price_check_web_reply():
    reply = price_check_web_reply(
        "http://localhost:3001",
        "a oi cho e xin lại giá thuê máy ảnh với ạ",
        [],
    )
    assert reply == (
        "Em lên http://localhost:3001/book xem giá và đặt lịch giúp anh nhé."
    )


def test_price_check_web_reply_default():
    reply = price_check_web_reply(
        "http://localhost:3001",
        "giá r50 2 ngày",
        [],
    )
    assert "localhost:3001/book" in reply
    assert "xem giá" in reply
    assert "600k" not in reply


def test_price_node_redirects():
    result = asyncio.run(run_chat("giá r50 2 ngày", [], "http://localhost:3001"))
    assert result["canned"] is True
    assert "price_node" in result["graph_trace"]
    assert "/book" in result["reply"]
    assert "k nhé" not in result["reply"]
