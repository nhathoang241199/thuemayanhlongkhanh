import asyncio
from unittest.mock import AsyncMock, patch

from app.domain.canned import price_check_web_reply
from app.domain.price_quote import build_price_quote_from_camera
from app.graph.nodes.price import price_node


def test_price_check_web_reply_still_exists_for_compat():
    reply = price_check_web_reply(
        "http://localhost:3001",
        "a oi cho e xin lại giá thuê máy ảnh với ạ",
        [],
    )
    assert "/book" in reply


def test_build_price_quote_from_camera():
    camera = {
        "id": "1",
        "name": "r50",
        "brand": "CANON",
        "day_price": 450_000,
        "shift_price": 250_000,
        "discount_percent": 0,
    }
    reply = build_price_quote_from_camera(camera, 2)
    assert "r50" in reply.lower() or "R50" in reply
    assert "2 ngày" in reply
    assert "k" in reply.lower()


def test_price_node_quotes_known_camera():
    cameras = [
        {
            "id": "1",
            "name": "r50",
            "brand": "CANON",
            "day_price": 450_000,
            "shift_price": 250_000,
            "discount_percent": 0,
        }
    ]

    async def run():
        with (
            patch("app.graph.nodes.price.get_pool", new_callable=AsyncMock),
            patch(
                "app.graph.nodes.price.list_public_cameras",
                new_callable=AsyncMock,
                return_value=cameras,
            ),
        ):
            return await price_node(
                {
                    "user_message": "giá r50 2 ngày",
                    "history": [],
                    "frontend_url": "http://localhost:3001",
                }
            )

    result = asyncio.run(run())
    assert result["canned"] is True
    assert "price_node" in result["graph_trace"]
    assert "/book" not in result["reply"]
    assert "2 ngày" in result["reply"]


def test_price_node_asks_model_when_vague():
    async def run():
        with (
            patch("app.graph.nodes.price.get_pool", new_callable=AsyncMock),
            patch(
                "app.graph.nodes.price.list_public_cameras",
                new_callable=AsyncMock,
                return_value=[],
            ),
        ):
            return await price_node(
                {
                    "user_message": "cho em xin giá máy ạ",
                    "history": [],
                    "frontend_url": "http://localhost:3001",
                }
            )

    result = asyncio.run(run())
    assert "máy nào" in result["reply"]
