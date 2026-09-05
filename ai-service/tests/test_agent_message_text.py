from langchain_core.messages import AIMessage

from app.graph.nodes.agent import _ai_message_text, _strip_thinking


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


def test_strip_minimax_thinking_block():
    raw = (
        "<think>\n"
        "Khách hỏi danh sách máy.\n"
        "</think>\n\n"
        "Bên mình có Canon R50, Sony A7C nhé."
    )
    assert _strip_thinking(raw) == "Bên mình có Canon R50, Sony A7C nhé."
    assert _ai_message_text(AIMessage(content=raw)) == "Bên mình có Canon R50, Sony A7C nhé."


def test_strip_think_tag_block():
    open_tag = chr(60) + "think" + chr(62)
    close_tag = chr(60) + "/" + "think" + chr(62)
    raw = f"{open_tag}\nplan\n{close_tag}\n\nEm gửi anh link đặt lịch nhé."
    assert _strip_thinking(raw) == "Em gửi anh link đặt lịch nhé."
