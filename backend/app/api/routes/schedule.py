from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user, TokenData
from app.core.database import get_db
from app.models.schedule import Schedule
from app.models.hr import Job
from datetime import datetime
import uuid

router = APIRouter()


@router.post("/")
def schedule_interview(
    data: dict,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    required = ["candidate_name", "candidate_email", "hr_name", "interview_role", "scheduled_at"]
    for field in required:
        if field not in data:
            raise HTTPException(status_code=422, detail=f"Missing field: {field}")

    try:
        scheduled_at = datetime.fromisoformat(data["scheduled_at"])
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date format.")

    meeting_link = f"https://meet.google.com/ai-{uuid.uuid4().hex[:8]}"
    schedule_id = str(uuid.uuid4())

    job = None
    job_id = data.get("job_id")
    if job_id:
        job = db.query(Job).filter(Job.id == str(job_id)).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

    new_schedule = Schedule(
        id=schedule_id,
        candidate_name=data["candidate_name"],
        candidate_email=data["candidate_email"],
        hr_name=data["hr_name"],
        interview_role=data["interview_role"],
        scheduled_at=scheduled_at,
        meeting_link=meeting_link,
        owner_id=current_user.email,
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)

    try:
        from app.services.email_service import send_schedule_email
        send_schedule_email(
            to_email=data["candidate_email"],
            candidate_name=data["candidate_name"],
            meeting_link=meeting_link,
            time=scheduled_at.isoformat(),
            hr_name=data["hr_name"],
            job_title=job.job_title if job else data["interview_role"],
            job_description=job.job_description if job else None,
            required_skills=job.required_skills if job else None,
            job_id=job.id if job else None,
        )
        email_status = "sent"
    except Exception as e:
        email_status = f"failed ({str(e)[:40]})"

    return {
        "message": "Interview Scheduled Successfully",
        "meeting_link": meeting_link,
        "scheduled_at": scheduled_at.isoformat(),
        "candidate_email": data["candidate_email"],
        "candidate_name": data["candidate_name"],
        "hr_name": data["hr_name"],
        "interview_role": data["interview_role"],
        "email_status": email_status,
        "schedule_id": schedule_id,
        "job_id": job_id,
    }


@router.get("/list")
def list_schedules(db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    schedules = db.query(Schedule).all()
    
    return {
        "schedules": [
            {
                "id": s.id,
                "candidate_name": s.candidate_name,
                "candidate_email": s.candidate_email,
                "hr_name": s.hr_name,
                "interview_role": s.interview_role,
                "scheduled_at": s.scheduled_at.isoformat(),
                "meeting_link": s.meeting_link,
                "owner_id": s.owner_id,
                "status": "scheduled",
            } for s in schedules
        ],
        "total": len(schedules)
    }