from __future__ import annotations

from statistics import mean
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import TokenData, require_hr
from app.models.hr import Job
from app.models.candidate import Candidate
from app.models.interview import InterviewSession
from app.models.user import User
from app.models.company import Company
from tempfile import gettempdir
from pathlib import Path
import uuid

from app.services.invoice_generator import generate_invoice_pdf
from app.services.email_service import send_subscription_success_email, send_subscription_cancelled_email

router = APIRouter()

# -------------------------------------------------------------------
# Dashboard
# -------------------------------------------------------------------
@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _hr: TokenData = Depends(require_hr)):
    candidates = db.query(Candidate).all()
    
    fit_scores = [c.fit_score for c in candidates if c.fit_score is not None]
    average_score = round(mean(fit_scores), 2) if fit_scores else 0
    
    sorted_candidates = sorted(candidates, key=lambda c: c.fit_score or 0, reverse=True)
    top_candidates = [
        {
            "id": c.id,
            "name": c.full_name or c.email,
            "fit_score": c.fit_score,
            "status": c.status,
            "recommendation": c.recommendation,
        }
        for c in sorted_candidates[:5]
    ]

    selected = [c for c in candidates if c.recommendation == "SELECTED"]
    rejected = [c for c in candidates if c.recommendation == "REJECTED"]

    jobs = db.query(Job).all()
    active_jobs = [j for j in jobs if j.status and j.status.lower() == "active"]

    return {
        "candidate_count": len(candidates),
        "average_score": average_score,
        "selected_count": len(selected),
        "rejected_count": len(rejected),
        "job_count": len(jobs),
        "active_job_count": len(active_jobs),
        "top_candidates": top_candidates,
    }


# -------------------------------------------------------------------
# Candidate listing
# -------------------------------------------------------------------
@router.get("/candidates")
def list_candidates(db: Session = Depends(get_db), _hr: TokenData = Depends(require_hr)):
    rows = []
    candidates = db.query(Candidate).all()
    for c in candidates:
        session = db.query(InterviewSession).filter(InterviewSession.id == c.session_id).first() if c.session_id else None
        
        final_score = c.fit_score or 0
        if session and session.interview_scores:
            final_score = session.interview_scores.get("final_combined_score", final_score)

        rows.append({
            "session_id": c.session_id or "",
            "candidate_id": c.id,
            "candidate_name": c.full_name or "",
            "domain": c.domain or "",
            "job_role": c.job_role or "",
            "total_score": round(final_score, 2),
            "fit_score": c.fit_score or 0,
            "answers_count": len(session.answers) if session and session.answers else 0,
            "status": c.status or "screening",
            "recommendation": c.recommendation or "PENDING",
            "has_resume": bool(c.resume_path or c.resume_url),
        })
    return {"candidates": rows}


@router.get("/shortlisted")
def shortlisted(db: Session = Depends(get_db), _hr: TokenData = Depends(require_hr)):
    # Let's reuse the logic from list_candidates but filter it
    c_list = list_candidates(db, _hr)["candidates"]
    return {"candidates": [c for c in c_list if c["recommendation"] == "SELECTED"]}


@router.get("/rejected")
def rejected(db: Session = Depends(get_db), _hr: TokenData = Depends(require_hr)):
    c_list = list_candidates(db, _hr)["candidates"]
    return {"candidates": [c for c in c_list if c["recommendation"] == "REJECTED"]}


# -------------------------------------------------------------------
# Billing & Subscriptions (company / tenant scoped)
# -------------------------------------------------------------------
class SubscribeRequest(BaseModel):
    payment_method: str  # "card" or "upi"
    plan: str            # "growth"
    card_number: str | None = None
    upi_id: str | None = None


def _get_or_create_company(db: Session, user: User) -> Company:
    """Return the user's company tenant. If missing (e.g. legacy/seeded user),
    lazily create one so the subscription always lives at company level and is
    shared by every HR of that company."""
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        if company:
            return company
    company = Company(name=user.name or user.email, email=user.email)
    db.add(company)
    db.commit()
    db.refresh(company)
    user.company_id = company.id
    db.commit()
    return company


@router.get("/billing")
def get_billing(db: Session = Depends(get_db), hr_user: TokenData = Depends(require_hr)):
    user = db.query(User).filter(User.id == hr_user.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    company = _get_or_create_company(db, user)

    return {
        "company_name": company.name,
        "subscription_plan": company.subscription_plan or "starter",
        "subscription_status": company.subscription_status or "active",
        "subscription_ends_at": company.subscription_ends_at.isoformat() if company.subscription_ends_at else None,
    }


@router.post("/subscribe")
def subscribe(payload: SubscribeRequest, db: Session = Depends(get_db), hr_user: TokenData = Depends(require_hr)):
    user = db.query(User).filter(User.id == hr_user.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.payment_method == "card" and not payload.card_number:
        raise HTTPException(status_code=422, detail="Card details required")
    elif payload.payment_method == "upi" and not payload.upi_id:
        raise HTTPException(status_code=422, detail="UPI ID required")

    company = _get_or_create_company(db, user)

    # Simulate payment processing and upgrade the COMPANY plan to growth
    company.subscription_plan = payload.plan
    company.subscription_status = "active"
    company.subscription_ends_at = datetime.utcnow() + timedelta(days=30)
    db.commit()
    db.refresh(company)

    # Generate receipt / invoice PDF and send email
    try:
        txn_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"
        invoice_dir = Path(gettempdir()) / "ai_interviewer_invoices"
        invoice_dir.mkdir(parents=True, exist_ok=True)
        invoice_path = invoice_dir / f"{txn_id}.pdf"

        generate_invoice_pdf(
            output_path=str(invoice_path),
            user_name=company.name or "HR User",
            user_email=user.email,
            amount="2,999.00",
            txn_id=txn_id,
            plan_name=payload.plan
        )

        send_subscription_success_email(
            to_email=user.email,
            name=company.name or "HR User",
            amount="2,999.00",
            txn_id=txn_id,
            plan_name=payload.plan,
            invoice_pdf_path=str(invoice_path)
        )
    except Exception as email_err:
        print(f"[Subscribe Route] Failed to generate invoice/send success email: {email_err}")

    return {
        "success": True,
        "message": f"Successfully subscribed to {payload.plan.capitalize()} plan!",
        "subscription_plan": company.subscription_plan,
        "subscription_status": company.subscription_status,
        "subscription_ends_at": company.subscription_ends_at.isoformat() if company.subscription_ends_at else None,
    }


@router.post("/cancel-subscription")
def cancel_subscription(db: Session = Depends(get_db), hr_user: TokenData = Depends(require_hr)):
    user = db.query(User).filter(User.id == hr_user.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    company = _get_or_create_company(db, user)

    company.subscription_plan = "starter"
    company.subscription_status = "active"
    company.subscription_ends_at = None
    db.commit()
    db.refresh(company)

    # Send subscription cancelled email
    try:
        send_subscription_cancelled_email(
            to_email=user.email,
            name=company.name or "HR User"
        )
    except Exception as email_err:
        print(f"[Cancel Subscription Route] Failed to send cancellation email: {email_err}")

    return {
        "success": True,
        "message": "Subscription cancelled successfully.",
        "subscription_plan": company.subscription_plan,
        "subscription_status": company.subscription_status,
        "subscription_ends_at": None,
    }


