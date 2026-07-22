from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.groq_service import GroqService
from app.services.rag_service import rag_service
from app.models.chatbot import ChatbotInteraction
from app.core.database import SessionLocal
import anyio

router = APIRouter()
groq = GroqService()

class ChatQuery(BaseModel):
    question: str
    track: str = "it"
    candidate_id: str | None = None

IT_PROMPT = """You are an AI interview assistant for IT candidates. Provide helpful, concise answers about technical interviews, coding, system design, and career preparation. Keep answers under 200 words."""

NON_IT_PROMPT = """You are an AI interview assistant for Non-IT candidates (HR, Marketing, Sales, Finance, etc.). Provide helpful, concise answers about behavioral interviews, soft skills, and domain-specific questions. Keep answers under 200 words."""

SALES_PROMPT = """You are the AI Sales Assistant for PratibhaAI, an AI-powered autonomous video interview platform built for HR teams in India. Help prospective customer companies with pricing, plans, and onboarding. Key facts: Starter is FREE (5 interviews/month, basic scoring, email support, PDF reports). Growth is ₹2,999/month (100 interviews/month, real-time Emotion AI, priority support, custom job roles, candidate video recording, team collaboration, detailed PDF reports). Enterprise is custom pricing (unlimited interviews, white-label branding, API access, dedicated support, custom integrations, SLA guarantee, on-premise option). Payment is via card or UPI on the Billing page; a PDF receipt is emailed on success. Companies must create an HR account to purchase. If a question needs a human, tell them to use the contact form / book a demo. Be concise (under 200 words), friendly, and sales-oriented."""

fallbackResponses: dict[str, str] = {
    "interview process": "The AI interview usually has 8 adaptive questions and takes about 15-20 minutes. You will be evaluated on technical skills, communication, confidence, and role fit based on your resume and job description.",
    "technical questions": "For technical interviews, prepare coding problems, data structures, algorithms, system design basics, and clear explanations of your projects.",
    "what to prepare": "Review your resume, key projects, core concepts for your role, and prepare short examples that show your problem-solving and communication skills.",
    "system design": "Common system design topics include APIs, databases, caching, load balancing, microservices, scalability, reliability, and trade-offs.",
    "hr questions": "For HR interviews, prepare answers for strengths, weaknesses, teamwork, conflict handling, career goals, and why you fit the role.",
    "behavioral": "Use the STAR method: Situation, Task, Action, and Result. Keep examples specific and focus on your contribution.",
    "experience": "Talk about your role responsibilities, key achievements, tools used, business impact, and how your experience matches the job.",
    "domain switch": "Highlight transferable skills, learning ability, relevant projects, and how your previous experience can add value in the new domain.",
}

def _get_fallback_answer(question: str, track: str) -> str:
    normalized = question.lower().strip()
    for key, answer in fallbackResponses.items():
        if key in normalized:
            return answer
    if track == "sales":
        return "PratibhaAI offers Starter (FREE, 5 interviews/month), Growth (₹2,999/month with 100 interviews, Emotion AI, custom job roles, video recording) and Enterprise (custom, unlimited + white-label + API + SLA). Create an HR account, open Billing, and pay by card or UPI — a PDF receipt is emailed instantly. For custom needs, book a demo."
    if track == "it":
        return "Focus on coding fundamentals, data structures, algorithms, system design basics, and clear project explanations. Practice explaining your approach step by step."
    return "Focus on communication, role-specific knowledge, behavioral examples, and how your experience matches the job requirements."


def _build_rag_context(question: str, candidate_id: str) -> str:
    try:
        chunks = rag_service.retrieve_relevant_chunks(candidate_id, question, top_k=3)
        if not chunks:
            return ""
        return "\n\n".join(f"[{chunk['section_type'].upper()}] {chunk['chunk_text']}" for chunk in chunks)
    except Exception:
        return ""


def _get_answer(question: str, track: str, candidate_id: str | None = None) -> str:
    prompt = SALES_PROMPT if track == "sales" else (IT_PROMPT if track == "it" else NON_IT_PROMPT)
    user_content = question

    if candidate_id:
        context = _build_rag_context(question, candidate_id)
        if context:
            user_content = (
                "Use the following candidate resume context to answer the question as clearly and professionally as possible.\n\n"
                f"{context}\n\n"
                f"Question: {question}"
            )

    if not groq.available():
        return _get_fallback_answer(question, track)
    try:
        return groq.chat(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_content}
            ]
        )
    except Exception:
        return _get_fallback_answer(question, track)

@router.post("/query")
async def chatbot_query(payload: ChatQuery):
    # Run sync code in thread to avoid blocking
    answer = await anyio.to_thread.run_sync(_get_answer, payload.question, payload.track, payload.candidate_id)
    
    # Save interaction to database
    db = SessionLocal()
    try:
        interaction = ChatbotInteraction(
            question=payload.question,
            answer=answer,
            track=payload.track,
            candidate_id=payload.candidate_id,
        )
        db.add(interaction)
        db.commit()
    except Exception:
        pass  # Don't fail if DB save fails
    finally:
        db.close()
    
    return {"answer": answer, "track": payload.track}