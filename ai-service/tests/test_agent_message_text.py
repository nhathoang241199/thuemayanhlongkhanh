from langchain_core.messages import AIMessage

from app.graph.nodes.agent import _ai_message_text


def test_ai_message_text_from_string():
    assert _ai_message_text(AIMessage(content="Xin chào")) == "Xin chào"


def test_ai_message_text_from_content_blocks():
    msg = AIMessage(
        content=[
            {"type": "text", "text": "Anh cần thuê R50 ngày nào ạ?"},
            {
                "type": "tool_use",
                "id": "toolu_01",
                "name": "list_cameras",
                "input": {"brand": "Canon"},
            },
        ]
    )
    assert _ai_message_text(msg) == "Anh cần thuê R50 ngày nào ạ?"
