from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.contact import BookDemo
from app.core.database import SessionLocal
from datetime import datetime
import uuid
from app.services.email_service import send_demo_confirmation_email

router = APIRouter()


class BookDemoRequest(BaseModel):
    name: str
    email: str
    phone: str | None = None
    company: str | None = None
    preferred_date: str | None = None
    message: str | None = None


@router.post("/book-demo")
async def book_demo(payload: BookDemoRequest):
    db = SessionLocal()
    try:
        demo = BookDemo(
            id=str(uuid.uuid4()),
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            company=payload.company,
            preferred_date=payload.preferred_date,
            message=payload.message,
            status="pending",
            created_at=datetime.utcnow(),
        )
        db.add(demo)
        db.commit()
        db.refresh(demo)

        try:
            send_demo_confirmation_email(
                to_email=payload.email,
                name=payload.name,
                company=payload.company,
                preferred_date=payload.preferred_date,
                message=payload.message,
            )
        except Exception as email_err:
            print(f"[Contact Route] Failed to send confirmation email: {email_err}")

        return {
            "id": demo.id,
            "name": demo.name,
            "email": demo.email,
            "status": demo.status,
            "created_at": demo.created_at.isoformat(),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()
