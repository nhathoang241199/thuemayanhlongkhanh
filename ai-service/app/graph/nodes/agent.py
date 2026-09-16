"""MiniMax agent node — LangChain create_react_agent on LangGraph."""

from __future__ import annotations

import re
from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from app.config import get_settings
from app.db.pool import get_pool
from app.db.repositories.cameras import list_public_cameras
from app.domain.canned import format_camera_comparison_reply, is_camera_comparison_question
from app.domain.formatters import camera_model_short_label
from app.domain.price_quote import (
    build_price_quote_context,
    is_duration_follow_up,
    is_price_quote_question,
    match_camera_in_text,
    parse_day_count,
)
from app.domain.pricing import add_days_date_str, today_calendar_day_vn
from app.domain.pronouns import resolve_messenger_pronouns
from app.graph.state import ChatState
from app.tools.messenger_tools import build_tools

_AGENT = None
_PROMPT_PATH = Path(__file__).resolve().parents[2] / "prompts" / "system.md"


def _pronoun_section(user_message: str, history: list[dict]) -> str:
    p = resolve_messenger_pronouns(user_message, history)
    return (
        "## Xưng hô tin nhắn này (bắt buộc)\n"
        f"- Shop xưng: **{p['shop']}**\n"
        f"- Gọi khách: **{p['customer']}**\n"
        "- Một câu chỉ một cặp xưng hô; không đổi giữa chừng."
    )


def _current_date_section() -> str:
    today = today_calendar_day_vn()
    tomorrow = add_days_date_str(today, 1)
    year, month, _ = today.split("-")
    return (
        "## Ngày hiện tại (giờ Việt Nam)\n"
        f"- Hôm nay: {today}\n"
        f"- Ngày mai: {tomorrow}\n"
        f"- Tháng này: {int(month)}/{year}\n"
        '- "Hôm nay", "ngày mai" → dùng các ngày trên; **không hỏi lại khách hôm nay là ngày mấy**.'
    )


_PRICE_AMOUNT_RE = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*(?:k|tr)\b"
    r"|\b\d{1,3}(?:[.\s]\d{3})+(?:\s*đ)?\b"
    r"|\b\d+\s*đ\b",
    re.IGNORECASE,
)


def _redact_price_amounts(text: str) -> str:
    """Strip money figures so the model cannot copy a stale quote from history."""
    return _PRICE_AMOUNT_RE.sub("[giá cũ — gọi quote_camera_price]", text)


def _needs_fresh_price_tools(user_message: str) -> bool:
    if is_price_quote_question(user_message):
        return True
    return bool(parse_day_count(user_message) and is_duration_follow_up(user_message))


def _history_for_llm(history: list[dict], user_message: str) -> list[dict]:
    if not _needs_fresh_price_tools(user_message):
        return history
    out: list[dict] = []
    for turn in history:
        if turn.get("role") == "assistant":
            out.append(
                {
                    **turn,
                    "content": _redact_price_amounts(str(turn.get("content") or "")),
                }
            )
        else:
            out.append(turn)
    return out


def _conversation_context_section(
    user_message: str,
    history: list[dict],
    cameras: list[dict],
) -> str:
    context = build_price_quote_context(user_message, history)
    camera = match_camera_in_text(context, cameras)
    lines: list[str] = []
    if _needs_fresh_price_tools(user_message):
        lines.extend(
            [
                "## Giá thuê (bắt buộc lượt này)",
                "- Giá trong lịch sử chat có thể đã cũ sau khi admin cập nhật DB.",
                "- **Bắt buộc** gọi `quote_camera_price` trong lượt này trước khi trả lời số tiền.",
                "- Cấm đoán hoặc nhắc lại số tiền đã bị che bằng `[giá cũ — gọi quote_camera_price]`.",
            ]
        )
    if not camera:
        return "\n".join(lines)
    label = camera_model_short_label(camera["brand"], camera["name"])
    day_count = parse_day_count(user_message)
    lines.extend(
        [
            "## Ngữ cảnh hội thoại (bắt buộc)",
            f"- Khách đang nhắc máy: **{label}** (id `{camera['id']}`)",
            "- Không hỏi lại hãng/model nếu đã rõ trong hội thoại.",
        ]
    )
    if day_count:
        lines.append(
            f"- Số ngày trong tin hiện tại: **{day_count}** — gọi `quote_camera_price(cameraId=\"{camera['id']}\", dayCount={day_count})` rồi báo số tiền tool trả về."
        )
    elif _needs_fresh_price_tools(user_message):
        lines.append(
            f"- Chưa rõ số ngày — hỏi lại, hoặc nếu mặc định 1 ngày thì gọi `quote_camera_price(cameraId=\"{camera['id']}\", dayCount=1)`."
        )
    return "\n".join(lines)


def _load_system_prompt(
    frontend_url: str,
    user_message: str,
    history: list[dict],
    cameras: list[dict] | None = None,
) -> str:
    base = _PROMPT_PATH.read_text(encoding="utf-8")
    book_url = f"{frontend_url.rstrip('/')}/book"
    pronouns = _pronoun_section(user_message, history)
    dates = _current_date_section()
    context = _conversation_context_section(user_message, history, cameras or [])
    parts = [base, dates, pronouns]
    if context:
        parts.append(context)
    parts.append(f"## Link đặt lịch\n\n{book_url}\n")
    return "\n\n".join(parts)


