from app.graph.builder import run_chat


async def test_general_intent_handoff_without_llm():
    result = await run_chat("cho em hỏi chút về thuê máy film", [], "https://example.com")
    assert result["handoff"] is True
    assert result["reply"] == "Mình sẽ gửi lời nhắn đến Admin, bạn chờ chút nhé."
    assert "handoff_node" in result["graph_trace"]
