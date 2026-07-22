from __future__ import annotations

import base64

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.interview import AnswerSubmitRequest, AnswerSubmitResponse, InterviewSessionOut, StartInterviewRequest, InterviewSession
from app.models.candidate import Candidate
from app.services.answer_evaluator import AnswerEvaluator
from app.services.emotion_analyzer import EmotionAnalyzer
from app.services.hiring_decision_engine import decide_hiring
from app.services.question_generator import QuestionGenerator
from app.services.tts_service import TTSService

router = APIRouter()
qg = QuestionGenerator()
evaluator = AnswerEvaluator()
emotion_analyzer = EmotionAnalyzer()
tts = TTSService()
MAX_INTERVIEW_QUESTIONS = 8


@router.post("/start", response_model=InterviewSessionOut)
def start_interview(payload: StartInterviewRequest, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    session = None
    if candidate.session_id:
        session = db.query(InterviewSession).filter(InterviewSession.id == candidate.session_id).first()
        
    if not session:
        # Should not happen typically if candidate route created it, but just in case
        raise HTTPException(status_code=400, detail="Interview Session not initialized for candidate.")

    domain_lower = (candidate.domain or "").lower()
    if "it" in domain_lower or "tech" in domain_lower or "developer" in domain_lower:
        session.candidate_type = "IT"
    else:
        session.candidate_type = "Non-IT"

    if session.interview_stage == 0:
        session.interview_stage = 1
        question_data = qg.next_question(
            domain=candidate.domain or "",
            job_role=candidate.job_role or "",
            resume_text=candidate.resume_text or "",
            job_description=payload.job_description or candidate.job_description,
            history=[],
            last_score=None,
            language=payload.language or "english",
            candidate_id=candidate.id,  # Pass candidate_id for RAG
        )
    else:
        # Build history from previous questions
        history = session.questions or []
        question_data = qg.next_question(
            domain=candidate.domain or "",
            job_role=candidate.job_role or "",
            resume_text=candidate.resume_text or "",
            job_description=payload.job_description or candidate.job_description,
            history=history[-4:],  # Last 4 questions
            last_score=None,
            language=payload.language or "english",
            candidate_id=candidate.id,  # Pass candidate_id for RAG
        )

    session.current_question = question_data["question"]
    
    questions = session.questions or []
    questions.append(question_data["question"])
    session.questions = questions

    # Save gender and language to session
    session.gender = payload.gender or "female"
    session.language = payload.language or "english"
    candidate.current_question = session.current_question
    
    # Needs to be flagged as modified if using mutable JSON
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(session, "questions")

    db.commit()
    db.refresh(session)

    return InterviewSessionOut(
        id=session.id,
        candidate_id=session.candidate_id,
        candidate_name=candidate.full_name or "",
        domain=candidate.domain or "",
        job_role=candidate.job_role or "",
        job_description=candidate.job_description,
        current_question=session.current_question,
        questions=session.questions or [],
        answers=session.answers or [],
        scores=session.scores or [],
        status=session.status or "active",
        fit_score=session.fit_score or 0,
        recommendation=session.recommendation or "PENDING",
        max_questions=MAX_INTERVIEW_QUESTIONS,
        gender=session.gender or "female",
        language=session.language or "english",
        interview_stage=session.interview_stage or 0,
        candidate_type=session.candidate_type,
        interview_scores=session.interview_scores,
        stage_responses=session.stage_responses,
        final_recommendation=session.final_recommendation or "PENDING",
    )


@router.post("/answer", response_model=AnswerSubmitResponse)
def submit_answer(payload: AnswerSubmitRequest, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    candidate = db.query(Candidate).filter(Candidate.id == session.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    current_stage = session.interview_stage or 1
    question = session.current_question or "No active question"

    stage_eval = evaluator.evaluate_answer_by_stage(
        answer=payload.answer,
        stage=current_stage,
        candidate_type=session.candidate_type or "IT",
        question=question
    )

    stage_response = {
        "stage": current_stage,
        "question": question,
        "answer": payload.answer,
        "score": stage_eval.score,
        "category": stage_eval.category,
        "feedback": stage_eval.feedback,
    }
    
    stage_responses = session.stage_responses or []
    stage_responses.append(stage_response)
    session.stage_responses = stage_responses

    interview_scores = session.interview_scores or {
        "technical_score": 0,
        "communication_score": 0,
        "confidence_score": 0,
        "role_fit_score": 0,
        "behavioral_score": 0,
        "final_combined_score": 0
    }

    if current_stage == 1:
        interview_scores["communication_score"] = max(interview_scores.get("communication_score", 0), stage_eval.score * 0.5)
    elif current_stage == 2:
        interview_scores["communication_score"] = max(interview_scores.get("communication_score", 0), stage_eval.score)
    elif current_stage == 3:
        interview_scores["technical_score"] = max(interview_scores.get("technical_score", 0), stage_eval.score * 0.8)
    elif current_stage == 4:
        interview_scores["technical_score"] = max(interview_scores.get("technical_score", 0), stage_eval.score)
        interview_scores["role_fit_score"] = max(interview_scores.get("role_fit_score", 0), stage_eval.score * 0.7)
    elif current_stage == 5:
        interview_scores["behavioral_score"] = max(interview_scores.get("behavioral_score", 0), stage_eval.score * 0.8)
    elif current_stage == 6:
        interview_scores["behavioral_score"] = max(interview_scores.get("behavioral_score", 0), stage_eval.score)

    session.interview_scores = interview_scores
    
    answers = session.answers or []
    answers.append(payload.answer)
    session.answers = answers
    
    scores = session.scores or []
    scores.append(stage_eval.score / 10)
    session.scores = scores
    
    emotions = session.emotions or []
    emotions.append({"emotion": "neutral", "confidence": 0.7})
    session.emotions = emotions

    if current_stage >= 6:
        interview_scores["final_combined_score"] = evaluator.calculate_final_score(interview_scores)
        session.interview_scores = interview_scores

        final_recommendation = evaluator.get_recommendation(interview_scores["final_combined_score"])
        session.final_recommendation = final_recommendation
        session.status = "completed"

        candidate.fit_score = int(interview_scores["final_combined_score"])
        candidate.recommendation = final_recommendation
        candidate.status = final_recommendation.lower()

        next_question = "Interview completed. Thank you for attending!"
        next_data = {"question": next_question}
    else:
        next_stage = current_stage + 1
        session.interview_stage = next_stage

        # Build history from previous questions
        history = session.questions or []
        question_data = qg.next_question(
            domain=candidate.domain or "",
            job_role=candidate.job_role or "",
            resume_text=candidate.resume_text or "",
            job_description=candidate.job_description,
            history=history[-4:],  # Last 4 questions
            last_score=None,
            language=session.language or payload.language or "english",  # Use session language or request
            candidate_id=candidate.id,  # Pass candidate_id for RAG
        )
        next_question = question_data["question"]
        session.current_question = next_question
        
        questions = session.questions or []
        questions.append(next_question)
        session.questions = questions

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(session, "stage_responses")
    flag_modified(session, "interview_scores")
    flag_modified(session, "answers")
    flag_modified(session, "scores")
    flag_modified(session, "emotions")
    flag_modified(session, "questions")

    db.commit()

    return AnswerSubmitResponse(
        session_id=session.id,
        question=question,
        score=stage_eval.score,
        confidence=0.8,
        feedback=stage_eval.feedback,
        next_question=next_question,
        recommendation=session.final_recommendation or "PENDING",
        final_score=session.interview_scores.get("final_combined_score", 0),
        technical_score=session.interview_scores.get("technical_score", 0),
        communication_score=session.interview_scores.get("communication_score", 0),
        confidence_score=session.interview_scores.get("confidence_score", 0),
        role_fit_score=session.interview_scores.get("role_fit_score", 0),
        behavioral_score=session.interview_scores.get("behavioral_score", 0),
        status=session.status or "active",
    )


@router.get("/{session_id}", response_model=InterviewSessionOut)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    candidate = db.query(Candidate).filter(Candidate.id == session.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return InterviewSessionOut(
        id=session.id,
        candidate_id=session.candidate_id,
        candidate_name=candidate.full_name or "",
        domain=candidate.domain or "",
        job_role=candidate.job_role or "",
        job_description=candidate.job_description,
        current_question=session.current_question or "",
        questions=session.questions or [],
        answers=session.answers or [],
        scores=session.scores or [],
        status=session.status or "active",
        fit_score=session.fit_score or 0,
        recommendation=session.recommendation or "PENDING",
        max_questions=MAX_INTERVIEW_QUESTIONS,
        gender=session.gender or "female",
        language=session.language or "english",
        interview_stage=session.interview_stage or 0,
        candidate_type=session.candidate_type,
        interview_scores=session.interview_scores,
        stage_responses=session.stage_responses,
        final_recommendation=session.final_recommendation or "PENDING",
    )


@router.get("/end-interview/{session_id}")
def end_interview(session_id: str, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != "completed":
        raise HTTPException(status_code=400, detail="Interview not completed yet")

    scores = session.interview_scores or {}
    recommendation = session.final_recommendation or "PENDING"

    return {
        "session_id": session_id,
        "message": "Thank you for attending the interview!",
        "status": recommendation,
        "scores": {
            "technical_score": scores.get("technical_score", 0),
            "communication_score": scores.get("communication_score", 0),
            "confidence_score": scores.get("confidence_score", 0),
            "role_fit_score": scores.get("role_fit_score", 0),
            "behavioral_score": scores.get("behavioral_score", 0),
            "final_combined_score": scores.get("final_combined_score", 0),
        },
        "recommendation": recommendation,
        "final_message": "Your results will be sent to your email within 48 hours.",
        "stage_responses": session.stage_responses or [],
    }


@router.get("/test-tts/diagnose")
def test_tts_diagnose():
    test_text = "Hello! This is a test of the text-to-speech system."
    result_female = tts.synthesize(test_text, gender="female", language="english")
    result_male = tts.synthesize(test_text, gender="male", language="english")

    female_audio_b64 = base64.b64encode(result_female.audio).decode("ascii") if result_female.audio else ""
    male_audio_b64 = base64.b64encode(result_male.audio).decode("ascii") if result_male.audio else ""

    return {
        "status": "Test completed",
        "female_voice": {
            "provider": result_female.provider,
            "mime_type": result_female.mime_type,
            "audio_size_bytes": len(result_female.audio) if result_female.audio else 0,
            "has_audio": len(result_female.audio) > 0,
        },
        "male_voice": {
            "provider": result_male.provider,
            "mime_type": result_male.mime_type,
            "audio_size_bytes": len(result_male.audio) if result_male.audio else 0,
            "has_audio": len(result_male.audio) > 0,
        },
        "female_audio": female_audio_b64,
        "male_audio": male_audio_b64,
    }


# ── Emotion Sync ──────────────────────────────────────────────────────────────

class EmotionSyncRequest(BaseModel):
    session_id: str
    emotion: str
    confidence: float
    ear: float | None = None
    mar: float | None = None
    jitter: float | None = None
    blink_count: int | None = None
    talking_state: str | None = None


class EmotionSyncResponse(BaseModel):
    ok: bool
    session_id: str
    emotion_count: int


@router.post("/emotion", response_model=EmotionSyncResponse)
def sync_emotion(payload: EmotionSyncRequest, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    emotion_entry = {
        "emotion": payload.emotion,
        "confidence": payload.confidence,
        "ear": payload.ear,
        "mar": payload.mar,
        "jitter": payload.jitter,
        "blink_count": payload.blink_count,
        "talking_state": payload.talking_state,
        "stage": session.interview_stage or 0,
    }

    # Store in emotions JSON or create a separate emotion_timeline JSON. 
    # For compatibility, we can just append to `emotions` column
    emotions = session.emotions or []
    emotions.append(emotion_entry)
    session.emotions = emotions

    timeline = session.emotions
    if timeline:
        counts: dict[str, int] = {}
        total_confidence = 0.0
        total_jitter = 0.0
        jitter_count = 0
        for e in timeline[-20:]:
            # Emotion schema from dict vs new dict
            emo_val = e.get("emotion", "neutral") if isinstance(e, dict) else "neutral"
            conf_val = e.get("confidence", 0.7) if isinstance(e, dict) else 0.7
            jit_val = e.get("jitter") if isinstance(e, dict) else None
            
            counts[emo_val] = counts.get(emo_val, 0) + 1
            total_confidence += conf_val
            if jit_val is not None:
                total_jitter += jit_val
                jitter_count += 1

        dominant_emotion = max(counts, key=counts.__getitem__) if counts else "neutral"
        avg_confidence = total_confidence / len(timeline[-20:]) if timeline else 0.7
        avg_jitter = total_jitter / jitter_count if jitter_count else 0.0

        emotion_confidence_map = {
            "confident": 90,
            "engaged": 75,
            "neutral": 60,
            "nervous": 40,
        }
        derived_confidence_score = emotion_confidence_map.get(dominant_emotion, 60)

        interview_scores = session.interview_scores or {}
        interview_scores["confidence_score"] = max(
            interview_scores.get("confidence_score", 0),
            derived_confidence_score * avg_confidence,
        )
        session.interview_scores = interview_scores
        # Could add dominant_emotion and avg_jitter to DB model if needed
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(session, "emotions")
    flag_modified(session, "interview_scores")
    
    db.commit()
    
    return EmotionSyncResponse(
        ok=True,
        session_id=payload.session_id,
        emotion_count=len(session.emotions),
    )