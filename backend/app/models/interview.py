from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field
from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import JSON
from sqlalchemy import DateTime

from app.core.database import Base

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True)

    candidate_id = Column(String)

    job_id = Column(String)

    current_question = Column(String)

    questions = Column(JSON)

    answers_count = Column(Integer)

    total_scores = Column(Float)

    scores = Column(JSON)

    recommendation = Column(String)

    fit_score = Column(Integer)
    answers = Column(JSON, default=list)
    emotions = Column(JSON, default=list)
    interview_stage = Column(Integer, default=0)
    candidate_type = Column(String, nullable=True)
    interview_scores = Column(JSON, default=dict)
    stage_responses = Column(JSON, default=list)
    final_recommendation = Column(String)
    video_id = Column(String, nullable=True)
    video_path = Column(String, nullable=True)
    video_filename = Column(String, nullable=True)
    video_size = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    language = Column(String, nullable=True)

    status = Column(String)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

class StartInterviewRequest(BaseModel):
    candidate_id: str
    job_description: str | None = None
    gender: str | None = None
    language: str | None = None


class AnswerSubmitRequest(BaseModel):
    session_id: str
    answer: str = Field(min_length=1)
    transcript: str | None = None
    emotion: str | None = None
    language: str | None = None


class InterviewSessionOut(BaseModel):
    id: str
    candidate_id: str
    candidate_name: str
    domain: str
    job_role: str
    job_description: str | None = None
    current_question: str
    questions: list[str]
    answers: list[str]
    scores: list[float]
    status: str
    fit_score: int = 0
    recommendation: str = "PENDING"
    max_questions: int = 8
    gender: str = "female"
    language: str = "english"
    # 9-Step Flow Fields
    interview_stage: int = 0
    candidate_type: str | None = None  # "IT" or "Non-IT"
    interview_scores: dict | None = None  # {technical_score, communication_score, confidence_score, role_fit_score, behavioral_score, final_combined_score}
    stage_responses: list | None = None  # Store responses for each stage
    final_recommendation: str = "PENDING"


class AnswerSubmitResponse(BaseModel):
    session_id: str
    question: str
    score: float
    confidence: float
    feedback: str
    next_question: str
    recommendation: str
    final_score: float
    # All interview scores for completion detection
    technical_score: float = 0.0
    communication_score: float = 0.0
    confidence_score: float = 0.0
    role_fit_score: float = 0.0
    behavioral_score: float = 0.0
    status: str = "active"  # Will be "completed" when interview ends