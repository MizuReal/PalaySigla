from typing import Literal

from pydantic import BaseModel, Field, field_validator

MAX_MESSAGE_CHARS = 2000
MAX_HISTORY_MESSAGES = 20


class ChatTurn(BaseModel):
    # the system role is never accepted: the server owns the system prompt
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatTurn] = Field(
        min_length=1,
        max_length=MAX_HISTORY_MESSAGES,
        description="Conversation history, oldest first, ending with the user's latest message.",
    )

    @field_validator("messages")
    @classmethod
    def must_end_with_user_message(cls, messages: list[ChatTurn]) -> list[ChatTurn]:
        if messages[-1].role != "user":
            raise ValueError("The last message must come from the user.")
        return messages


class ChatReply(BaseModel):
    reply: str


class ChatResponse(BaseModel):
    data: ChatReply
    error: None = None
