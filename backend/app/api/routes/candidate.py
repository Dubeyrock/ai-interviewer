from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

RESUMES_DIR = Path("./storage/resumes")
RESUMES_DIR.mkdir(parents=True, exist_ok=True)

from app.core.database import get_db, memory_db as memdb
from app.models.candidate import Candidate
from app.models.interview import InterviewSession
from app.models.hr import Job
from app.services.hiring_decision_engine import decide_hiring
from app.services.question_generator import QuestionGenerator
from app.services.resume_matcher import match_candidate
from app.services.resume_parser import extract_text_from_file, extract_skills
from app.services.rag_service import rag_service
import app.services.chroma_rag_service as chroma_module

router = APIRouter()
qg = QuestionGenerator()


@router.post("/register")
async def register_candidate(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(""),
    experience: str = Form(""),
    current_company: str = Form(""),
    current_salary: str = Form(""),
    expected_salary: str = Form(""),
    location: str = Form(""),
    domain: str = Form(...),
    job_role: str = Form(...),
    job_id: str | None = Form(None),
    skills: str = Form(""),
    linkedin: str = Form(""),
    github: str = Form(""),
    job_description: str = Form(""),
    gender: str = Form("female"),
    language: str = Form("english"),
    resume: UploadFile | None = File(None),
    db: Session = Depends(get_db)
):
    if job_id and job_id.strip():
        # Clean job ID
        job_id_lookup = job_id.strip()

        job = db.query(Job).filter(Job.id == job_id_lookup).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
            
        domain = "IT" if (job.domain or "").lower() == "it" else "Non-IT"
        job_role = job.job_title or job_role
        job_description = job.job_description or job_description
        
        job_skills = job.required_skills or []
        if isinstance(job_skills, list):
            skills = ", ".join(job_skills)
        else:
            skills = str(job_skills)

    resume_text = ""
    resume_filename = None
    resume_path_str = None
    if resume is not None:
        allowed_types = {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "text/plain",
            "text/markdown",
        }
        allowed_exts = {".pdf", ".docx", ".doc", ".txt"}
        ext = Path(resume.filename or "").suffix.lower()

        if resume.content_type not in allowed_types and ext not in allowed_exts:
            raise HTTPException(
                status_code=422,
                detail="Unsupported resume format. Please upload PDF, DOC, DOCX, or TXT only. Images are not accepted.",
            )

        resume_bytes = await resume.read()
        resume_text = extract_text_from_file(resume_bytes, resume.filename)
        resume_filename = resume.filename
        
        unique_filename = f"{uuid.uuid4()}_{resume.filename}"
        resume_path = RESUMES_DIR / unique_filename
        with open(resume_path, "wb") as f:
            f.write(resume_bytes)
        resume_path_str = str(resume_path)

    merged_skills = sorted(set([s.strip().lower() for s in skills.split(",") if s.strip()] + extract_skills(resume_text)))
    match = match_candidate(resume_text=resume_text, domain=domain, job_role=job_role, job_description=job_description or None)

    candidate_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())

    # RAG: Store resume chunks with embeddings in ChromaDB
    if resume_text:
        try:
            chroma_service = getattr(chroma_module, 'chroma_rag_service', None)
            if chroma_service:
                chroma_service.store_resume_embeddings(candidate_id, resume_text)
            else:
                rag_service.store_resume_embeddings(candidate_id, resume_text)
        except Exception as e:
            print(f"RAG storage failed (will use fallback): {e}")

    question_data = qg.next_question(
        domain=domain,
        job_role=job_role,
        resume_text=resume_text,
        job_description=job_description,
        history=[],
        last_score=None,
        candidate_id=candidate_id,  # Pass candidate_id for RAG
    )
    
    candidate = Candidate(
        id=candidate_id,
        full_name=full_name,
        email=email,
        phone=phone,
        experience=experience,
        current_company=current_company,
        current_salary=current_salary,
        expected_salary=expected_salary,
        location=location,
        domain=domain,
        job_role=job_role,
        skills=merged_skills,
        linkedin=linkedin,
        github=github,
        job_description=job_description or None,
        job_id=job_id,
        resume_filename=resume_filename,
        resume_path=resume_path_str,
        resume_text=resume_text,
        fit_score=match.fit_score,
        recommendation=match.recommendation,
        status="selected" if match.recommendation == "SELECTED" else "screening",
        matched_skills=match.matched_skills,
        missing_skills=match.missing_skills,
        session_id=session_id,
    )
    
    session = InterviewSession(
        id=session_id,
        candidate_id=candidate_id,
        job_id=job_id,
        current_question=question_data["question"],
        questions=[question_data["question"]],
        answers=[],
        answers_count=0,
        total_scores=0.0,
        scores=[],
        emotions=[],
        interview_stage=0,
        candidate_type=domain.lower() in {"it", "tech", "developer"} and "IT" or "Non-IT",
        interview_scores={
            "technical_score": 0,
            "communication_score": 0,
            "confidence_score": 0,
            "role_fit_score": 0,
            "behavioral_score": 0,
            "final_combined_score": 0,
        },
        stage_responses=[],
        recommendation=match.recommendation,
        fit_score=int(match.fit_score),
        final_recommendation="",
        status="active"
    )
    
    db.add(candidate)
    db.add(session)
    db.commit()
    db.refresh(candidate)
    db.refresh(session)

    memdb.create_candidate({
        "id": candidate.id,
        "full_name": candidate.full_name,
        "email": candidate.email,
        "phone": candidate.phone,
        "experience": candidate.experience,
        "domain": candidate.domain,
        "job_role": candidate.job_role,
        "fit_score": candidate.fit_score,
        "recommendation": candidate.recommendation,
        "status": candidate.status,
        "resume_text": candidate.resume_text,
        "job_description": candidate.job_description,
        "session_id": candidate.session_id,
        "matched_skills": candidate.matched_skills,
        "missing_skills": candidate.missing_skills,
        "location": candidate.location,
        "current_company": candidate.current_company,
        "current_salary": candidate.current_salary,
        "expected_salary": candidate.expected_salary,
        "skills": candidate.skills,
        "linkedin": candidate.linkedin,
        "github": candidate.github,
        "created_at": candidate.created_at,
    })
    memdb.create_session({
        "id": session.id,
        "candidate_id": session.candidate_id,
        "job_id": session.job_id,
        "current_question": session.current_question,
        "questions": session.questions,
        "answers": session.answers,
        "scores": session.scores,
        "emotions": session.emotions,
        "interview_stage": session.interview_stage or 0,
        "candidate_type": session.candidate_type,
        "interview_scores": session.interview_scores,
        "stage_responses": session.stage_responses,
        "recommendation": session.recommendation,
        "fit_score": session.fit_score,
        "final_recommendation": session.final_recommendation,
        "status": session.status,
        "gender": gender,
        "language": language,
    })

    return {
        "candidate_id": candidate.id,
        "session_id": session.id,
        "current_question": session.current_question,
        "fit_score": candidate.fit_score,
        "recommendation": candidate.recommendation,
        "status": candidate.status,
        "matched_skills": candidate.matched_skills,
        "missing_skills": candidate.missing_skills,
    }


