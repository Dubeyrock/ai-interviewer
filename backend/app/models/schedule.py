from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Schedule(Base):
    __tablename__ = 'schedules'
    
    id = Column(String(50), primary_key=True)
    candidate_name = Column(String(255), nullable=False)
    candidate_email = Column(String(255), nullable=False)
    hr_name = Column(String(255), nullable=False)
    interview_role = Column(String(255), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    meeting_link = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(String(50), ForeignKey("users.id"))
    calendar_event_id = Column(String(255))

    owner = relationship("User", back_populates="schedules")

    def to_dict(self):
        return {
            "id": self.id,
            "candidate_name": self.candidate_name,
            "candidate_email": self.candidate_email,
            "hr_name": self.hr_name,
            "interview_role": self.interview_role,
            "scheduled_at": self.scheduled_at,
            "meeting_link": self.meeting_link,
            "created_at": self.created_at,
            "calendar_event_id": self.calendar_event_id,
        }