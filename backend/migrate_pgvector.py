"""
Database Migration Script for pgvector and Resume Chunks Table
Run this script once to set up the RAG system with PostgreSQL
"""
from __future__ import annotations

import sys
from app.core.database import engine
from sqlalchemy import text


def migrate_pgvector():
    """Set up pgvector extension and create resume_chunks table"""
    
    # Check if using PostgreSQL
    is_postgres = "postgresql" in str(engine.url)
    
    if not is_postgres:
        print("⚠️  This migration is only for PostgreSQL databases.")
        print("Your current database is not PostgreSQL.")
        print("RAG features will use fallback keyword search.")
        return False
    
    print("🚀 Starting pgvector migration...")
    
    try:
        with engine.begin() as conn:
            # Step 1: Create pgvector extension
            print("📦 Creating pgvector extension...")
            conn.execute(text("""
                CREATE EXTENSION IF NOT EXISTS vector;
            """))
            print("✅ pgvector extension created/verified")
            
            # Step 2: Create resume_chunks table
            print("📋 Creating resume_chunks table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS resume_chunks (
                    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                    chunk_id VARCHAR UNIQUE NOT NULL,
                    candidate_id VARCHAR NOT NULL REFERENCES candidate(id) ON DELETE CASCADE,
                    section_type VARCHAR NOT NULL,
                    chunk_text TEXT NOT NULL,
                    chunk_order INTEGER NOT NULL,
                    embedding vector(16),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("✅ resume_chunks table created")
            
            # Step 3: Create indexes for performance
            print("📊 Creating indexes...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_resume_chunks_candidate 
                ON resume_chunks(candidate_id);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_resume_chunks_section 
                ON resume_chunks(section_type);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_resume_chunks_embedding 
                ON resume_chunks USING ivfflat (embedding vector_cosine_ops) 
                WITH (lists = 100);
            """))
            print("✅ Indexes created")
            
            # Step 4: Add resume_chunks relationship to candidate table if missing
            print("🔗 Verifying candidate table relationships...")
            # The relationship is handled by SQLAlchemy ORM, no DB changes needed
            
            print("\n🎉 Migration completed successfully!")
            print("\n📝 Next steps:")
            print("   1. Restart your backend server")
            print("   2. Upload a resume - it will automatically be chunked and embedded")
            print("   3. Questions will now be 100% resume-specific!")
            
            return True
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False


def check_pgvector_status():
    """Check if pgvector is properly installed"""
    try:
        with engine.begin() as conn:
            result = conn.execute(text("""
                SELECT * FROM pg_extension WHERE extname = 'vector';
            """)).fetchone()
            
            if result:
                print("✅ pgvector extension is installed")
                return True
            else:
                print("❌ pgvector extension is NOT installed")
                return False
    except Exception as e:
        print(f"❌ Error checking pgvector: {e}")
        return False


def install_pgvector_instructions():
    """Print instructions for installing pgvector"""
    print("\n" + "="*60)
    print("📚 How to install pgvector:")
    print("="*60)
    print("""
For PostgreSQL 12+:

1. Using apt (Ubuntu/Debian):
   sudo apt-get install postgresql-14-pgvector  # Adjust version number

2. Using yum (RHEL/CentOS):
   sudo yum install pgvector_14  # Adjust version number

3. From source:
   cd /tmp
   git clone https://github.com/pgvector/pgvector.git
   cd pgvector
   sudo make install

4. Then restart PostgreSQL:
   sudo systemctl restart postgresql

5. Run this migration script again:
   python migrate_pgvector.py
""")
    print("="*60)


if __name__ == "__main__":
    print("🔍 Checking PostgreSQL and pgvector status...")
    
    is_postgres = "postgresql" in str(engine.url)
    if not is_postgres:
        print("⚠️  Current database is not PostgreSQL.")
        print("RAG will work with fallback keyword search.")
        sys.exit(0)
    
    has_pgvector = check_pgvector_status()
    
    if has_pgvector:
        print("\n✅ pgvector is already installed!")
        print("Running migration to create resume_chunks table...")
        migrate_pgvector()
    else:
        print("\n❌ pgvector is not installed in your PostgreSQL.")
        install_pgvector_instructions()
        print("\nAfter installing pgvector, run this script again.")
        sys.exit(1)