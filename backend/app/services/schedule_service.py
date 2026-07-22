from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.schedule import Schedule
from app.services import calendar_service



def create_schedule(
    db: Session,
    *,
    candidate_name: str,
    candidate_email: str,
    hr_name: str,
    interview_role: str,
    scheduled_at: datetime,
    owner_id: str,
) -> dict:
    """Create a new interview schedule entry and persist it using SQLAlchemy.

    Returns a dict representation of the created Schedule.
    """
    schedule_id = str(uuid.uuid4())
    meeting_link = f"https://meet.example.com/{schedule_id}"
    schedule = Schedule(
        id=schedule_id,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        hr_name=hr_name,
        interview_role=interview_role,
        scheduled_at=scheduled_at,
        meeting_link=meeting_link,
        created_at=datetime.utcnow(),
        owner_id=owner_id,
    )
    try:
        event = calendar_service.add_event_to_calendar(
            summary=f"Interview: {candidate_name} with {hr_name}",
            description=f"Interview role: {interview_role}\nCandidate: {candidate_name}\nHR: {hr_name}",
            start_dt=scheduled_at,
            end_dt=scheduled_at + timedelta(hours=1),
        )
        if event:
            schedule.calendar_event_id = event.get("id")
            # Store the event URL for frontend button
            schedule.calendar_event_url = event.get("htmlLink")
    except Exception as e:
        print(f"[Schedule Service] Calendar integration failed: {e}")
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    # Return dict including calendar_event_url if present
    result = schedule.to_dict()
    if event and event.get("htmlLink"):
        result["calendar_event_url"] = event.get("htmlLink")
    return result
