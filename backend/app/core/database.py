from __future__ import annotations

import os
import uuid
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base


def _find_env_file() -> str:
    project_dir = Path(__file__).resolve().parents[1]
    candidates = [
        Path.cwd() / ".env",
        project_dir / ".env",
        project_dir.parent / ".env",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return str(Path.cwd() / ".env")


class Settings(BaseSettings):
    app_name: str = "AI Interviewer"
    api_prefix: str = "/api"
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "supersecretkey")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ai_interviewer.db")
    model_config = SettingsConfigDict(env_file=_find_env_file(), env_file_encoding="utf-8", extra="ignore")


settings = Settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    from app.models.user import User           # noqa: F401
    from app.models.hr import Job              # noqa: F401
    from app.models.candidate import Candidate # noqa: F401
    from app.models.interview import InterviewSession  # noqa: F401
    from app.models.contact import BookDemo    # noqa: F401
    Base.metadata.create_all(bind=engine)
    # Add missing columns for PostgreSQL (migration for existing tables)
    is_postgres = "postgresql" in str(engine.url)
    with engine.begin() as conn:
        if is_postgres:
            conn.execute(text("""
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'status'
                    ) THEN
                        ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'active';
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'current_salary'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN current_salary VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'expected_salary'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN expected_salary VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'report_id'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN report_id VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'report_path'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN report_path VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'fit_score'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN fit_score FLOAT DEFAULT 0;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'recommendation'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN recommendation VARCHAR DEFAULT 'PENDING';
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'matched_skills'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN matched_skills JSON;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'missing_skills'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN missing_skills JSON;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'skills'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN skills JSON;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'linkedin'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN linkedin VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'github'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN github VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'job_description'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN job_description VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'resume_path'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN resume_path VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'resume_url'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN resume_url VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'resume_filename'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN resume_filename VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'resume_text'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN resume_text TEXT;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'candidate' AND column_name = 'updated_at'
                    ) THEN
                        ALTER TABLE candidate ADD COLUMN updated_at TIMESTAMP;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'interview_sessions' AND column_name = 'gender'
                    ) THEN
                        ALTER TABLE interview_sessions ADD COLUMN gender VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'interview_sessions' AND column_name = 'language'
                    ) THEN
                        ALTER TABLE interview_sessions ADD COLUMN language VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'interview_sessions' AND column_name = 'candidate_type'
                    ) THEN
                        ALTER TABLE interview_sessions ADD COLUMN candidate_type VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'interview_sessions' AND column_name = 'interview_scores'
                    ) THEN
                        ALTER TABLE interview_sessions ADD COLUMN interview_scores JSON;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'interview_sessions' AND column_name = 'stage_responses'
                    ) THEN
                        ALTER TABLE interview_sessions ADD COLUMN stage_responses JSON;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'interview_sessions' AND column_name = 'final_recommendation'
                    ) THEN
                        ALTER TABLE interview_sessions ADD COLUMN final_recommendation VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'interview_sessions' AND column_name = 'video_id'
                    ) THEN
                        ALTER TABLE interview_sessions ADD COLUMN video_id VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'interview_sessions' AND column_name = 'video_path'
                    ) THEN
                        ALTER TABLE interview_sessions ADD COLUMN video_path VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'interview_sessions' AND column_name = 'video_filename'
                    ) THEN
                        ALTER TABLE interview_sessions ADD COLUMN video_filename VARCHAR;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'interview_sessions' AND column_name = 'video_size'
                    ) THEN
                        ALTER TABLE interview_sessions ADD COLUMN video_size INTEGER;
                    END IF;
                END $$;
                """))
        # SQLite specific - check if columns exist
        try:
            result = conn.execute(text("PRAGMA table_info(candidate)")).fetchall()
            existing_columns = [row[1] for row in result]
            columns_to_add = ['current_salary', 'expected_salary', 'report_id', 'report_path', 
                              'fit_score', 'recommendation', 'matched_skills', 'missing_skills',
                              'skills', 'linkedin', 'github', 'job_description', 
                              'resume_path', 'resume_url', 'resume_filename', 'resume_text', 'updated_at']
            for col in columns_to_add:
                if col not in existing_columns:
                    if col in ['fit_score']:
                        conn.execute(text(f"ALTER TABLE candidate ADD COLUMN {col} FLOAT DEFAULT 0"))
                    elif col in ['matched_skills', 'missing_skills', 'skills']:
                        conn.execute(text(f"ALTER TABLE candidate ADD COLUMN {col} JSON"))
                    elif col == 'resume_text':
                        conn.execute(text(f"ALTER TABLE candidate ADD COLUMN {col} TEXT"))
                    else:
                        conn.execute(text(f"ALTER TABLE candidate ADD COLUMN {col} VARCHAR"))
        except Exception:
            pass  # SQLite or table doesn't exist yet

        try:
            result = conn.execute(text("PRAGMA table_info(interview_sessions)")).fetchall()
            existing_columns = [row[1] for row in result]
            columns_to_add = ['candidate_type', 'interview_scores', 'stage_responses', 'final_recommendation',
                              'video_id', 'video_path', 'video_filename', 'video_size', 'gender', 'language']
            for col in columns_to_add:
                if col not in existing_columns:
                    if col in ['interview_scores', 'stage_responses']:
                        conn.execute(text(f"ALTER TABLE interview_sessions ADD COLUMN {col} JSON"))
                    elif col == 'video_size':
                        conn.execute(text(f"ALTER TABLE interview_sessions ADD COLUMN {col} INTEGER"))
                    else:
                        conn.execute(text(f"ALTER TABLE interview_sessions ADD COLUMN {col} VARCHAR"))
        except Exception:
            pass  # SQLite or table doesn't exist yet


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class MemoryDB:
    def __init__(self):
        self.users      = {}
        self.candidates = {}
        self.sessions   = {}
        self.reports    = {}
        self.videos     = {}
        self.jobs       = {}
        self.next_job_id = 1

    # ── Users ─────────────────────────────────────────────────────────────────
    def get_user_by_email(self, email: str):
        return next((u for u in self.users.values() if u["email"] == email), None)

    def create_user(self, data: dict):
        user_id = str(uuid.uuid4())
        user = {"id": user_id, **data}
        self.users[user_id] = user
        return user

    def update_user(self, user_id: str, data: dict):
        if user_id in self.users:
            self.users[user_id].update(data)
        return self.users.get(user_id)

    # ── Candidates ────────────────────────────────────────────────────────────
    def create_candidate(self, data: dict):
        candidate_id = str(uuid.uuid4())
        candidate = {"id": candidate_id, **data}
        self.candidates[candidate_id] = candidate
        return candidate

    def update_candidate(self, candidate_id: str, data: dict):
        if candidate_id in self.candidates:
            self.candidates[candidate_id].update(data)
        return self.candidates.get(candidate_id)

    def get_candidate(self, candidate_id: str):
        return self.candidates.get(candidate_id)

    def list_candidates(self):
        return list(self.candidates.values())

    def delete_candidate(self, candidate_id: str):
        if candidate_id in self.candidates:
            del self.candidates[candidate_id]
            return True
        return False

    # ── Sessions ──────────────────────────────────────────────────────────────
    def create_session(self, data: dict):
        session_id = str(uuid.uuid4())
        session = {
            "id": session_id,
            "questions": [],
            "answers": [],
            "scores": [],
            "emotions": [],
            "interview_stage": 0,
            "candidate_type": None,
            "interview_scores": {
                "technical_score": 0,
                "communication_score": 0,
                "confidence_score": 0,
                "role_fit_score": 0,
                "behavioral_score": 0,
                "final_combined_score": 0,
            },
            "stage_responses": [],
            "gender": "female",
            "language": "english",
            **data,
        }
        self.sessions[session_id] = session
        return session

    def update_session(self, session_id: str, data: dict):
        if session_id in self.sessions:
            self.sessions[session_id].update(data)
        return self.sessions.get(session_id)

    def get_session(self, session_id: str):
        return self.sessions.get(session_id)

    # ── Reports ───────────────────────────────────────────────────────────────
    def create_report(self, data: dict):
        report_id = str(uuid.uuid4())
        report = {"id": report_id, **data}
        self.reports[report_id] = report
        return report

    def get_report(self, report_id: str):
        return self.reports.get(report_id)

    def list_reports(self):
        return list(self.reports.values())

    # ── Videos ────────────────────────────────────────────────────────────────
    def create_video(self, data: dict):
        video_id = str(uuid.uuid4())
        video = {"id": video_id, **data}
        self.videos[video_id] = video
        return video

    def get_video(self, video_id: str):
        return self.videos.get(video_id)

    def get_video_by_session(self, session_id: str):
        return next(
            (v for v in self.videos.values() if v.get("session_id") == session_id),
            None,
        )

    def update_video(self, video_id: str, data: dict):
        if video_id in self.videos:
            self.videos[video_id].update(data)
        return self.videos.get(video_id)

    # ── Jobs ──────────────────────────────────────────────────────────────────
    def create_job(self, data: dict):
        job_id = self.next_job_id
        self.next_job_id += 1
        job = {"id": job_id, **data}
        self.jobs[job_id] = job
        return job

    def list_jobs(self):
        return list(self.jobs.values())

    def get_job(self, job_id):
        """
        Lookup job by ID — handles int, str, and UUID formats.
        hr.py saves jobs with UUID string keys.
        candidate.py may pass int or string IDs.
        """
        # Direct lookup
        if job_id in self.jobs:
            return self.jobs[job_id]

        # String conversion
        str_id = str(job_id)
        if str_id in self.jobs:
            return self.jobs[str_id]

        # Int conversion (for legacy numeric IDs)
        try:
            int_id = int(job_id)
            if int_id in self.jobs:
                return self.jobs[int_id]
        except (ValueError, TypeError):
            pass

        # Scan all jobs for matching id field
        for job in self.jobs.values():
            if str(job.get("id", "")) == str_id:
                return job

        return None

    def update_job(self, job_id, data: dict):
        job = self.get_job(job_id)
        if job:
            job.update(data)
            # Ensure it's stored under its actual key
            actual_key = job.get("id", job_id)
            self.jobs[actual_key] = job
        return job

    def delete_job(self, job_id):
        # Try all key formats
        for key in [job_id, str(job_id)]:
            if key in self.jobs:
                return self.jobs.pop(key)
        try:
            int_key = int(job_id)
            if int_key in self.jobs:
                return self.jobs.pop(int_key)
        except (ValueError, TypeError):
            pass
        return None

    def get_job_for_candidate_email(self, email: str):
        """
        Find the most recently created job assigned to a candidate email.
        Handles both 'assign_candidate_email' (hr.py) and 'candidate_email' field names.
        """
        normalized = (email or "").strip().lower()
        if not normalized:
            return None

        matching = []
        for job in self.jobs.values():
            # Check both possible field names
            job_email = (
                job.get("assign_candidate_email") or
                job.get("candidate_email") or
                ""
            ).strip().lower()

            if job_email == normalized:
                matching.append(job)

        return matching[-1] if matching else None


memory_db = MemoryDB()