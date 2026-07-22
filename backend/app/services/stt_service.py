from __future__ import annotations

import logging
import os
import time
from pathlib import Path

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

audio_prefixes = (b"RIFF", b"WEBM", b"OggS", b"ID3", b"\xff\xfb", b"fLaC", b"\x1aE\xdf\xa3")
SUPPORTED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".mpeg", ".mp4", ".m4a", ".webm", ".ogg"}
UPLOAD_TEMP_DIR = Path(os.getenv("TEMP", "/tmp")) / "interviewer_audio"
UPLOAD_TEMP_DIR.mkdir(parents=True, exist_ok=True)


def _validate_audio(audio_bytes: bytes, filename: str | None = None) -> None:
    if not audio_bytes:
        raise ValueError("Empty audio payload.")
    if not any(audio_bytes.startswith(header) for header in audio_prefixes):
        raise ValueError("Unsupported audio format or file appears to be an image.")
    if filename:
        extension = Path(filename).suffix.lower()
        if extension not in SUPPORTED_AUDIO_EXTENSIONS:
            raise ValueError(f"Unsupported audio file extension: {extension}")


class STTService:
    def _upload_file_with_retry(self, file_path: Path, data: dict, headers: dict) -> dict:
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                with httpx.Client(timeout=90.0) as client:
                    with file_path.open("rb") as f:
                        files = {"file": (file_path.name, f, "application/octet-stream")}
                        response = client.post(
                            "https://api.groq.com/openai/v1/audio/transcriptions",
                            headers=headers,
                            data=data,
                            files=files,
                        )
                        response.raise_for_status()
                        return response.json()
            except httpx.TransportError as exc:
                if attempt == max_attempts:
                    raise
                time.sleep(min(2 ** attempt, 10))

    def transcribe(self, audio_bytes: bytes, mime_type: str = "audio/webm", filename: str | None = None) -> str:
        if not audio_bytes:
            return ""

        try:
            _validate_audio(audio_bytes, filename)
        except ValueError as exc:
            logger.warning("Audio validation failed: %s", exc)
            return ""

        if not settings.groq_api_key:
            return "Audio received. Enable GROQ_API_KEY for transcription."

        suffix = ".webm"
        if "mp4" in mime_type:
            suffix = ".mp4"
        elif "mpeg" in mime_type or "mp3" in mime_type:
            suffix = ".mp3"
        elif "wav" in mime_type:
            suffix = ".wav"

        extension = Path(filename or "").suffix.lower() or suffix
        if extension not in SUPPORTED_AUDIO_EXTENSIONS:
            extension = suffix

        tmp_path = None
        try:
            tmp_path = UPLOAD_TEMP_DIR / f"stt_{int(time.time() * 1000)}_{os.getpid()}{extension}"
            tmp_path.write_bytes(audio_bytes)

            data = {
                "model": settings.groq_whisper_model,
                "response_format": "json",
            }
            headers = {
                "Authorization": f"Bearer {settings.groq_api_key}",
            }

            payload = self._upload_file_with_retry(tmp_path, data, headers)
        except Exception as exc:
            logger.warning("Transcription failed: %s", exc)
            return ""
        finally:
            if tmp_path and tmp_path.exists():
                try:
                    tmp_path.unlink()
                except OSError:
                    pass

        text = str(payload.get("text") or "").strip()
        if not text:
            logger.warning("Empty transcript from provider.")
        return text
