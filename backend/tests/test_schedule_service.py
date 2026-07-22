import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.services.schedule_service import create_schedule
from app.models.schedule import Schedule

# Use an in‑memory SQLite DB for fast tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

@pytest.fixture
def db_session():
    """Yield a new DB session for each test and roll back after."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_create_schedule_success(monkeypatch, db_session):
    # Mock calendar_service.add_event_to_calendar to avoid external API calls
    mock_event = {"id": "cal_12345", "htmlLink": "https://calendar.example.com/event/12345"}
    monkeypatch.setattr('app.services.schedule_service.calendar_service.add_event_to_calendar', lambda **kwargs: mock_event)

    schedule_dict = create_schedule(
        db=db_session,
        candidate_name="Alice",
        candidate_email="alice@example.com",
        hr_name="Bob",
        interview_role="Backend Engineer",
        scheduled_at=datetime.utcnow() + timedelta(days=1),
    )

    # Verify that a dict is returned with expected keys
    assert isinstance(schedule_dict, dict)
    assert schedule_dict["candidate_name"] == "Alice"
    assert schedule_dict["candidate_email"] == "alice@example.com"
    assert schedule_dict["hr_name"] == "Bob"
    assert schedule_dict["interview_role"] == "Backend Engineer"
    assert schedule_dict["calendar_event_id"] == "cal_12345"
    # Ensure the DB row actually exists
    persisted = db_session.query(Schedule).filter_by(id=schedule_dict["id"]).first()
    assert persisted is not None
    assert persisted.calendar_event_id == "cal_12345"
