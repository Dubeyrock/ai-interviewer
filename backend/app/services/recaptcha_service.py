from __future__ import annotations

import httpx

from app.core.config import settings


def verify_recaptcha(token: str | None) -> bool:
    # If reCAPTCHA is disabled (no secret key), allow registration without token
    if not settings.recaptcha_secret_key:
        return True
    # If reCAPTCHA is enabled but token is missing, reject
    if not token:
        return False

    try:
        response = httpx.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={"secret": settings.recaptcha_secret_key, "response": token},
            timeout=10.0,
        )
        response.raise_for_status()
        payload = response.json()
        return bool(payload.get("success"))
    except Exception:
        return False
