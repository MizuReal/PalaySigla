"""Shared Groq chat-completions transport.

The transport owns the HTTP client, payload shape, upstream error mapping, and
the plain-text sanitizer. Feature services own their prompts and topic rules.
"""

import re
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.models.chat import ChatTurn

UPSTREAM_UNAVAILABLE_MESSAGE = "The assistant is unavailable right now. Please try again shortly."
UPSTREAM_BUSY_MESSAGE = "The assistant is busy. Please wait a moment and try again."

TEMPERATURE = 0.2

# Markdown markers the model may emit despite prompt rules. Every substitution
# is paired-marker based so only formatting syntax is removed, never content
# words.
_MARKDOWN_PASSES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\*\*(.+?)\*\*", re.DOTALL), r"\1"),  # bold
    (re.compile(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", re.DOTALL), r"\1"),  # italic
    (re.compile(r"__(.+?)__", re.DOTALL), r"\1"),  # bold underscore
    (re.compile(r"(?<!_)_(?!\s)(.+?)(?<!\s)_(?!_)", re.DOTALL), r"\1"),  # italic underscore
    (re.compile(r"`([^`]*)`"), r"\1"),  # inline code
    (re.compile(r"\[([^\]]+)\]\([^)]+\)"), r"\1"),  # links keep their label text
    (re.compile(r"(?m)^#{1,6}\s+"), ""),  # heading markers
    (re.compile(r"(?m)^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$"), ""),  # hr rules
]


def strip_markdown(content: str) -> str:
    for pattern, replacement in _MARKDOWN_PASSES:
        content = pattern.sub(replacement, content)
    # unbalanced leftovers (e.g. a lone opening marker) have no content meaning here
    return content.replace("*", "").replace("`", "")


class GroqChatClient:
    """Groq chat-completions client shared by every assistant surface."""

    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not settings.groq_chatbot_api_key:
            raise RuntimeError("GROQ_CHATBOT_API_KEY is not set; cannot start the Palay Assistant.")
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.groq_chatbot_base_url.rstrip("/"),
            timeout=settings.chat_request_timeout_seconds,
            headers={
                "Authorization": f"Bearer {settings.groq_chatbot_api_key}",
                "Content-Type": "application/json",
            },
            transport=transport,
        )

    async def complete(self, system_prompt: str, turns: list[ChatTurn]) -> str:
        payload: dict[str, Any] = {
            "model": self._settings.groq_chatbot_model,
            "messages": [{"role": "system", "content": system_prompt}]
            + [{"role": turn.role, "content": turn.content} for turn in turns],
            "max_tokens": self._settings.chat_max_tokens,
            "temperature": TEMPERATURE,
        }
        try:
            response = await self._client.post("/chat/completions", json=payload)
        except httpx.HTTPError as error:
            raise HTTPException(status_code=502, detail=UPSTREAM_UNAVAILABLE_MESSAGE) from error

        if response.status_code == 429:
            raise HTTPException(status_code=429, detail=UPSTREAM_BUSY_MESSAGE)
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=UPSTREAM_UNAVAILABLE_MESSAGE)

        data = response.json()
        choices = data.get("choices") or []
        content = ""
        if choices:
            content = (choices[0].get("message") or {}).get("content") or ""
        content = strip_markdown(content).strip()
        if not content:
            raise HTTPException(status_code=502, detail=UPSTREAM_UNAVAILABLE_MESSAGE)
        return content

    async def aclose(self) -> None:
        await self._client.aclose()
