from __future__ import annotations

from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime
from app.core.database import Base


class BookDemo(Base):
    __tablename__ = "book_demo"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    preferred_date = Column(String, nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
