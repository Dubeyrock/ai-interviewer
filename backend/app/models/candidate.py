from __future__ import annotations
from sqlalchemy import Column, String, Float, Integer, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.core.database import Base

class Candidate(Base):
    __tablename__ = "candidate"

    id = Column(String, primary_key=True)
    full_name = Column(String)
    email = Column(String)
    phone = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    current_company = Column(String, nullable=True)
    current_salary = Column(String, nullable=True)
    expected_salary = Column(String, nullable=True)
    location = Column(String, nullable=True)
    domain = Column(String, nullable=True)
    job_role = Column(String, nullable=True)
    job_id = Column(String, nullable=True)
    session_id = Column(String, nullable=True)
    skills = Column(JSON, default=list)
    linkedin = Column(String, nullable=True)
    github = Column(String, nullable=True)
    job_description = Column(String, nullable=True)
    resume_path = Column(String, nullable=True)
    resume_url = Column(String, nullable=True)
    resume_filename = Column(String, nullable=True)
    resume_text = Column(String, nullable=True)
    report_id = Column(String, nullable=True)
    report_path = Column(String, nullable=True)
    fit_score = Column(Float, default=0)
    recommendation = Column(String, default="PENDING")
    status = Column(String, default="screening")
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to resume chunks for RAG
    resume_chunks = relationship("ResumeChunk", back_populates="candidate", cascade="all, delete-orphan")


class CandidateRegisterResponse(BaseModel):
    candidate_id: str
    session_id: str
    current_question: str
    fit_score: int
    recommendation: str
    status: str
    matched_skills: list[str]
    missing_skills: list[str]


class CandidateOut(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: str | None = None
    experience: str | None = None
    current_company: str | None = None
    current_salary: str | None = None
    expected_salary: str | None = None
    location: str | None = None
    domain: str
    job_role: str
    skills: list[str] = Field(default_factory=list)
    linkedin: str | None = None
    github: str | None = None
    job_description: str | None = None
    resume_filename: str | None = None
    resume_text: str | None = None
    fit_score: int = 0
    recommendation: str = "PENDING"
    status: str = "screening"
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    created_at: str
    updated_at: str | None = None
