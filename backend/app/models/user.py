from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
import uuid
# pyrefly: ignore [missing-import]
from app.core.database import Base

class UserCreateRequest(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = Field(default="candidate", pattern="^(candidate|hr)$")
    company: str | None = None
    recaptcha_token: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    recaptcha_token: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    assigned_job_id: int | None = None
    is_internal: bool = False


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="hr")
    status = Column(String, default="active")
    subscription_plan = Column(String, default="starter")
    subscription_status = Column(String, default="active")
    subscription_ends_at = Column(DateTime, nullable=True)
    is_internal = Column(Boolean, default=False)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    company = relationship("Company", back_populates="users")
    schedules = relationship("Schedule", back_populates="owner", cascade="all, delete-orphan")
