from __future__ import annotations

from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenData, require_hr
from app.models.hr import Job

router = APIRouter()


# -------------------------------------------------------------------
# Job models
# -------------------------------------------------------------------
class JobCreate(BaseModel):
    job_title: str = Field(..., min_length=2)
    domain: str = Field(..., min_length=2)
    job_description: str = Field(..., min_length=5)
    required_skills: list[str] = Field(default_factory=list)
    experience_level: str = "Fresher"
    assign_candidate_email: Optional[str] = None
    interview_language: str = "English"
    interview_difficulty: str = "Medium"
    status: str = "Active"
    technical_weight: int = 70
    behavioral_weight: int = 30


class JobUpdate(BaseModel):
    job_title: Optional[str] = None
    domain: Optional[str] = None
    job_description: Optional[str] = None
    required_skills: Optional[list[str]] = None
    experience_level: Optional[str] = None
    assign_candidate_email: Optional[str] = None
    interview_language: Optional[str] = None
    interview_difficulty: Optional[str] = None
    status: Optional[str] = None
    technical_weight: Optional[int] = None
    behavioral_weight: Optional[int] = None


def _job_invite_link(job_id: str) -> str:
    return f"http://localhost:5173/register?jobId={job_id}"


def _serialize_job(job: Job) -> dict[str, Any]:
    return {
        "id": job.id,
        "job_title": job.job_title,
        "domain": job.domain,
        "job_description": job.job_description,
        "required_skills": job.required_skills or [],
        "experience_level": job.experience_level,
        "assign_candidate_email": job.assign_candidate_email,
        "interview_language": job.interview_language,
        "interview_difficulty": job.interview_difficulty,
        "technical_weight": job.technical_weight,
        "behavioral_weight": job.behavioral_weight,
        "status": job.status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        "invite_link": _job_invite_link(job.id),
    }


# -------------------------------------------------------------------
# Job routes
# -------------------------------------------------------------------
@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db), _hr: TokenData = Depends(require_hr)):
    jobs = db.query(Job).all()
    return {"jobs": [_serialize_job(j) for j in jobs]}


@router.get("/jobs/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == str(job_id)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _serialize_job(job)


@router.post("/jobs")
def create_job(payload: JobCreate, db: Session = Depends(get_db), _hr: TokenData = Depends(require_hr)):
    job_id = str(uuid4())
    
    new_job = Job(
        id=job_id,
        job_title=payload.job_title.strip(),
        domain=payload.domain.strip(),
        job_description=payload.job_description.strip(),
        required_skills=[s.strip() for s in payload.required_skills if s.strip()],
        experience_level=payload.experience_level.strip(),
        assign_candidate_email=str(payload.assign_candidate_email).strip() if payload.assign_candidate_email else None,
        interview_language=payload.interview_language.strip(),
        interview_difficulty=payload.interview_difficulty.strip(),
        status=payload.status.strip(),
        technical_weight=payload.technical_weight,
        behavioral_weight=payload.behavioral_weight,
    )
    
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Send invite email if an assign_candidate_email was provided
    try:
        if new_job.assign_candidate_email:
            from app.services.invite_service import send_job_invite
            send_job_invite(
                to_email=new_job.assign_candidate_email,
                job_title=new_job.job_title,
                job_description=new_job.job_description,
                required_skills=new_job.required_skills,
                invite_link=_job_invite_link(job_id),
                job_id=job_id,
            )
    except Exception as e:
        print(f"[Job Invite] Failed to send invite: {e}")

    return {
        "message": "Job created successfully",
        "id": job_id,
        "job": _serialize_job(new_job),
    }


@router.put("/jobs/{job_id}")
def update_job(job_id: str, payload: JobUpdate, db: Session = Depends(get_db), _hr: TokenData = Depends(require_hr)):
    job = db.query(Job).filter(Job.id == str(job_id)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "required_skills" and value is not None:
            job.required_skills = [s.strip() for s in value if s.strip()]
        elif key == "assign_candidate_email" and value is not None:
            job.assign_candidate_email = str(value).strip()
        elif value is not None:
            setattr(job, key, value)

    db.commit()
    db.refresh(job)

    # If a candidate email is assigned, attempt to send invite
    try:
        if job.assign_candidate_email:
            from app.services.invite_service import send_job_invite
            send_job_invite(
                to_email=job.assign_candidate_email,
                job_title=job.job_title,
                job_description=job.job_description,
                required_skills=job.required_skills,
                invite_link=_job_invite_link(job.id),
                job_id=job.id,
            )
    except Exception as e:
        print(f"[Job Invite] Failed to send invite on update: {e}")

    return {
        "message": "Job updated successfully",
        "job": _serialize_job(job),
    }


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db), _hr: TokenData = Depends(require_hr)):
    job = db.query(Job).filter(Job.id == str(job_id)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()

    return {
        "message": "Job deleted successfully",
        "job": _serialize_job(job),
    }
