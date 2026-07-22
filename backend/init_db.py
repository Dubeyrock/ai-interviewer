# Standalone database initialization script
# Run with: python -m init_db (from backend directory)

from app.core.database import Base, engine, init_db

# Initialize database and create tables
init_db()
print("✅ Database tables created successfully!")
