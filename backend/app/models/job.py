from pydantic import BaseModel
from typing import Optional

class Job(BaseModel):
    id: Optional[int] = None
    title: str
    type: str  # "it" or "non_it"
    description: str
    skills: str  # JSON‑encoded list of strings
    experience_level: str  # "fresher" or "experienced"
    candidate_email: str | None = None
