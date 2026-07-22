from __future__ import annotations

from dataclasses import dataclass


@dataclass
class EmotionResult:
    emotion: str
    confidence: float
    note: str


class EmotionAnalyzer:
    def analyze(self, transcript: str, face_signal: str | None = None) -> EmotionResult:
        text = (transcript or "").lower()
        signal = (face_signal or "").lower()

        if signal in {"confident", "calm", "smile", "positive"}:
            return EmotionResult(emotion="confident", confidence=0.9, note="Stable tone and presence")
        if signal in {"nervous", "stressed", "anxious"}:
            return EmotionResult(emotion="nervous", confidence=0.75, note="Candidate appears tense")
        if any(word in text for word in ["um", "uh", "maybe", "not sure"]):
            return EmotionResult(emotion="uncertain", confidence=0.6, note="Hesitation detected")
        if len(text.split()) > 35:
            return EmotionResult(emotion="engaged", confidence=0.8, note="Candidate is elaborating well")
        return EmotionResult(emotion="neutral", confidence=0.7, note="Neutral signal")
