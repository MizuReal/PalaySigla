import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.assessment import get_assessment_advisor
from app.core.auth import get_current_user
from app.core.config import Settings
from app.main import create_app
from app.models.assessment import AssessmentAdviceContext, AssessmentAdviceRequest
from app.models.chat import ChatTurn
from app.services.assessment_advice import (
    ADVICE_OFF_TOPIC_REPLY,
    OPENING_INSTRUCTION,
    AssessmentAdvisor,
)
from tests.assessment_fixtures import FakeDetector
from tests.scan_fixtures import FakeDigitClassifier

GROQ_PAYLOAD = {"choices": [{"message": {"content": "Tuyuin hanggang 14% moisture."}}]}
ENDPOINT = "/api/assessments/advice"

CONTEXT = AssessmentAdviceContext(
    defect_rate=0.005,
    counts={"mold_discoloration": 2},
    highest_confidence=0.82,
    lowest_confidence=0.64,
)


def make_advisor(handler, **overrides) -> AssessmentAdvisor:
    settings = Settings(groq_chatbot_api_key="test-key", **overrides)
    transport = httpx.MockTransport(handler)
    return AssessmentAdvisor(settings, transport=transport)


def user_turn(content: str) -> ChatTurn:
    return ChatTurn(role="user", content=content)


def opening_turn() -> ChatTurn:
    return ChatTurn(role="assistant", content="Mukhang okay ang sample.")


async def test_opening_analysis_grounds_the_prompt_in_the_scan():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["payload"] = httpx.Response(200, content=request.read()).json()
        return httpx.Response(200, json=GROQ_PAYLOAD)

    advisor = make_advisor(handler)
    reply = await advisor.advise(
        AssessmentAdviceRequest(
            assessment=CONTEXT,
            messages=[],
            language="tagalog",
        )
    )

    assert reply == "Tuyuin hanggang 14% moisture."
    system_prompt = seen["payload"]["messages"][0]["content"]
    assert "Quality status: good" in system_prompt
    assert "Severity: low" in system_prompt
    assert "Flagged areas: 2" in system_prompt
    assert "Mold / discoloration: 2" in system_prompt
    assert "Coverage definition" in system_prompt
    assert "amag (mold)" in system_prompt
    assert "written in Tagalog" in system_prompt
    assert "market grade, variety" in system_prompt
    assert seen["payload"]["messages"][-1] == {
        "role": "user",
        "content": OPENING_INSTRUCTION,
    }


async def test_clean_sample_prompt_reports_no_flagged_areas():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["payload"] = httpx.Response(200, content=request.read()).json()
        return httpx.Response(200, json=GROQ_PAYLOAD)

    advisor = make_advisor(handler)
    clean = AssessmentAdviceContext(defect_rate=0.0, counts={"mold_discoloration": 0})

    await advisor.advise(AssessmentAdviceRequest(assessment=clean, messages=[]))

    system_prompt = seen["payload"]["messages"][0]["content"]
    assert "Quality status: premium" in system_prompt
    assert "Flagged areas: 0" in system_prompt
    assert "Detected classes: none" in system_prompt
    assert "Needs review: no" in system_prompt
    assert "sample looks okay" in system_prompt


async def test_short_context_question_reaches_the_model_with_history():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["payload"] = httpx.Response(200, content=request.read()).json()
        return httpx.Response(200, json=GROQ_PAYLOAD)

    advisor = make_advisor(handler)
    turns = [opening_turn(), user_turn("Bakit?")]

    await advisor.advise(AssessmentAdviceRequest(assessment=CONTEXT, messages=turns))

    assert seen["payload"]["messages"][-1] == {"role": "user", "content": "Bakit?"}
    assert seen["payload"]["messages"][-2] == {
        "role": "assistant",
        "content": "Mukhang okay ang sample.",
    }


async def test_context_reference_follow_up_reaches_the_model():
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(200, json=GROQ_PAYLOAD)

    advisor = make_advisor(handler)

    await advisor.advise(
        AssessmentAdviceRequest(
            assessment=CONTEXT,
            messages=[opening_turn(), user_turn("Paano ko ito iimbak?")],
        )
    )

    assert request_count == 1


