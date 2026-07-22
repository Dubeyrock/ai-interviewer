from __future__ import annotations

import base64
import json

import anyio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
# pyrefly: ignore [missing-import]
from app.core.database import memory_db as db
# pyrefly: ignore [missing-import]
from app.services.answer_evaluator import AnswerEvaluator
# pyrefly: ignore [missing-import]
from app.services.emotion_analyzer import EmotionAnalyzer
# pyrefly: ignore [missing-import]
from app.services.hiring_decision_engine import decide_hiring
# pyrefly: ignore [missing-import]
from app.services.question_generator import QuestionGenerator
# pyrefly: ignore [missing-import]
from app.services.stt_service import STTService
# pyrefly: ignore [missing-import]
from app.services.tts_service import TTSService

router = APIRouter()
qg = QuestionGenerator()
evaluator = AnswerEvaluator()
emotion_analyzer = EmotionAnalyzer()
stt = STTService()
tts = TTSService()
MAX_INTERVIEW_QUESTIONS = 8


async def _send_question(websocket: WebSocket, question: str, gender: str = "female", language: str = "english") -> None:
    print(f"[WebSocket] Sending question: {question[:50]}..., gender: {gender}, language: {language}", flush=True)
    tts_audio = await anyio.to_thread.run_sync(tts.synthesize, question, gender, language)
    
    audio_b64 = base64.b64encode(tts_audio.audio).decode("ascii") if tts_audio.audio else ""
    print(f"[WebSocket] TTS provider: {tts_audio.provider}, audio size: {len(tts_audio.audio) if tts_audio.audio else 0} bytes", flush=True)
    
    payload = {
        "type": "question",
        "message": question,
        "tts_provider": tts_audio.provider,
        "audio_mime_type": tts_audio.mime_type,
        "audio": audio_b64,
    }
    await websocket.send_json(payload)


def _decode_audio(payload: dict) -> bytes:
    audio_b64 = str(payload.get("audio") or "")
    if "," in audio_b64:
        audio_b64 = audio_b64.split(",", 1)[1]
    if not audio_b64:
        return b""
    return base64.b64decode(audio_b64)


def _evaluate_answer(session: dict, answer: str, transcript: str, emotion_label: str | None) -> dict:
    candidate = db.get_candidate(session["candidate_id"])
    if not candidate:
        raise ValueError("Candidate not found")

    question = session.get("current_question") or "No active question"
    emotion = emotion_analyzer.analyze(transcript or answer, emotion_label)
    expected_points = qg.next_question(
        domain=session["domain"],
        job_role=session["job_role"],
        resume_text=candidate.get("resume_text") or "",
        job_description=session.get("job_description"),
        history=session.get("questions", []),
        last_score=session.get("scores", [])[-1] if session.get("scores") else None,
        language=session.get("language", "english"),
    ).get("expected_points", [])
    result = evaluator.evaluate(question=question, answer=answer, emotion=emotion.emotion, expected_points=expected_points)

    session.setdefault("answers", []).append(answer)
    session.setdefault("transcripts", []).append(transcript or answer)
    session.setdefault("scores", []).append(result.score)
    session.setdefault("emotions", []).append({"emotion": emotion.emotion, "confidence": emotion.confidence})

    completed = len(session["answers"]) >= MAX_INTERVIEW_QUESTIONS
    next_question = ""
    if completed:
        session["status"] = "completed"
    else:
        next_data = qg.next_question(
            domain=session["domain"],
            job_role=session["job_role"],
            resume_text=candidate.get("resume_text") or "",
            job_description=session.get("job_description"),
            history=session.get("questions", []),
            last_score=result.score,
            language=session.get("language", "english"),
        )
        next_question = next_data["question"]
        session.setdefault("questions", []).append(next_question)
        session["current_question"] = next_question
        session["status"] = "active"

    decision = decide_hiring(
        fit_score=float(candidate.get("fit_score", 0)),
        interview_scores=session.get("scores", []),
        emotion_scores=[item.get("confidence", 0) * 10 for item in session.get("emotions", [])],
        experience_text=candidate.get("experience"),
    )
    session["final_score"] = decision.final_score
    session["final_recommendation"] = decision.recommendation

    db.update_session(session["id"], session)
    db.update_candidate(candidate["id"], {
        "fit_score": int(max(candidate.get("fit_score", 0), decision.final_score)),
        "recommendation": decision.recommendation,
        "status": decision.recommendation.lower(),
        "final_score": decision.final_score,
    })

    return {
        "type": "evaluation",
        "session_id": session["id"],
        "question": question,
        "transcript": transcript or answer,
        "score": result.score,
        "confidence": result.confidence,
        "feedback": result.feedback,
        "emotion": emotion.emotion,
        "tone": emotion.tone,
        "next_question": next_question,
        "recommendation": decision.recommendation,
        "final_score": decision.final_score,
        "status": session["status"],
        "answers_count": len(session.get("answers", [])),
        "max_questions": MAX_INTERVIEW_QUESTIONS,
    }


@router.websocket("/ws/interview/{session_id}")
async def interview_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    session = db.get_session(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        return

    try:
        await websocket.send_json({"type": "ready", "session_id": session_id})
        gender = session.get("gender", "female")
        language = session.get("language", "english")
        await _send_question(websocket, session.get("current_question", ""), gender, language)
        while True:
            raw_payload = await websocket.receive_text()
            if raw_payload.strip().lower() == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            try:
                payload = json.loads(raw_payload)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid websocket payload"})
                continue

            message_type = payload.get("type")
            if message_type == "text_answer":
                transcript = str(payload.get("transcript") or payload.get("answer") or "").strip()
            elif message_type == "audio_answer":
                audio_bytes = _decode_audio(payload)
                provided_transcript = str(payload.get("transcript") or "").strip()
                transcript = provided_transcript or await anyio.to_thread.run_sync(
                    stt.transcribe,
                    audio_bytes,
                    str(payload.get("mime_type") or "audio/webm"),
                )
            else:
                await websocket.send_json({"type": "error", "message": f"Unsupported message type: {message_type}"})
                continue

            if not transcript:
                await websocket.send_json({"type": "error", "message": "No answer audio or transcript received"})
                continue

            session = db.get_session(session_id)
            if not session:
                await websocket.send_json({"type": "error", "message": "Session not found"})
                await websocket.close()
                return

            try:
                evaluation = _evaluate_answer(
                    session=session,
                    answer=transcript,
                    transcript=transcript,
                    emotion_label=payload.get("emotion"),
                )
            except ValueError as exc:
                await websocket.send_json({"type": "error", "message": str(exc)})
                continue

            await websocket.send_json(evaluation)
            if evaluation["status"] == "completed":
                await websocket.send_json({**evaluation, "type": "complete", "message": "Interview completed"})
            else:
                gender = session.get("gender", "female")
                language = session.get("language", "english")
                await _send_question(websocket, evaluation["next_question"], gender, language)
    except WebSocketDisconnect:
        return
