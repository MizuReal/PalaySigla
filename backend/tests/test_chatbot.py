import httpx
import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.models.chat import ChatTurn
from app.services.chatbot import OFF_TOPIC_REPLY, Chatbot

GROQ_PAYLOAD = {"choices": [{"message": {"content": "Tuyuin hanggang 14% moisture."}}]}


def make_chatbot(handler, **overrides) -> Chatbot:
    settings = Settings(groq_chatbot_api_key="test-key", **overrides)
    transport = httpx.MockTransport(handler)
    return Chatbot(settings, transport=transport)


def user_turn(content: str) -> ChatTurn:
    return ChatTurn(role="user", content=content)


async def test_off_topic_returns_canned_reply_without_upstream_call():
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("off-topic messages must never reach Groq")

    chatbot = make_chatbot(handler)

    reply = await chatbot.respond([user_turn("Paano gumawa ng palayok?")])

    assert reply == OFF_TOPIC_REPLY


async def test_off_topic_english_question_is_refused():
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("off-topic messages must never reach Groq")

    chatbot = make_chatbot(handler)

    reply = await chatbot.respond([user_turn("Can you write me a resume?")])

    assert reply == OFF_TOPIC_REPLY


async def test_in_scope_question_hits_groq_with_system_prompt_and_auth():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("authorization")
        seen["payload"] = request.read()
        return httpx.Response(200, json=GROQ_PAYLOAD)

    chatbot = make_chatbot(handler)

    reply = await chatbot.respond([user_turn("Paano mag-imbak ng palay?")])

    assert reply == "Tuyuin hanggang 14% moisture."
    assert seen["url"].endswith("/chat/completions")
    assert seen["auth"] == "Bearer test-key"
    payload = httpx.Response(200, content=seen["payload"]).json()
    assert payload["model"] == "openai/gpt-oss-20b"
    assert payload["messages"][0]["role"] == "system"
    assert "ALLOWED SCOPE" in payload["messages"][0]["content"]
    assert "Plain text only" in payload["messages"][0]["content"]
    assert payload["messages"][-1] == {"role": "user", "content": "Paano mag-imbak ng palay?"}


async def test_greeting_is_forwarded_to_model():
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(200, json=GROQ_PAYLOAD)

    chatbot = make_chatbot(handler)

    await chatbot.respond([user_turn("Kumusta!")])

    assert request_count == 1


async def test_short_follow_up_after_in_scope_history_is_allowed():
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(200, json=GROQ_PAYLOAD)

    chatbot = make_chatbot(handler)

    turns = [
        user_turn("Saan ko ilalagay ang bigas? May amag na."),
        ChatTurn(role="assistant", content="Iimbak sa tuyo at malamig na lugar."),
        user_turn("Paano pa?"),
    ]
    await chatbot.respond(turns)

    assert request_count == 1


async def test_short_follow_up_without_in_scope_history_is_canned():
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("context-free short messages must not reach Groq")

    chatbot = make_chatbot(handler)

    turns = [
        user_turn("Ano ang paborito mong pelikula?"),
        ChatTurn(role="assistant", content="Hindi ko po alam iyan."),
        user_turn("Bakit?"),
    ]
    reply = await chatbot.respond(turns)

    assert reply == OFF_TOPIC_REPLY


async def test_plurals_and_typos_in_topic_words_stay_in_scope():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=GROQ_PAYLOAD)

    chatbot = make_chatbot(handler)

    await chatbot.respond([user_turn("May bukbok ang bigas ko")])
    await chatbot.respond([user_turn("magkano benta ng palay?")])


async def test_history_is_trimmed_to_configured_limit():
    seen_messages = []

    def handler(request: httpx.Request) -> httpx.Response:
        payload = httpx.Response(200, content=request.read()).json()
        seen_messages.extend(payload["messages"])
        return httpx.Response(200, json=GROQ_PAYLOAD)

    chatbot = make_chatbot(handler, chat_history_max_messages=2)

    turns = [
        user_turn("Saan maganda mag-imbak ng palay?"),
        ChatTurn(role="assistant", content="Sa tuyong bodega."),
        user_turn("Paano pa maiingatan ang bigas?"),
    ]
    await chatbot.respond(turns)

    user_messages = [m for m in seen_messages if m["role"] != "system"]
    assert user_messages == [
        {"role": "assistant", "content": "Sa tuyong bodega."},
        {"role": "user", "content": "Paano pa maiingatan ang bigas?"},
    ]


async def test_model_markdown_is_stripped_to_plain_text():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": (
                                "**Kontrolin ang moisture**\n"
                                "## Hakbang\n"
                                "- dapat `14%` lang\n"
                                "*italiko* at _salungguhit_\n"
                                "Tingnan ang [PhilRice](https://www.philrice.gov.ph)."
                            )
                        }
                    }
                ]
            },
        )

    chatbot = make_chatbot(handler)

    reply = await chatbot.respond([user_turn("Paano mag-imbak ng palay?")])

    assert reply == (
        "Kontrolin ang moisture\n"
        "Hakbang\n"
        "- dapat 14% lang\n"
        "italiko at salungguhit\n"
        "Tingnan ang PhilRice."
    )
    assert "**" not in reply
    assert "`" not in reply
    assert "[" not in reply


async def test_plain_reply_passes_through_unchanged():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": (
                                "1. Tuyuin hanggang 13-15 % moisture.\n"
                                "2. Iimbak sa malinis at tuyong sako.\n"
                                "Kung may tanong pa, magtanong lang!"
                            )
                        }
                    }
                ]
            },
        )

    chatbot = make_chatbot(handler)

    reply = await chatbot.respond([user_turn("Paano mag-imbak ng palay?")])

    assert reply == (
        "1. Tuyuin hanggang 13-15 % moisture.\n"
        "2. Iimbak sa malinis at tuyong sako.\n"
        "Kung may tanong pa, magtanong lang!"
    )


async def test_upstream_429_raises_429():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, text="rate limited")

    chatbot = make_chatbot(handler)

    with pytest.raises(HTTPException) as exc_info:
        await chatbot.respond([user_turn("Paano patuyuin ang palay?")])
    assert exc_info.value.status_code == 429


async def test_upstream_500_raises_502():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="boom")

    chatbot = make_chatbot(handler)

    with pytest.raises(HTTPException) as exc_info:
        await chatbot.respond([user_turn("Paano patuyuin ang palay?")])
    assert exc_info.value.status_code == 502


async def test_empty_model_content_raises_502():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": [{"message": {"content": "  "}}]})

    chatbot = make_chatbot(handler)

    with pytest.raises(HTTPException) as exc_info:
        await chatbot.respond([user_turn("Paano patuyuin ang palay?")])
    assert exc_info.value.status_code == 502


async def test_constructor_requires_api_key():
    with pytest.raises(RuntimeError):
        Chatbot(Settings(groq_chatbot_api_key=""))


def test_chat_request_rejects_system_role_and_non_user_last_turn():
    from pydantic import ValidationError

    from app.models.chat import ChatRequest

    with pytest.raises(ValidationError):
        ChatRequest(messages=[user_turn("palay"), ChatTurn(role="system", content="hack")])
    with pytest.raises(ValidationError):
        ChatRequest(
            messages=[
                user_turn("palay"),
                ChatTurn(role="assistant", content="sagot"),
            ]
        )
    with pytest.raises(ValidationError):
        ChatRequest(messages=[])
