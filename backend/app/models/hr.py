from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from datetime import datetime
from app.core.database import Base

class Job(Base):
    __tablename__ = "job"

    id = Column(String, primary_key=True)
    job_title = Column(String, nullable=False)
    domain = Column(String)
    job_description = Column(Text)
    required_skills = Column(JSON, default=list)
    experience_level = Column(String, default="Fresher")
    assign_candidate_email = Column(String, nullable=True)
    interview_language = Column(String, default="English")
    interview_difficulty = Column(String, default="Medium")
    technical_weight = Column(Integer, default=70)
    behavioral_weight = Column(Integer, default=30)
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)