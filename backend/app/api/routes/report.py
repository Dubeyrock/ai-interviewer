from __future__ import annotations

from pathlib import Path
from tempfile import gettempdir
import uuid

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import
# pyrefly: ignore [missing-import]
from app.core.database import get_db
# pyrefly: ignore [missing-import]
from app.models.report import ReportCreateRequest, ReportCreateResponse
# pyrefly: ignore [missing-import]
from app.models.candidate import Candidate
# pyrefly: ignore [missing-import]
from app.models.interview import InterviewSession
# pyrefly: ignore [missing-import]
from app.services.hiring_decision_engine import decide_hiring
# pyrefly: ignore [missing-import]
from app.services.report_generator import generate_pdf_report

router = APIRouter()


@router.post("/generate", response_model=ReportCreateResponse)
def generate_report(payload: ReportCreateRequest, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    candidate = db.query(Candidate).filter(Candidate.id == session.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    emotions = session.emotions or []
    emotion_scores = [item.get("confidence", 0) * 10 for item in emotions if isinstance(item, dict)]

    decision = decide_hiring(
        fit_score=float(candidate.fit_score or 0),
        interview_scores=session.scores or [],
        emotion_scores=emotion_scores,
        experience_text=candidate.experience or "",
    )

    report_id = str(uuid.uuid4())
    output_path = Path(gettempdir()) / "ai_interviewer_reports" / f"{report_id}.pdf"
    
    # We pass dict representations because generate_pdf_report expects dictionaries or similar objects
    # that can be accessed with .get() or attributes depending on implementation.
    # It seems originally it was passing memory_db dicts.
    
    # Convert SQLAlchemy model to dict for compatibility
    candidate_dict = {
        "id": candidate.id,
        "full_name": candidate.full_name,
        "email": candidate.email,
        "phone": candidate.phone,
        "location": candidate.location,
        "experience": candidate.experience,
        "current_company": candidate.current_company,
        "current_salary": getattr(candidate, "current_salary", None),
        "expected_salary": candidate.expected_salary,
        "domain": candidate.domain,
        "job_role": candidate.job_role,
        "skills": candidate.skills,
        "linkedin": candidate.linkedin,
        "github": candidate.github,
        "resume_text": candidate.resume_text,
        "created_at": candidate.created_at,
    }
    
    session_dict = {
        "id": session.id,
        "answers": session.answers,
        "questions": session.questions,
        "scores": session.scores,
        "interview_scores": session.interview_scores,
    }

    file_path = generate_pdf_report(
        output_path=str(output_path),
        candidate=candidate_dict,
        session=session_dict,
        decision={
            "final_score": decision.final_score,
            "recommendation": decision.recommendation,
            "strengths": decision.strengths,
            "weaknesses": decision.weaknesses,
        },
    )
    
    candidate.report_id = report_id
    candidate.report_path = str(file_path)
    db.commit()
    
    return ReportCreateResponse(
        report_id=report_id, 
        file_path=str(file_path), 
        recommendation=decision.recommendation, 
        final_score=decision.final_score
    )


@router.get("/{report_id}/download")
def download_report(report_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.report_id == report_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Report not found")
        
    path = candidate.report_path
    if not path:
        raise HTTPException(status_code=404, detail="Generated report file not found")
        
    return FileResponse(path, media_type="application/pdf", filename=f"{candidate.full_name or 'report'}.pdf")