_THINK_TAG = chr(60) + "think" + chr(62)
_THINK_END = chr(60) + "/" + "think" + chr(62)
_THINKING_RE = re.compile(
    rf"<think>[\s\S]*?</think>\s*"
    rf"|{_THINK_TAG}[\s\S]*?{_THINK_END}\s*",
    re.IGNORECASE,
)


def _strip_thinking(text: str) -> str:
    """Remove MiniMax M2.x reasoning blocks from user-facing text."""
    return _THINKING_RE.sub("", text).strip()


def _truncate_reply(text: str, max_len: int = 500) -> str:
    t = text.strip()
    if len(t) <= max_len:
        return t
    return t[: max_len - 1].rstrip() + "…"


def _ai_message_text(message: AIMessage) -> str:
    """Extract user-facing text from AIMessage (string or content blocks)."""
    content = message.content
    raw = ""
    if isinstance(content, str):
        raw = content.strip()
    elif isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block.strip())
            elif isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text")
                if text:
                    parts.append(str(text).strip())
            elif getattr(block, "type", None) == "text":
                text = getattr(block, "text", None)
                if text:
                    parts.append(str(text).strip())
        raw = "\n".join(p for p in parts if p)
    elif content:
        raw = str(content).strip()
    return _strip_thinking(raw)


def _pick_final_ai_text(messages: list) -> str:
    """Last assistant message without tool calls — skip reasoning-only turns."""
    for m in reversed(messages):
        if not isinstance(m, AIMessage):
            continue
        if getattr(m, "tool_calls", None):
            continue
        text = _ai_message_text(m)
        if text:
            return text
    return ""


def _is_weak_reply(text: str) -> bool:
    t = text.strip()
    if len(t) < 35:
        return True
    if re.match(r"^[A-Za-z0-9\s, và+và]+$", t) and len(t) < 80:
        return True
    return False


async def _get_agent():
    global _AGENT
    if _AGENT is not None:
        return _AGENT
    settings = get_settings()
    pool = await get_pool()
    tools = build_tools(pool)
    model = ChatOpenAI(
        model=settings.minimax_model,
        api_key=settings.minimax_api_key,
        base_url=settings.minimax_base_url,
        max_tokens=1024,
        temperature=0,
    )
    _AGENT = create_react_agent(model, tools)
    return _AGENT


async def agent_node(state: ChatState) -> dict:
    settings = get_settings()
    if not settings.agent_enabled:
        history = state.get("history") or []
        p = resolve_messenger_pronouns(state["user_message"], history)
        reply = (
            f"{p['shop'].capitalize()} chưa rõ câu hỏi — "
            f"{p['customer']} mô tả thêm giúp {p['shop']} nhé?"
        )
        return {
            "reply": reply,
            "reply_raw": reply,
            "canned": False,
            "graph_trace": ["agent_node_no_key"],
            "rounds": [],
        }

    agent = await _get_agent()
    pool = await get_pool()
    cameras = await list_public_cameras(pool)
    history = state.get("history") or []
    llm_history = _history_for_llm(history, state["user_message"])
    system = _load_system_prompt(
        state.get("frontend_url", settings.frontend_url),
        state["user_message"],
        history,
        cameras,
    )

    lc_messages: list = [SystemMessage(content=system)]
    for turn in llm_history:
        if turn["role"] == "user":
            lc_messages.append(HumanMessage(content=turn["content"]))
        else:
            lc_messages.append(AIMessage(content=turn["content"]))
    lc_messages.append(HumanMessage(content=state["user_message"]))

    force_price_tools = _needs_fresh_price_tools(state["user_message"])
    if force_price_tools:
        # Fresh agent with tool_choice=any so the model must call a tool (quote_camera_price).
        pool_tools = build_tools(pool)
        forced_model = ChatOpenAI(
            model=settings.minimax_model,
            api_key=settings.minimax_api_key,
            base_url=settings.minimax_base_url,
            max_tokens=1024,
            temperature=0,
        ).bind_tools(pool_tools, tool_choice="any")
        forced_agent = create_react_agent(forced_model, pool_tools)
        result = await forced_agent.ainvoke({"messages": lc_messages})
    else:
        result = await agent.ainvoke({"messages": lc_messages})

    messages = result.get("messages", [])
    raw = _pick_final_ai_text(messages)
    if not raw or _is_weak_reply(raw):
        if is_camera_comparison_question(state["user_message"]):
            raw = format_camera_comparison_reply(
                state["user_message"],
                cameras,
                state.get("frontend_url", settings.frontend_url),
            )
        elif not raw:
            p = resolve_messenger_pronouns(state["user_message"], history)
            raw = (
                f"{p['shop'].capitalize()} chưa rõ câu hỏi — "
                f"{p['customer']} mô tả thêm giúp {p['shop']} nhé?"
            )
    reply = _truncate_reply(raw)

    return {
        "reply": reply,
        "reply_raw": raw,
        "canned": False,
        "graph_trace": ["agent_node"],
        "rounds": [],
    }
