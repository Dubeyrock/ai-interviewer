from __future__ import annotations

from dataclasses import dataclass
import re


@dataclass
class EvaluationResult:
    score: float
    confidence: float
    feedback: str
    strengths: list[str]
    weaknesses: list[str]


@dataclass
class StageEvaluationResult:
    score: float
    category: str  # "technical" or "communication" or "behavioral"
    feedback: str
    stage: int


TECH_TERMS = {
    "api", "authentication", "authorization", "database", "scalability", "caching",
    "redis", "docker", "kubernetes", "fastapi", "react", "python", "testing",
    "analysis", "metrics", "model", "pipeline", "latency", "optimization", "security",
}


class AnswerEvaluator:
    def evaluate(self, question: str, answer: str, emotion: str | None = None, expected_points: list[str] | None = None) -> EvaluationResult:
        text = (answer or "").strip()
        lower = text.lower()
        words = re.findall(r"\w+", lower)

        length_score = min(2.0, len(words) / 40)
        tech_score = min(4.0, sum(1 for term in TECH_TERMS if term in lower) * 0.6)
        structure_score = 1.5 if any(marker in lower for marker in ["first", "second", "for example", "because", "therefore"]) else 0.5
        relevance_score = 2.5 if any(token in lower for token in question.lower().split()[:6]) else 1.5

        emotion_bonus = 0.0
        confidence = 0.6
        emotion_lower = (emotion or "neutral").lower()
        if emotion_lower in {"confident", "calm", "positive"}:
            emotion_bonus = 0.5
            confidence = 0.85
        elif emotion_lower in {"nervous", "stressed"}:
            confidence = 0.5

        score = round(min(10.0, length_score + tech_score + structure_score + relevance_score + emotion_bonus), 2)

        strengths = []
        weaknesses = []
        if tech_score >= 2:
            strengths.append("Used relevant technical terms")
        else:
            weaknesses.append("Needs more technical depth")

        if structure_score >= 1:
            strengths.append("Answer is structured")
        else:
            weaknesses.append("Answer should be organized better")

        if expected_points:
            matched = sum(1 for point in expected_points if point.lower() in lower)
            if matched == 0:
                weaknesses.append("Missed the main expected points")
            elif matched >= 2:
                strengths.append("Covered multiple expected points")

        if len(words) < 20:
            weaknesses.append("Answer is too short")

        if score >= 8:
            feedback = "Strong answer. Add one real-world example or metric to make it even better."
        elif score >= 5:
            feedback = "Good start. Add more depth, examples, and role-specific detail."
        else:
            feedback = "The answer is too generic. Explain the concept, then support it with an example."

        return EvaluationResult(score=score, confidence=confidence, feedback=feedback, strengths=strengths, weaknesses=weaknesses)

    def evaluate_answer_by_stage(self, answer: str, stage: int, candidate_type: str, question: str = "") -> StageEvaluationResult:
        """
        Evaluates answer based on interview stage and returns stage-specific scores.
        
        Stage 1: Verification - Basic info collection
        Stage 2: HR Screening - Background assessment
        Stage 3: Technical/Functional - Technical knowledge
        Stage 4: Resume-Based - Experience validation
        Stage 5: Scenario-Based - Problem-solving
        Stage 6: Behavioral - Soft skills assessment
        """
        text = (answer or "").strip()
        lower = text.lower()
        words = re.findall(r"\w+", lower)
        
        # Base scoring
        length_score = min(2.5, len(words) / 35)
        structure_score = 1.5 if any(marker in lower for marker in ["first", "second", "for example", "because", "therefore"]) else 0.5
        
        if stage == 1:
            # Stage 1: Verification - Check if basic info provided
            category = "communication"
            verification_keywords = ["name", "email", "phone", "role", "experience", "year", "developer", "engineer"]
            keyword_match = sum(1 for kw in verification_keywords if kw in lower) * 0.8
            score = round(min(10.0, length_score + keyword_match + structure_score), 2)
            feedback = "Candidate info collected successfully" if len(words) > 10 else "Please provide more details"
            
        elif stage == 2:
            # Stage 2: HR Screening - Background and expectations
            category = "communication"
            hr_keywords = ["company", "college", "notice", "salary", "location", "company", "period", "motivation"]
            hr_match = sum(1 for kw in hr_keywords if kw in lower) * 0.7
            clarity_score = 1.5 if len(words) > 50 else 1.0
            score = round(min(10.0, length_score + hr_match + clarity_score), 2)
            feedback = "Good background information provided" if hr_match > 2 else "Add more details about your background"
            
        elif stage == 3:
            # Stage 3: Technical/Functional Questions
            category = "technical"
            tech_score = min(4.0, sum(1 for term in TECH_TERMS if term in lower) * 0.7)
            depth_score = min(2.0, len(words) / 50)
            specificity_score = 1.5 if any(term in lower for term in ["example", "project", "implemented", "built"]) else 0.5
            score = round(min(10.0, length_score + tech_score + depth_score + specificity_score), 2)
            feedback = "Strong technical depth" if score >= 7 else "Add more technical details and examples"
            
        elif stage == 4:
            # Stage 4: Resume-Based Questions
            category = "technical"
            project_keywords = ["project", "developed", "built", "implemented", "designed", "created", "challenged", "achieved"]
            project_match = sum(1 for kw in project_keywords if kw in lower) * 0.8
            detail_score = min(2.5, len(words) / 40)
            score = round(min(10.0, length_score + project_match + detail_score + structure_score), 2)
            feedback = "Project well explained" if score >= 7 else "Provide more details about your project"
            
        elif stage == 5:
            # Stage 5: Scenario-Based Questions
            category = "behavioral"
            approach_keywords = ["approach", "solution", "steps", "problem", "analyze", "identify", "resolve", "reason"]
            approach_match = sum(1 for kw in approach_keywords if kw in lower) * 0.75
            problem_solving = min(2.0, len(words) / 60)
            score = round(min(10.0, length_score + approach_match + problem_solving + structure_score), 2)
            feedback = "Good problem-solving approach" if score >= 7 else "Explain your approach more clearly"
            
        elif stage == 6:
            # Stage 6: Behavioral Assessment
            category = "behavioral"
            behavior_keywords = ["strength", "weakness", "team", "leadership", "pressure", "experience", "learned", "improved"]
            behavior_match = sum(1 for kw in behavior_keywords if kw in lower) * 0.7
            insight_score = min(2.0, len(words) / 50)
            score = round(min(10.0, length_score + behavior_match + insight_score + structure_score), 2)
            feedback = "Good self-awareness" if score >= 7 else "Provide more specific examples"
            
        else:
            category = "communication"
            score = round(min(10.0, length_score + structure_score), 2)
            feedback = "Answer recorded"
        
        # Convert 0-10 score to 0-100
        score_normalized = score * 10
        
        return StageEvaluationResult(
            score=round(score_normalized, 2),
            category=category,
            feedback=feedback,
            stage=stage
        )

    @staticmethod
    def calculate_final_score(scores_dict: dict) -> float:
        """
        Calculates final combined score from all 6 speaking stages.
        Formula: (Technical*0.25) + (Communication*0.20) + (Confidence*0.15) + 
                 (RoleFit*0.20) + (Behavioral*0.20) = Final Score (0-100)
        """
        technical = scores_dict.get("technical_score", 0)
        communication = scores_dict.get("communication_score", 0)
        confidence = scores_dict.get("confidence_score", 0)
        role_fit = scores_dict.get("role_fit_score", 0)
        behavioral = scores_dict.get("behavioral_score", 0)
        
        final_score = (
            (technical * 0.25) +
            (communication * 0.20) +
            (confidence * 0.15) +
            (role_fit * 0.20) +
            (behavioral * 0.20)
        )
        
        return round(final_score, 2)

    @staticmethod
    def get_recommendation(final_score: float) -> str:
        """
        Returns hiring recommendation based on final score.
        SELECTED: >= 70
        HOLD: 50-69
        REJECTED: < 50
        """
        if final_score >= 70:
            return "SELECTED"
        elif final_score >= 50:
            return "HOLD"
        else:
            return "REJECTED"
