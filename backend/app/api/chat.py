from fastapi import APIRouter, Depends, Request

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.models.chat import ChatReply, ChatRequest, ChatResponse
from app.services.chatbot import Chatbot
from app.services.rate_limit import IpRateLimiter

router = APIRouter(prefix="/api/chat", tags=["chat"])

_settings = get_settings()
_chatbot = Chatbot(_settings)
_chat_rate_limiter = IpRateLimiter(
    max_requests=_settings.chat_rate_limit_max_requests,
    window_seconds=_settings.chat_rate_limit_window_seconds,
)


def enforce_chat_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    _chat_rate_limiter.check(client_ip)


@router.post("", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    _user_id: str = Depends(get_current_user),
    _: None = Depends(enforce_chat_rate_limit),
) -> ChatResponse:
    reply = await _chatbot.respond(payload.messages)
    return ChatResponse(data=ChatReply(reply=reply))
