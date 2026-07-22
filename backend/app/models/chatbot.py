from __future__ import annotations
from sqlalchemy import Column, String, DateTime, Integer, Boolean
from datetime import datetime
from app.core.database import Base

class ChatbotInteraction(Base):
    __tablename__ = "chatbot_interaction"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    track = Column(String, nullable=False)
    candidate_id = Column(String, nullable=True)
    session_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)