"""
Resume Chunk Model - PostgreSQL stores only metadata
Embeddings are stored in ChromaDB for vector search
"""
from __future__ import annotations

from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class ResumeChunk(Base):
    """Model for storing resume chunk metadata (vectors in ChromaDB)"""
    __tablename__ = "resume_chunks"

    id = Column(String, primary_key=True, index=True)
    chunk_id = Column(String, unique=True, index=True, nullable=False)
    candidate_id = Column(String, ForeignKey("candidate.id"), index=True, nullable=False)
    section_type = Column(String, nullable=False)
    chunk_text = Column(String, nullable=False)
    chunk_order = Column(Integer, nullable=False)

    candidate = relationship("Candidate", back_populates="resume_chunks")