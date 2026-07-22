from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, Query, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.models.interview import InterviewSession

router = APIRouter()

VIDEOS_DIR = Path("./storage/videos")
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_interview_video(session_id: str = Query(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload interview video for a session"""
    try:
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Create video record
        video_id = str(uuid.uuid4())
        video_filename = f"{session_id}_{file.filename}"
        video_path = VIDEOS_DIR / video_filename

        # Save file
        contents = await file.read()
        
        with open(video_path, "wb") as f:
            f.write(contents)
        
        # Update session with video reference
        session.video_id = video_id
        session.video_path = str(video_path)
        session.video_filename = video_filename
        session.video_size = len(contents)
        
        db.commit()

        return {
            "status": "success",
            "video_id": video_id,
            "message": "Video uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video upload failed: {str(e)}")


@router.get("/{video_id}/download")
async def download_interview_video(video_id: str, db: Session = Depends(get_db)):
    """Download interview video"""
    session = db.query(InterviewSession).filter(InterviewSession.video_id == video_id).first()
    if not session or not session.video_path:
        raise HTTPException(status_code=404, detail="Video not found")

    video_path = Path(session.video_path)
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    media_type = "video/webm" if video_path.suffix.lower() == ".webm" else "video/mp4"
    filename = session.video_filename or f"interview{video_path.suffix}"
    return FileResponse(
        video_path,
        media_type=media_type,
        filename=filename,
    )


@router.get("/session/{session_id}")
async def get_session_video(session_id: str, db: Session = Depends(get_db)):
    """Get video metadata for a session"""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.video_id:
        raise HTTPException(status_code=404, detail="Video not found for this session")

    return {
        "video_id": session.video_id,
        "session_id": session.id,
        "candidate_id": session.candidate_id,
        "filename": session.video_filename,
        "file_size": session.video_size,
    }
