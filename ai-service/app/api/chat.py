from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.graph.builder import run_chat

router = APIRouter(prefix="/v1", tags=["chat"])


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatContext(BaseModel):
    frontend_url: str | None = None
    psid: str | None = None


class ChatRequest(BaseModel):
    user_message: str = Field(min_length=1)
    history: list[ChatTurn] = Field(default_factory=list)
    context: ChatContext | None = None


def verify_token(x_internal_token: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not settings.ai_service_token:
        return
    if x_internal_token != settings.ai_service_token:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/status")
async def status():
    settings = get_settings()
    return {
        "configured": settings.agent_enabled,
        "model": settings.anthropic_model,
        "history_limit": settings.history_limit,
        "rag_enabled": settings.rag_enabled,
    }


@router.post("/chat")
async def chat(body: ChatRequest, _: None = Depends(verify_token)):
    settings = get_settings()
    frontend_url = (
        body.context.frontend_url if body.context and body.context.frontend_url else settings.frontend_url
    )
    history = [t.model_dump() for t in body.history]
    capped = history[-settings.history_limit :]

    result = await run_chat(body.user_message.strip(), capped, frontend_url)

    new_history = [
        *capped,
        {"role": "user", "content": body.user_message.strip()},
        {"role": "assistant", "content": result["reply"]},
    ]

    return {
        "user_message": body.user_message.strip(),
        "reply": result["reply"],
        "reply_raw": result.get("reply_raw", result["reply"]),
        "history": new_history,
        "message_count": len(new_history),
        "canned": result.get("canned", False),
        "intent": result.get("intent", ""),
        "graph_trace": result.get("graph_trace", []),
        "rounds": result.get("rounds", []),
    }
