from __future__ import annotations

from dataclasses import dataclass


@dataclass
class HiringDecision:
    final_score: float
    recommendation: str
    strengths: list[str]
    weaknesses: list[str]


def decide_hiring(fit_score: float, interview_scores: list[float], emotion_scores: list[float] | None = None, experience_text: str | None = None) -> HiringDecision:
    interview_avg = sum(interview_scores) / len(interview_scores) if interview_scores else 0.0
    emotion_avg = sum(emotion_scores) / len(emotion_scores) if emotion_scores else 0.0

    experience_bonus = 0.0
    if experience_text:
        lower = experience_text.lower()
        if any(token in lower for token in ["5+", "5 years", "senior", "lead"]):
            experience_bonus = 4.0
        elif any(token in lower for token in ["2 years", "3 years", "mid-level"]):
            experience_bonus = 2.0

    final_score = round((fit_score * 0.35) + (interview_avg * 0.5) + (emotion_avg * 0.15) + experience_bonus, 2)
    recommendation = "SELECTED" if final_score >= 70 else "REJECTED"

    strengths = []
    weaknesses = []
    if fit_score >= 70:
        strengths.append("Strong resume-job alignment")
    else:
        weaknesses.append("Resume alignment is below threshold")

    if interview_avg >= 7:
        strengths.append("Good interview performance")
    elif interview_avg > 0:
        weaknesses.append("Interview answers need more depth")

    if emotion_avg >= 7:
        strengths.append("Stable confidence and presence")
    elif emotion_avg > 0:
        weaknesses.append("Confidence can improve")

    return HiringDecision(final_score=final_score, recommendation=recommendation, strengths=strengths, weaknesses=weaknesses)
