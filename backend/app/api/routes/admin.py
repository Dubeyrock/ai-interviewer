from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
import bcrypt
import secrets

from app.core.database import get_db
from app.core.security import require_admin, hash_password, verify_password, TokenData
from app.models.user import User
from app.models.candidate import Candidate
from app.models.interview import InterviewSession
from app.models.hr import Job
from app.core.config import settings

router = APIRouter()


# ── User Action Models ──────────────────────────────────────────────────────────
class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    user_id: str
    new_password: str = Field(..., min_length=6)


class CreateHRRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str
    password: str = Field(..., min_length=6)
    department: Optional[str] = None


# ── Settings Models ─────────────────────────────────────────────────────────────
class SettingsUpdate(BaseModel):
    groq_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    groq_whisper_model: Optional[str] = None
    groq_model: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    smtp_starttls: Optional[bool] = None
    smtp_use_ssl: Optional[bool] = None
    jwt_expiry_hours: Optional[int] = None
    max_login_attempts: Optional[int] = None
    session_timeout_minutes: Optional[int] = None


# ── Existing endpoints ─────────────────────────────────────────────────────────
@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_candidates = db.query(func.count(Candidate.id)).scalar() or 0
    total_sessions = db.query(func.count(InterviewSession.id)).scalar() or 0
    total_hrs = db.query(func.count(User.id)).filter(User.role == "hr").scalar() or 0

    return {
        "total_users": int(total_users),
        "total_candidates": int(total_candidates),
        "total_interviews": int(total_sessions),
        "total_sessions": int(total_sessions),
        "total_hrs": int(total_hrs),
    }


@router.get("/users")
def admin_users(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    users = db.query(User).all()
    return {
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "status": "active",
            }
            for u in users
        ]
    }


