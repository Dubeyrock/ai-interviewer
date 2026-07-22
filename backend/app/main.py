from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, candidate, hr, interview, report, resume, schedule, video, job, admin, chatbot, tts, contact
from app.api.websocket import router as websocket_router
from app.core.config import settings
from app.core.init_db import init_db
# important - models import
from app.models.hr import Job
from app.models.candidate import Candidate
from app.models.interview import InterviewSession
from app.models.contact import BookDemo


app = FastAPI(title=settings.app_name, version="2.0.0")
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_origins=[],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Routers
app.include_router(auth.router,      prefix=f"{settings.api_prefix}/auth",      tags=["auth"])
app.include_router(candidate.router, prefix=f"{settings.api_prefix}/candidates", tags=["candidates"])
app.include_router(interview.router, prefix=f"{settings.api_prefix}/interview",  tags=["interview"])
app.include_router(resume.router,    prefix=f"{settings.api_prefix}/resume",     tags=["resume"])
app.include_router(report.router,    prefix=f"{settings.api_prefix}/report",     tags=["report"])
app.include_router(video.router,     prefix=f"{settings.api_prefix}/video",      tags=["video"])
app.include_router(hr.router,        prefix=f"{settings.api_prefix}/hr",         tags=["hr"])
app.include_router(admin.router,     prefix=f"{settings.api_prefix}/admin",      tags=["admin"])
app.include_router(job.router,       prefix=f"{settings.api_prefix}/hr",         tags=["jobs"])
app.include_router(schedule.router,  prefix=f"{settings.api_prefix}/schedule",   tags=["schedule"])
app.include_router(tts.router,         prefix=f"{settings.api_prefix}/tts",         tags=["tts"])
app.include_router(websocket_router, tags=["websocket"])
app.include_router(chatbot.router,  prefix=f"{settings.api_prefix}/chatbot",  tags=["chatbot"])
app.include_router(contact.router,  prefix=f"{settings.api_prefix}/contact",  tags=["contact"])


@app.on_event("startup")
async def startup():
    from app.core.database import SessionLocal
    from app.core.security import hash_password
    from app.models.user import User

    # ── Env validation ────────────────────────────────────────────────
    warnings = []
    if settings.jwt_secret in ("change-me-in-env", "change-me", ""):
        warnings.append("WARNING: JWT_SECRET is using insecure default - set a strong secret in .env!")
    if not settings.groq_api_key:
        warnings.append("WARNING: GROQ_API_KEY not set - Whisper STT + LLM eval will be disabled.")
    if not settings.elevenlabs_api_key:
        warnings.append("WARNING: ELEVENLABS_API_KEY not set - TTS will fall back to browser speech.")
    for w in warnings:
        print(w, flush=True)
    if not warnings:
        print("All required env vars present.", flush=True)
    # ─────────────────────────────────────────────────────────────────

    default_users = [
        {
            "name": "Admin",
            "email": "admin@aiinterviewer.com",
            "password_hash": hash_password("admin@123"),
            "role": "admin",
        },
        {
            "name": "HR Admin",
            "email": "hr@aiinterviewer.com",
            "password_hash": hash_password("Test@1234"),
            "role": "hr",
        },
        {
            "name": "HR Priya",
            "email": "priya@aiinterviewer.com",
            "password_hash": hash_password("Test@1234"),
            "role": "hr",
        },
    ]

    db = SessionLocal()
    try:
        for user_data in default_users:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing:
                new_user = User(**user_data)
                db.add(new_user)
                db.commit()
                print(f"Created in Postgres: {user_data['email']}")
            else:
                print(f"Already exists in Postgres: {user_data['email']}")
    finally:
        db.close()

    print("AI Interviewer backend ready!")
    print("Admin Login -> admin@aiinterviewer.com / admin@123")
    print("HR Login -> hr@aiinterviewer.com / Test@1234")


@app.get("/")
def root():
    return {"message": f"Welcome to {settings.app_name} API!"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "hr_login": {
            "email": "hr@aiinterviewer.com",
            "password": "Test@1234",
        }
    }