@router.get("/")
def list_candidates(db: Session = Depends(get_db)):
    candidates = db.query(Candidate).all()
    # Serialize safely for simple use cases
    return {"candidates": [
        {
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "job_role": c.job_role,
            "fit_score": c.fit_score,
            "status": c.status
        } for c in candidates
    ]}


@router.get("/{candidate_id}")
def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    return {
        "id": candidate.id,
        "full_name": candidate.full_name,
        "email": candidate.email,
        "phone": candidate.phone,
        "experience": candidate.experience,
        "current_company": candidate.current_company,
        "current_salary": candidate.current_salary,
        "expected_salary": candidate.expected_salary,
        "location": candidate.location,
        "domain": candidate.domain,
        "job_role": candidate.job_role,
        "job_id": candidate.job_id,
        "session_id": candidate.session_id,
        "skills": candidate.skills,
        "linkedin": candidate.linkedin,
        "github": candidate.github,
        "job_description": candidate.job_description,
        "resume_path": candidate.resume_path,
        "resume_url": candidate.resume_url,
        "resume_filename": candidate.resume_filename,
        "resume_text": candidate.resume_text,
        "fit_score": candidate.fit_score,
        "recommendation": candidate.recommendation,
        "status": candidate.status,
        "matched_skills": candidate.matched_skills,
        "missing_skills": candidate.missing_skills,
    }


@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    db.delete(candidate)
    db.commit()
    return {"deleted": True, "candidate_id": candidate_id}


@router.get("/{candidate_id}/resume/download")
def download_resume(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate or not candidate.resume_path:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    path = Path(candidate.resume_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Resume file not found")
        
    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=candidate.resume_filename or f"resume{path.suffix}"
    )