async def test_topic_word_follow_up_reaches_the_model():
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(200, json=GROQ_PAYLOAD)

    advisor = make_advisor(handler)

    await advisor.advise(
        AssessmentAdviceRequest(
            assessment=CONTEXT,
            messages=[opening_turn(), user_turn("May amag pa ba ito?")],
        )
    )

    assert request_count == 1


async def test_long_off_topic_message_is_refused_without_upstream_call():
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("off-topic messages must never reach Groq")

    advisor = make_advisor(handler)

    reply = await advisor.advise(
        AssessmentAdviceRequest(
            assessment=CONTEXT,
            messages=[opening_turn(), user_turn("Can you write me a resume?")],
        )
    )

    assert reply == ADVICE_OFF_TOPIC_REPLY


def test_unknown_class_key_is_rejected():
    with pytest.raises(ValidationError):
        AssessmentAdviceContext(defect_rate=0.0, counts={"rust": 1})


def test_flagged_area_count_cannot_exceed_the_detector_limit():
    with pytest.raises(ValidationError):
        AssessmentAdviceContext(
            defect_rate=1.0,
            counts={"mold_discoloration": 301},
        )


def test_confidence_range_must_be_consistent():
    with pytest.raises(ValidationError):
        AssessmentAdviceContext(
            defect_rate=0.0,
            counts={"mold_discoloration": 0},
            highest_confidence=0.4,
        )
    with pytest.raises(ValidationError):
        AssessmentAdviceContext(
            defect_rate=0.0,
            counts={"mold_discoloration": 0},
            highest_confidence=0.4,
            lowest_confidence=0.8,
        )


def test_messages_must_end_with_a_user_turn():
    with pytest.raises(ValidationError):
        AssessmentAdviceRequest(
            assessment=CONTEXT,
            messages=[opening_turn()],
        )


async def test_model_markdown_is_stripped():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "**Tuyuin** ang palay."}}]},
        )

    advisor = make_advisor(handler)
    reply = await advisor.advise(AssessmentAdviceRequest(assessment=CONTEXT, messages=[]))

    assert reply == "Tuyuin ang palay."


async def test_upstream_429_is_mapped_to_429():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, text="rate limited")

    advisor = make_advisor(handler)

    with pytest.raises(HTTPException) as exc_info:
        await advisor.advise(AssessmentAdviceRequest(assessment=CONTEXT, messages=[]))
    assert exc_info.value.status_code == 429


class FakeAdvisor:
    async def advise(self, payload: AssessmentAdviceRequest) -> str:
        return "Tuyuin ang palay bago iimbak."


@pytest.fixture
def client():
    app = create_app(
        scan_engine=FakeDigitClassifier(),
        detector=FakeDetector(),
    )
    app.dependency_overrides[get_current_user] = lambda: "user-1"
    app.dependency_overrides[get_assessment_advisor] = lambda: FakeAdvisor()
    with TestClient(app) as test_client:
        yield test_client


def test_advice_api_returns_the_envelope(client):
    response = client.post(
        ENDPOINT,
        json={
            "assessment": {
                "defect_rate": 0.005,
                "counts": {"mold_discoloration": 2},
                "highest_confidence": 0.82,
                "lowest_confidence": 0.64,
            },
            "messages": [],
            "language": "english",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "data": {"reply": "Tuyuin ang palay bago iimbak."},
        "error": None,
    }


def test_advice_api_requires_auth():
    app = create_app(
        scan_engine=FakeDigitClassifier(),
        detector=FakeDetector(),
    )
    with TestClient(app) as anonymous_client:
        response = anonymous_client.post(
            ENDPOINT,
            json={"assessment": {"defect_rate": 0.0, "counts": {"mold_discoloration": 0}}},
        )

    assert response.status_code == 401


def test_advice_api_rejects_unknown_class_keys(client):
    response = client.post(
        ENDPOINT,
        json={"assessment": {"defect_rate": 0.0, "counts": {"rust": 1}}},
    )

    assert response.status_code == 422
