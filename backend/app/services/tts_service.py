from __future__ import annotations

import asyncio
import io
from dataclasses import dataclass

import edge_tts

from app.core.config import settings


@dataclass
class TTSAudio:
    audio: bytes
    mime_type: str
    provider: str


# Edge-TTS voice mapping for Indian English/Hindi, male/female
EDGE_VOICE_MAP = {
    ("male", "hindi"): "hi-IN-MadhurNeural",
    ("female", "hindi"): "hi-IN-SwaraNeural",
    ("male", "english"): "en-IN-PrabhatNeural",
    ("female", "english"): "en-IN-NeerjaNeural",
}


class TTSService:
    def synthesize(self, text: str, gender: str = "female", language: str = "english") -> TTSAudio:
        clean_text = (text or "").strip()
        if not clean_text:
            print(f"[TTS] Empty text provided", flush=True)
            return TTSAudio(audio=b"", mime_type="application/octet-stream", provider="none")

        print(f"[TTS] Synthesizing text: {clean_text[:50]}...", flush=True)
        print(f"[TTS] Gender: {gender}, Language: {language}", flush=True)

        gender_key = (gender or "female").lower()
        language_key = (language or "english").lower()

        voice_name = EDGE_VOICE_MAP.get((gender_key, language_key))
        if not voice_name:
            # Safe fallback if combination not found
            voice_name = EDGE_VOICE_MAP.get((gender_key, "english"), "en-IN-NeerjaNeural")
            print(f"[TTS] No exact voice match, falling back to: {voice_name}", flush=True)

        print(f"[TTS] Selected edge-tts voice: {voice_name}", flush=True)

        try:
            audio_bytes = asyncio.run(self._generate_audio(clean_text, voice_name))
            audio_size = len(audio_bytes)
            print(f"[TTS] Successfully generated audio, size: {audio_size} bytes", flush=True)
            return TTSAudio(audio=audio_bytes, mime_type="audio/mpeg", provider="edge-tts")
        except Exception as e:
            print(f"[TTS] Exception during synthesis: {type(e).__name__}: {str(e)}", flush=True)
            return TTSAudio(audio=b"", mime_type="application/octet-stream", provider="browser")

    @staticmethod
    async def _generate_audio(text: str, voice: str) -> bytes:
        communicate = edge_tts.Communicate(text, voice)
        buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buffer.write(chunk["data"])
        return buffer.getvalue()