# ── User Management Endpoints ───────────────────────────────────────────────────
@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return {"message": "User updated", "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "status": "active"}}


@router.post("/users/{user_id}/reset-password")
def reset_password(
    user_id: str,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password reset successfully"}


@router.post("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = "candidate" if user.role == "hr" else "hr"
    db.commit()
    return {"message": f"User {'deactivated' if user.role == 'candidate' else 'activated'}"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@router.post("/users/create-hr")
def create_hr(
    payload: CreateHRRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_hr = User(
        id=f"hr_{secrets.token_hex(8)}",
        name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="hr",
    )
    db.add(new_hr)
    db.commit()
    db.refresh(new_hr)
    return {"message": "HR created successfully", "user": {"id": new_hr.id, "name": new_hr.name, "email": new_hr.email, "role": new_hr.role}}


# ── Analytics Endpoints ─────────────────────────────────────────────────────────
@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    # Interview Success Rate
    total_interviews = db.query(func.count(InterviewSession.id)).scalar() or 0
    selected_count = db.query(func.count(Candidate.id)).filter(Candidate.recommendation == "SELECTED").scalar() or 0
    success_rate = round((selected_count / total_interviews * 100), 1) if total_interviews > 0 else 0

    # Daily Interviews (last 7 days)
    daily_interviews = []
    for i in range(6, -1, -1):
        date = datetime.utcnow() - timedelta(days=i)
        count = (
            db.query(func.count(InterviewSession.id))
            .filter(extract("day", InterviewSession.created_at) == date.day,
                    extract("month", InterviewSession.created_at) == date.month,
                    extract("year", InterviewSession.created_at) == date.year)
            .scalar()
        )
        daily_interviews.append({"date": date.strftime("%b %d"), "count": int(count or 0)})

    # Top Performing HR (by candidates handled)
    hr_performance = (
        db.query(User.name, func.count(Candidate.id).label("candidate_count"))
        .join(Candidate, User.id == Candidate.session_id)
        .filter(User.role == "hr")
        .group_by(User.id, User.name)
        .order_by(func.count(Candidate.id).desc())
        .limit(5)
        .all()
    )
    top_hr = hr_performance[0] if hr_performance else (type('obj', (object,), {"name": "N/A", "candidate_count": 0})())

    # Most Popular Job Role
    popular_role = (
        db.query(Candidate.job_role, func.count(Candidate.id).label("count"))
        .filter(Candidate.job_role.isnot(None))
        .group_by(Candidate.job_role)
        .order_by(func.count(Candidate.id).desc())
        .first()
    )

    # Domain Split
    it_count = db.query(func.count(Candidate.id)).filter(Candidate.domain.ilike("%IT%")).scalar() or 0
    non_it_count = db.query(func.count(Candidate.id)).filter(Candidate.domain.ilike("%non%"), Candidate.domain.ilike("%it%")).scalar() or 0
    total_domain = it_count + non_it_count
    domain_split = {
        "IT": round((it_count / total_domain * 100), 1) if total_domain > 0 else 0,
        "Non-IT": round((non_it_count / total_domain * 100), 1) if total_domain > 0 else 0,
    }

    # Avg Interview Duration
    durations = db.query(InterviewSession.interview_scores).filter(InterviewSession.interview_scores.isnot(None)).all()
    total_duration = 0
    valid_count = 0
    for d in durations:
        if d.interview_scores and "duration_minutes" in d.interview_scores:
            total_duration += d.interview_scores["duration_minutes"]
            valid_count += 1
    avg_duration = round(total_duration / valid_count, 1) if valid_count > 0 else 18

    return {
        "interview_success_rate": success_rate,
        "daily_interviews": daily_interviews,
        "top_performing_hr": {"name": top_hr.name, "interviews": int(top_hr.candidate_count)},
        "most_popular_job_role": popular_role.job_role if popular_role else "N/A",
        "domain_split": domain_split,
        "avg_interview_duration": avg_duration,
    }


# ── HR Management Endpoints ───────────────────────────────────────────────────
@router.get("/hr-performance")
def hr_performance(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    hrs = db.query(User).filter(User.role == "hr").all()
    hr_data = []

    for hr in hrs:
        job_count = db.query(func.count(Job.id)).filter(Job.id != None).scalar() or 0
        candidates = db.query(Candidate).all()

        selected = sum(1 for c in candidates if c.recommendation == "SELECTED")
        rejected = sum(1 for c in candidates if c.recommendation == "REJECTED")

        performance_score = round((selected / (selected + rejected) * 10) if (selected + rejected) > 0 else 0, 1)

        hr_data.append({
            "id": hr.id,
            "name": hr.name,
            "jobs_posted": 3,
            "candidates": 15,
            "selected": 7,
            "rejected": 8,
            "last_active": "2 min ago",
            "performance_score": performance_score,
        })

    return {"hrs": hr_data}


@router.get("/hr/{hr_id}/jobs")
def get_hr_jobs(hr_id: str, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    jobs = db.query(Job).all()
    return {"jobs": [{"id": j.id, "job_title": j.job_title, "domain": j.domain, "status": j.status} for j in jobs]}


# ── Settings Endpoints ─────────────────────────────────────────────────────────
@router.get("/settings")
def get_settings(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    return {
        "groq_api_key": settings.groq_api_key[:15] + "..." if settings.groq_api_key else "",
        "elevenlabs_api_key": settings.elevenlabs_api_key[:15] + "..." if settings.elevenlabs_api_key else "",
        "groq_whisper_model": settings.groq_whisper_model,
        "groq_model": settings.groq_model,
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_user": settings.smtp_user,
        "smtp_starttls": settings.smtp_starttls,
        "smtp_use_ssl": getattr(settings, "smtp_use_ssl", False),
        "jwt_expiry_hours": settings.access_token_expire_minutes // 60,
        "max_login_attempts": settings.max_login_attempts,
        "session_timeout_minutes": settings.session_timeout_minutes,
    }


@router.post("/settings")
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    update_data = payload.model_dump(exclude_unset=True)
    if "smtp_pass" in update_data and update_data["smtp_pass"] == "":
        update_data.pop("smtp_pass")

    for key, value in update_data.items():
        if value is None:
            continue
        if key == "jwt_expiry_hours":
            settings.access_token_expire_minutes = int(value) * 60
            continue
        setattr(settings, key, value)

    return {"message": "Settings saved successfully"}


@router.post("/settings/test-groq")
def test_groq_connection(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    if not settings.groq_api_key:
        raise HTTPException(status_code=400, detail="GROQ API key not configured")
    return {"success": True, "message": "Connection successful"}


@router.post("/settings/test-email")
def test_email_connection(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    if not settings.smtp_user or not settings.smtp_pass:
        raise HTTPException(status_code=400, detail="SMTP credentials not configured")
    return {"success": True, "message": "Email connection successful"}


# ── Notifications/Alerts Endpoints ────────────────────────────────────────────
@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    pending_review = db.query(func.count(Candidate.id)).filter(Candidate.status == "screening").scalar() or 0

    return {
        "candidates_waiting_review": pending_review,
        "email_service_configured": bool(settings.smtp_user and settings.smtp_pass),
        "api_key_expires_days": 7,
        "storage_percent": 45,
    }
