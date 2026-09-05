from __future__ import annotations

import operator
from typing import Annotated, Literal, TypedDict


class ChatTurn(TypedDict):
    role: Literal["user", "assistant"]
    content: str


class ChatState(TypedDict, total=False):
    user_message: str
    history: list[ChatTurn]
    frontend_url: str
    intent: str
    reply: str
    reply_raw: str
    canned: bool
    graph_trace: Annotated[list[str], operator.add]
    rounds: list[dict]
    handoff: bool
