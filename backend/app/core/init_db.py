from app.core.database import Base, engine
from sqlalchemy import text
from app.models import hr  # noqa: F401
from app.models import candidate  # noqa: F401
from app.models import interview  # noqa: F401
from app.models import resume_chunk  # noqa: F401
from app.models import company  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.chatbot import ChatbotInteraction  # noqa: F401


def _escaped_print(message: str) -> None:
    print(message.encode("utf-8", "backslashreplace").decode("utf-8"))


def init_db():
    _escaped_print("INIT DB CALLED")
    _escaped_print(f"Tables found in Base: {Base.metadata.tables.keys()}")

    Base.metadata.create_all(bind=engine)

    # Add missing columns for PostgreSQL (migration for existing tables)
    is_postgres = "postgresql" in str(engine.url)
    if is_postgres:
        with engine.begin() as conn:
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
                        WHERE table_name = 'users' AND column_name = 'subscription_plan'
                    ) THEN
                        ALTER TABLE users ADD COLUMN subscription_plan VARCHAR DEFAULT 'starter';
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'subscription_status'
                    ) THEN
                        ALTER TABLE users ADD COLUMN subscription_status VARCHAR DEFAULT 'active';
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'subscription_ends_at'
                    ) THEN
                        ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMP;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'is_internal'
                    ) THEN
                        ALTER TABLE users ADD COLUMN is_internal BOOLEAN DEFAULT FALSE;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'company_id'
                    ) THEN
                        ALTER TABLE users ADD COLUMN company_id VARCHAR;
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
                END $$;
                """))
    # SQLite specific - check if columns exist and add missing ones (separate transaction)
    try:
        with engine.begin() as conn:
            result = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            existing_columns = [row[1] for row in result]
            users_columns_to_add = ['password_hash', 'status', 'subscription_plan', 'subscription_status', 'subscription_ends_at', 'is_internal', 'company_id']
            for col in users_columns_to_add:
                if col not in existing_columns:
                    if col == 'status':
                        conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'active'"))
                    elif col == 'subscription_plan':
                        conn.execute(text("ALTER TABLE users ADD COLUMN subscription_plan VARCHAR DEFAULT 'starter'"))
                    elif col == 'subscription_status':
                        conn.execute(text("ALTER TABLE users ADD COLUMN subscription_status VARCHAR DEFAULT 'active'"))
                    elif col == 'subscription_ends_at':
                        conn.execute(text("ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMP"))
                    elif col == 'is_internal':
                        conn.execute(text("ALTER TABLE users ADD COLUMN is_internal BOOLEAN DEFAULT FALSE"))
                    elif col == 'company_id':
                        conn.execute(text("ALTER TABLE users ADD COLUMN company_id VARCHAR"))
                    else:
                        conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR DEFAULT ''"))
    except Exception:
        pass  # SQLite or table doesn't exist yet

    try:
        with engine.begin() as conn:
            result = conn.execute(text("PRAGMA table_info(candidate)")).fetchall()
            existing_columns = [row[1] for row in result]
            columns_to_add = ['current_salary', 'expected_salary', 'report_id', 'report_path',
                              'fit_score', 'recommendation', 'matched_skills', 'missing_skills',
                              'skills', 'linkedin', 'github', 'job_description',
                              'resume_path', 'resume_url', 'resume_filename', 'resume_text', 'updated_at']
            for col in columns_to_add:
                if col not in existing_columns:
                    if col == 'fit_score':
                        conn.execute(text(f"ALTER TABLE candidate ADD COLUMN {col} FLOAT DEFAULT 0"))
                    elif col in ['matched_skills', 'missing_skills', 'skills']:
                        conn.execute(text(f"ALTER TABLE candidate ADD COLUMN {col} JSON"))
                    elif col == 'resume_text':
                        conn.execute(text(f"ALTER TABLE candidate ADD COLUMN {col} TEXT"))
                    else:
                        conn.execute(text(f"ALTER TABLE candidate ADD COLUMN {col} VARCHAR"))
    except Exception:
        pass  # SQLite or table doesn't exist yet

    print("TABLE CREATION DONE")
