from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import LoginRequest, TokenResponse, UserCreateRequest, UserOut, User
from app.models.company import Company

router = APIRouter()


def _resolve_company(db: Session, name: str | None, email: str) -> Company | None:
    """Find an existing company tenant by (case-insensitive) name so multiple HR
    of the same client company share one subscription; otherwise create it."""
    if not name or not name.strip():
        return None
    name = name.strip()
    existing = db.query(Company).filter(func.lower(Company.name) == func.lower(name)).first()
    if existing:
        return existing
    company = Company(name=name, email=email)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company

@router.post("/register", response_model=UserOut)
def register(payload: UserCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        existing.name = payload.name
        existing.password_hash = hash_password(payload.password)
        existing.role = payload.role
        # Link to a company for HR clients if not already linked
        if payload.role == "hr" and payload.company and not existing.company_id:
            company = _resolve_company(db, payload.company, payload.email)
            if company:
                existing.company_id = company.id
        db.commit()
        db.refresh(existing)
        return UserOut(id=existing.id, name=existing.name, email=existing.email, role=existing.role)

    new_user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    # HR clients get their own company tenant (subscription lives at company level)
    if payload.role == "hr" and payload.company:
        company = _resolve_company(db, payload.company, payload.email)
        if company:
            new_user.company_id = company.id
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserOut(id=new_user.id, name=new_user.name, email=new_user.email, role=new_user.role)

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    assigned_job = None

    return TokenResponse(
        access_token=create_access_token({"sub": user.id, "role": user.role, "is_internal": bool(user.is_internal)}),
        refresh_token=create_refresh_token({"sub": user.id, "role": user.role, "is_internal": bool(user.is_internal)}),
        role=user.role,
        assigned_job_id=assigned_job,
        is_internal=bool(user.is_internal),
    )
