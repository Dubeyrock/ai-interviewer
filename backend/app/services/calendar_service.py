import requests
from datetime import datetime
from app.core.config import settings


def _get_google_access_token() -> str | None:
    """Obtain an access token using the stored refresh token.

    Returns ``None`` if the required credentials are not configured.
    """
    if not (settings.google_client_id and settings.google_client_secret and settings.google_refresh_token):
        return None
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "refresh_token": settings.google_refresh_token,
        "grant_type": "refresh_token",
    }
    try:
        resp = requests.post(token_url, data=data, timeout=10)
        resp.raise_for_status()
        return resp.json().get("access_token")
    except Exception as e:
        print(f"[Calendar Service] Failed to obtain access token: {e}")
        return None


def add_event_to_calendar(
    summary: str,
    description: str,
    start_dt: datetime,
    end_dt: datetime,
) -> dict | None:
    """Create a Google Calendar event.

    Parameters
    ----------
    summary: str
        Title of the event.
    description: str
        Detailed description.
    start_dt, end_dt: datetime
        Event start and end times (UTC). The function converts them to ISO format.

    Returns
    -------
    dict | None
        The event payload returned by the Google Calendar API, or ``None`` on failure.
    """
    access_token = _get_google_access_token()
    if not access_token:
        # Mock event for demo when credentials are missing
        print("[Calendar Service] Google credentials missing – returning mock event")
        return {
            "id": "mock-event-id",
            "htmlLink": "https://calendar.google.com/mock-event",
            "summary": summary,
            "description": description,
            "start": {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": "UTC"},
        }
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    event_body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": "UTC"},
    }
    calendar_id = getattr(settings, "calendar_id", "primary") or "primary"
    url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
    try:
        resp = requests.post(url, headers=headers, json=event_body, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[Calendar Service] Failed to create event: {e}")
        return None
