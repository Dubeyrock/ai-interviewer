from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.resume_matcher import match_candidate
from app.services.resume_parser import extract_skills, extract_text_from_file

router = APIRouter()


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), domain: str = Form("it"), job_role: str = Form("frontend developer"), job_description: str = Form("")):
    allowed_types = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
        "text/markdown",
    }
    allowed_exts = {".pdf", ".docx", ".doc", ".txt"}
    ext = Path(file.filename or "").suffix.lower()

    if file.content_type not in allowed_types and ext not in allowed_exts:
        raise HTTPException(
            status_code=422,
            detail="Unsupported resume format. Please upload PDF, DOC, DOCX, or TXT only. Images are not accepted.",
        )

    data = await file.read()
    text = extract_text_from_file(data, file.filename)
    skills = extract_skills(text)
    match = match_candidate(text, domain=domain, job_role=job_role, job_description=job_description or None)
    return {
        "filename": file.filename,
        "text_preview": text[:1000],
        "skills": skills,
        "fit_score": match.fit_score,
        "recommendation": match.recommendation,
        "matched_skills": match.matched_skills,
        "missing_skills": match.missing_skills,
        "summary": match.summary,
    }
