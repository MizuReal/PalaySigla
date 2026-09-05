import httpx
from fastapi import Header, HTTPException

from app.core.config import Settings, get_settings

AUTH_REQUEST_TIMEOUT_SECONDS = 10.0

_SESSION_INVALID_MESSAGE = "Your session is invalid or has expired. Please sign in again."
_AUTH_UNAVAILABLE_MESSAGE = (
    "Sign-in is not available on this server right now. Please try again shortly."
)


class SupabaseAuthClient:
    """Validates Supabase JWTs server-side using the service role key."""

    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = settings.supabase_url.rstrip("/")
        self._service_role_key = settings.supabase_service_role_key
        self._client = httpx.AsyncClient(
            timeout=AUTH_REQUEST_TIMEOUT_SECONDS,
            headers={
                "apikey": self._service_role_key,
                "Accept": "application/json",
            },
            transport=transport,
        )

    async def get_user_id(self, token: str) -> str:
        if not self._base_url or not self._service_role_key:
            raise HTTPException(status_code=503, detail=_AUTH_UNAVAILABLE_MESSAGE)
        try:
            response = await self._client.get(
                f"{self._base_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}"},
            )
        except httpx.HTTPError as error:
            raise HTTPException(status_code=503, detail=_AUTH_UNAVAILABLE_MESSAGE) from error

        # Supabase reports malformed/expired/unknown JWTs as 400, 401, or 403 bad_jwt
        if response.status_code in (400, 401, 403):
            raise HTTPException(status_code=401, detail=_SESSION_INVALID_MESSAGE)
        if response.status_code != 200:
            raise HTTPException(status_code=503, detail=_AUTH_UNAVAILABLE_MESSAGE)

        payload = response.json()
        user_id = payload.get("id") if isinstance(payload, dict) else None
        if not user_id:
            raise HTTPException(status_code=401, detail=_SESSION_INVALID_MESSAGE)
        return str(user_id)

    async def aclose(self) -> None:
        await self._client.aclose()


_auth_client: SupabaseAuthClient | None = None


def _get_auth_client() -> SupabaseAuthClient:
    global _auth_client
    if _auth_client is None:
        _auth_client = SupabaseAuthClient(get_settings())
    return _auth_client


def extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> str:
    """FastAPI dependency returning the authenticated Supabase user id."""
    token = extract_bearer_token(authorization)
    if token is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to continue.",
        )
    return await _get_auth_client().get_user_id(token)
