from __future__ import annotations

import base64

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.tts_service import TTSService

router = APIRouter()
tts = TTSService()


class TTSSynthesizeRequest(BaseModel):
    text: str
    gender: str = "female"
    language: str = "english"


@router.post("/synthesize")
def synthesize(payload: TTSSynthesizeRequest):
    result = tts.synthesize(payload.text, payload.gender, payload.language)
    audio_b64 = base64.b64encode(result.audio).decode("ascii") if result.audio else ""

    return {
        "provider": result.provider,
        "mime_type": result.mime_type,
        "audio": audio_b64,
        "has_audio": bool(audio_b64),
    }
