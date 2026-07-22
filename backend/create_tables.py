from app.core.database import Base, engine
from app.models.schedule import Schedule  # Import all models
from app.models import user, hr, candidate, interview  # Import all models
from sqlalchemy import text

# Create all tables
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

print("✅ All database tables created successfully!")