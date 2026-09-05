import httpx
import pytest
from fastapi import HTTPException

from app.core.auth import SupabaseAuthClient, extract_bearer_token
from app.core.config import Settings

SETTINGS = {
    "supabase_url": "https://project-ref.supabase.co",
    "supabase_service_role_key": "service-role-key",
}


def make_auth_client(handler, **overrides) -> SupabaseAuthClient:
    settings = Settings(**{**SETTINGS, **overrides})
    transport = httpx.MockTransport(handler)
    return SupabaseAuthClient(settings, transport=transport)


def test_extract_bearer_token_parses_header():
    assert extract_bearer_token("Bearer abc.def.ghi") == "abc.def.ghi"
    assert extract_bearer_token("bearer abc") == "abc"
    assert extract_bearer_token("Basic abc") is None
    assert extract_bearer_token("") is None
    assert extract_bearer_token(None) is None


def test_service_role_key_reads_canonical_env_name(monkeypatch):
    monkeypatch.delenv("SUPABASE_SECRET_KEY", raising=False)
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "canonical-value")

    settings = Settings(_env_file=None)

    assert settings.supabase_service_role_key == "canonical-value"


def test_service_role_key_accepts_secret_key_alias(monkeypatch):
    # a deployment that names the key SUPABASE_SECRET_KEY must still resolve
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "sb_secret_alias_value")

    settings = Settings(_env_file=None)

    assert settings.supabase_service_role_key == "sb_secret_alias_value"


async def test_get_user_id_validates_token_and_returns_id():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["apikey"] = request.headers.get("apikey")
        seen["auth"] = request.headers.get("authorization")
        return httpx.Response(200, json={"id": "user-123", "email": "a@b.ph"})

    client = make_auth_client(handler)

    user_id = await client.get_user_id("valid.jwt.token")

    assert user_id == "user-123"
    assert seen["url"].endswith("/auth/v1/user")
    assert seen["apikey"] == "service-role-key"
    assert seen["auth"] == "Bearer valid.jwt.token"


async def test_get_user_id_rejects_invalid_token():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"code": "bad_jwt"})

    client = make_auth_client(handler)

    with pytest.raises(HTTPException) as exc_info:
        await client.get_user_id("expired.jwt")
    assert exc_info.value.status_code == 401


async def test_get_user_id_rejects_expired_token_as_400():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"code": "token_not_found"})

    client = make_auth_client(handler)

    with pytest.raises(HTTPException) as exc_info:
        await client.get_user_id("unknown.jwt")
    assert exc_info.value.status_code == 401


async def test_get_user_id_rejects_malformed_token_as_403():
    # Supabase answers bad_jwt with 403; that is an invalid session, not an outage
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={"code": 403, "error_code": "bad_jwt"})

    client = make_auth_client(handler)

    with pytest.raises(HTTPException) as exc_info:
        await client.get_user_id("malformed.jwt")
    assert exc_info.value.status_code == 401


async def test_get_user_id_raises_503_when_supabase_unreachable():
    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("network down")

    client = make_auth_client(handler)

    with pytest.raises(HTTPException) as exc_info:
        await client.get_user_id("valid.jwt")
    assert exc_info.value.status_code == 503


async def test_get_user_id_raises_503_when_not_configured():
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("no request should be made without configuration")

    client = make_auth_client(handler, supabase_url="", supabase_service_role_key="")

    with pytest.raises(HTTPException) as exc_info:
        await client.get_user_id("any.jwt")
    assert exc_info.value.status_code == 503
