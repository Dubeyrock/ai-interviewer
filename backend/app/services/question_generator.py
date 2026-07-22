"""
Question Generator — Structured HR Interview Flow
IT Track:     Intro → Why Hire → Salary → Technical → Resume Projects → Adapt Tech → Behavioral → Closing
Non-IT Track: Intro → Why Role → Resume Walk → Job Change → Strengths/Weakness → STAR Behavioral → Pressure → Salary → Client/Customer → Goals
"""
from __future__ import annotations

import re
import random
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.services.groq_service import groq_service
from app.services.resume_matcher import extract_skills
from app.services.rag_service import rag_service
import app.services.chroma_rag_service as chroma_module


# ── Candidate type detection ──────────────────────────────────────────────────
TECH_HINTS = [
    "python", "java", "javascript", "typescript", "react", "node", "django",
    "fastapi", "flask", "aws", "docker", "kubernetes", "sql", "mongodb",
    "machine learning", "ml", "ai", "api", "backend", "frontend", "cloud",
    "devops", "git", "linux", "data science", "deep learning", "nlp",
]
NON_TECH_HINTS = [
    "sales", "marketing", "hr", "recruitment", "finance", "operations",
    "customer", "client", "communication", "team", "leadership", "stakeholder",
    "training", "coordination", "accounts", "business development",
]
TECH_DOMAINS = {
    "it", "frontend", "backend", "data science", "devops",
    "cybersecurity", "ui/ux", "cloud", "ml", "ai",
}


# ── IT Interview Flow (10 questions) ─────────────────────────────────────────
IT_PHASES = [
    # (phase_name, question_count, label)
    ("intro",        1, "Introduction"),
    ("why_hire",     1, "Why Should We Hire You"),
    ("salary",       1, "Salary & Availability"),
    ("technical",    3, "Technical Round"),
    ("resume",       2, "Resume Based"),
    ("adapt_tech",   1, "Adaptability"),
    ("behavioral",   1, "Behavioral"),
]

# Non-IT Interview Flow (10 questions)
NON_IT_PHASES = [
    ("intro",        1, "Introduction"),
    ("why_role",     1, "Why This Role"),
    ("resume_walk",  1, "Resume Walkthrough"),
    ("job_change",   1, "Job Change Reason"),
    ("strengths",    1, "Strengths & Weaknesses"),
    ("behavioral",   2, "Behavioral / STAR"),
    ("pressure",     1, "Pressure & Deadlines"),
    ("salary",       1, "Salary Expectations"),
    ("closing",      1, "Future Goals"),
]


# ── Fallback question banks ───────────────────────────────────────────────────
# Questions are now designed to be resume-based - they ask specifics about the candidate's resume

IT_FALLBACKS = {
    "intro": {
        "en": "Tell me about yourself — your background, education, and what brought you to software development.",
        "hi": "अपने बारे में बताएं — आपकी शिक्षा, पृष्ठभूमि और आप software development में कैसे आए।",
    },
    "why_hire": {
        "en": "Why should we hire you for this role? What makes you stand out from other candidates?",
        "hi": "हम आपको इस भूमिका के लिए क्यों hire करें? आप अन्य candidates से अलग क्या हैं?",
    },
    "salary": {
        "en": "What are your salary expectations? Are you currently serving a notice period? Do you have any other offers in hand?",
        "hi": "आपकी salary expectations क्या हैं? क्या आप notice period में हैं? क्या आपके पास कोई और offer है?",
    },
    "technical_1": {
        "en": "Walk me through your tech stack — which programming languages, frameworks, and databases do you work with daily?",
        "hi": "अपना tech stack बताएं — आप daily कौन सी programming languages, frameworks और databases use करते हैं?",
    },
    "technical_2": {
        "en": "Looking at your resume, describe a technical challenge you faced in one of your projects and how you resolved it.",
        "hi": "आपके resume को देखकर बताएं कि आपके projects में से एक technical challenge क्या था और आपने इसे कैसे हल किया।",
    },
    "technical_3": {
        "en": "How quickly do you adapt to new technologies? Give an example of a new technology you learned recently and how you applied it.",
        "hi": "आप नई technologies को कितनी जल्दी सीखते हैं? कोई recent example दें जब आपने नई technology सीखी और use की।",
    },
    "resume_1": {
        "en": "Tell me about the most complex project on your resume — the problem, your approach, tech stack, and outcome.",
        "hi": "अपने resume के सबसे complex project के बारे में बताएं — problem, approach, tech stack और outcome।",
    },
    "resume_2": {
        "en": "From your resume, what is the achievement you are most proud of? How did you measure its impact?",
        "hi": "आपके resume में वह achievement क्या है जिस पर आपको सबसे ज़्यादा गर्व है? आपने उसका impact कैसे measure किया?",
    },
    "adapt_tech": {
        "en": "How do you stay updated with the latest technology trends? What learning resources do you use?",
        "hi": "आप latest technology trends से कैसे updated रहते हैं? आप कौन से learning resources use करते हैं?",
    },
    "behavioral": {
        "en": "Tell me about a time you had a conflict with a teammate or manager. How did you resolve it and what did you learn?",
        "hi": "कोई ऐसा समय बताएं जब आपका किसी teammate या manager से मतभेद हुआ। आपने इसे कैसे सुलझाया और क्या सीखा?",
    },
}

NON_IT_FALLBACKS = {
    "intro": {
        "en": "Tell me about yourself — your background, education, and key professional experiences so far.",
        "hi": "अपने बारे में बताएं — आपकी शिक्षा, पृष्ठभूमि और अब तक के प्रमुख professional अनुभव।",
    },
    "why_role": {
        "en": "Why do you want to work for our company in this specific role? What attracts you to this opportunity?",
        "hi": "आप हमारी company में इस specific role के लिए क्यों काम करना चाहते हैं? इस opportunity में आपको क्या attract करता है?",
    },
    "resume_walk": {
        "en": "Walk me through your resume — highlight your key responsibilities and achievements in each role.",
        "hi": "अपना resume walk-through करें — हर role में अपनी key responsibilities और achievements बताएं।",
    },
    "job_change": {
        "en": "Why are you looking for a change from your current role? What are you seeking in your next opportunity?",
        "hi": "आप अपनी current role से change क्यों चाहते हैं? अगले opportunity में आप क्या ढूंढ रहे हैं?",
    },
    "strengths": {
        "en": "What are your greatest strengths and one weakness? Give a real example for your strength and what you are doing to improve the weakness.",
        "hi": "आपकी सबसे बड़ी strengths और एक weakness क्या है? Strength का real example दें और weakness को improve करने के लिए क्या कर रहे हैं।",
    },
    "behavioral_1": {
        "en": "From your resume, describe a major challenge you faced at work. Using the STAR method — what was the Situation, Task, Action you took, and Result?",
        "hi": "आपके resume के आधार पर कोई बड़ी चुनौती बताएं जो काम में आपका सामना करनी पड़ी। STAR method use करें — Situation, Task, Action और Result।",
    },
    "behavioral_2": {
        "en": "Tell me about a time on your resume when you disagreed with a colleague or manager. How did you handle it professionally?",
        "hi": "आपके resume में वह समय बताएं जब आप किसी colleague या manager से असहमत थे। आपने इसे professionally कैसे handle किया?",
    },
    "pressure": {
        "en": "How do you handle pressure and tight deadlines? Give a specific example from your experience where you had to manage multiple priorities.",
        "hi": "आप pressure और tight deadlines को कैसे handle करते हैं? अपने experience से कोई specific example दें जहाँ आपको multiple priorities manage करनी पड़ी।",
    },
    "salary": {
        "en": "What are your salary expectations for this role? Are you comfortable with the work location and timings?",
        "hi": "इस role के लिए आपकी salary expectations क्या हैं? क्या आप work location और timings से comfortable हैं?",
    },
    "closing": {
        "en": "Where do you see yourself professionally in the next 3 to 5 years? How does this role align with your career goals?",
        "hi": "अगले 3 से 5 वर्षों में आप खुद को professionally कहाँ देखते हैं? यह role आपके career goals से कैसे align करती है?",
    },
}


# ── Resume section extraction ─────────────────────────────────────────────────

SECTION_HEADINGS = {
    "projects":       ["projects", "project", "personal projects", "academic projects"],
    "experience":     ["experience", "work experience", "internship", "employment"],
    "skills":         ["skills", "technical skills", "tools", "technologies", "tech stack"],
    "certifications": ["certifications", "courses", "training"],
    "education":      ["education", "qualification", "degree", "academics"],
}


@dataclass
class ResumeSections:
    projects: List[str]
    experience: List[str]
    skills: List[str]
    certifications: List[str]
    education: List[str]

    def best_project(self) -> str:
        return self.projects[0] if self.projects else ""

    def best_experience(self) -> str:
        return self.experience[0] if self.experience else ""

    def top_skills(self, n: int = 5) -> str:
        return ", ".join(self.skills[:n]) if self.skills else ""


def _split_lines(text: str | None) -> List[str]:
    if not text:
        return []
    lines = []
    for raw in text.replace("\r", "\n").split("\n"):
        line = re.sub(r"\s+", " ", raw.strip("•-* \t")).strip()
        if line:
            lines.append(line)
    return lines


def _extract_resume_sections(resume_text: str | None) -> ResumeSections:
    lines = _split_lines(resume_text)
    if not lines:
        return ResumeSections([], [], [], [], [])

    section_idx: Dict[str, List[int]] = {k: [] for k in SECTION_HEADINGS}
    for i, line in enumerate(lines):
        ll = line.lower().strip(":")
        for sec, headings in SECTION_HEADINGS.items():
            if any(h == ll or h in ll for h in headings):
                section_idx[sec].append(i)

    all_idx = sorted({i for v in section_idx.values() for i in v})
    extracted: Dict[str, List[str]] = {k: [] for k in SECTION_HEADINGS}

    for sec, indices in section_idx.items():
        for start in indices:
            nexts = [i for i in all_idx if i > start]
            end = min(nexts) if nexts else len(lines)
            block = [l for l in lines[start + 1: end] if len(l.strip()) >= 5]
            extracted[sec].extend(block)

    # dedupe + trim
    def clean(items: List[str], limit=5) -> List[str]:
        seen, out = set(), []
        for item in items:
            k = item.lower()
            if k not in seen:
                seen.add(k)
                out.append(item[:200])
            if len(out) >= limit:
                break
        return out

    return ResumeSections(
        projects=clean(extracted["projects"]),
        experience=clean(extracted["experience"]),
        skills=clean(extracted["skills"]),
        certifications=clean(extracted["certifications"]),
        education=clean(extracted["education"]),
    )


def _infer_candidate_type(domain: str, job_role: str, resume_text: str, skills: List[str]) -> str:
    domain_l = (domain or "").lower()
    role_l   = (job_role or "").lower()
    resume_l = (resume_text or "").lower()

    # First check for explicit Non-IT domain (handle "non-it", "non it", "nonit" variants)
    if domain_l in ("non-it", "non it", "nonit", "non_technical", "non-technical"):
        return "non_it"

    # Check for explicit IT domain
    if domain_l in TECH_DOMAINS or domain_l in ("it", "information technology", "tech", "technical"):
        return "it"

    # Check if any tech domain is a word/phrase in the role (not just substring)
    for d in TECH_DOMAINS:
        if d in role_l and "non" not in role_l.replace(d, ""):
            return "it"

    # Fall back to analyzing resume content and skills
    tech_hits    = sum(1 for w in TECH_HINTS if w in resume_l)
    nontech_hits = sum(1 for w in NON_TECH_HINTS if w in resume_l)
    for s in skills:
        sl = s.lower()
        tech_hits    += sum(1 for w in TECH_HINTS if w in sl)
        nontech_hits += sum(1 for w in NON_TECH_HINTS if w in sl)

    return "it" if tech_hits >= nontech_hits else "non_it"


def _get_phase(phases: list, q_index: int) -> tuple[str, int, str]:
    """Returns (phase_name, phase_idx, label)"""
    count = 0
    for name, n, label in phases:
        if q_index < count + n:
            return name, q_index - count, label
        count += n
    last = phases[-1]
    return last[0], 0, last[2]


def _normalize_language(language: str | None) -> str:
    lang = (language or "english").strip().lower()
    return "hi" if lang in {"hindi", "hi", "हिंदी"} else "en"


# ── Main class ────────────────────────────────────────────────────────────────

class QuestionGenerator:

    def next_question(
        self,
        domain: str,
        job_role: str,
        resume_text: str,
        job_description: str | None,
        history: list[str],
        last_score: float | None = None,
        language: str = "english",
        candidate_id: str | None = None,  # NEW: for RAG lookup
    ) -> dict[str, Any]:

        lang         = _normalize_language(language)
        resume_text  = " ".join((resume_text or "").split())
        job_desc     = " ".join((job_description or "").split())

        skills       = extract_skills(resume_text)
        jd_skills    = extract_skills(job_desc)
        all_skills   = list(dict.fromkeys(skills + jd_skills))

        sections     = _extract_resume_sections(resume_text)
        ctype        = _infer_candidate_type(domain, job_role, resume_text, all_skills)
        phases       = IT_PHASES if ctype == "it" else NON_IT_PHASES
        q_index      = len(history)
        phase_name, phase_idx, phase_label = _get_phase(phases, q_index)

        difficulty = (
            "hard"   if last_score is not None and last_score >= 8 else
            "easy"   if last_score is not None and last_score < 5  else
            "medium"
        )

        # Try Groq LLM first with RAG-enhanced context
        if groq_service.available():
            q = self._groq_question(
                ctype=ctype,
                phase_name=phase_name,
                phase_idx=phase_idx,
                phase_label=phase_label,
                domain=domain,
                job_role=job_role,
                sections=sections,
                all_skills=all_skills,
                job_desc=job_desc[:400],
                history=history[-4:],
                difficulty=difficulty,
                lang=lang,
                candidate_id=candidate_id,  # Pass candidate_id for RAG
            )
            if q:
                return self._build_result(q, phase_name, phase_label, difficulty, lang, ctype)

        # Fallback
        fallback_q = self._fallback_question(
            ctype, phase_name, phase_idx, sections, all_skills, lang
        )
        return self._build_result(fallback_q, phase_name, phase_label, difficulty, lang, ctype)

    # ── Groq prompt ───────────────────────────────────────────────────────────

    def _groq_question(
        self, ctype, phase_name, phase_idx, phase_label,
        domain, job_role, sections, all_skills,
        job_desc, history, difficulty, lang,
        candidate_id: str | None = None,
    ) -> str | None:

        lang_instr = (
            "Generate the question in professional Hindi. Use simple Hindi. English tech terms allowed."
            if lang == "hi"
            else "Generate the question in professional English."
        )

        track = "IT/Technical" if ctype == "it" else "Non-IT/Business"

        # Phase-specific guidance
        phase_guidance = self._phase_guidance(
            ctype, phase_name, phase_idx, sections, all_skills, job_role, difficulty
        )

        # RAG: Retrieve resume-specific context if candidate_id is provided
        rag_context = ""
        if candidate_id:
            try:
                chroma_service = getattr(chroma_module, 'chroma_rag_service', None)
                if chroma_service:
                    rag_context = chroma_service.get_context_for_question(
                        candidate_id=candidate_id,
                        question_type=phase_name,
                        job_role=job_role,
                        domain=domain
                    )
                else:
                    rag_context = rag_service.get_context_for_question(
                        candidate_id=candidate_id,
                        question_type=phase_name,
                        job_role=job_role,
                        domain=domain
                    )
            except Exception as e:
                print(f"RAG context retrieval failed: {e}")

        # Build candidate info with RAG context
        candidate_info = f"""Candidate Info:
- Role Applied: {job_role} ({domain})
- Track: {track}
- Skills from Resume: {", ".join(all_skills[:8]) or "N/A"}
- Projects: {", ".join(sections.projects[:2]) or "N/A"}
- Experience: {sections.best_experience() or "N/A"}
- JD Requirements: {job_desc[:200] or "N/A"}"""

        if rag_context:
            candidate_info += f"\n\nResume Context (from candidate's actual resume):\n{rag_context}"

        prompt = f"""You are an expert HR interviewer conducting a structured {track} interview.

Phase: {phase_label}
{phase_guidance}

{candidate_info}

Previous Questions Asked: {history or "None yet"}

Language: {lang_instr}

Rules:
- Ask exactly ONE question
- Under 40 words
- 100% specific to THIS candidate's resume — reference their actual projects, experience, or skills
- Use the Resume Context above to make the question hyper-personalized
- Sound like a real HR interviewer
- Do NOT repeat previous questions
- Return ONLY the question text — no numbering, no quotes, no explanation"""

        try:
            raw = groq_service.chat(
                [
                    {"role": "system", "content": "You are a professional HR interviewer. Return ONLY the interview question text. Nothing else."},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.5,
                json_mode=False,
            )
            if raw and len(raw.strip()) > 10:
                cleaned = re.sub(r'^[\d\.\)\-\s"\']+', '', raw.strip()).strip('"\'')
                return cleaned if len(cleaned) > 10 else None
        except Exception:
            pass
        return None

    def _phase_guidance(
        self, ctype, phase_name, phase_idx, sections, all_skills, job_role, difficulty
    ) -> str:
        """IT and Non-IT phase-specific instructions for Groq."""

        if ctype == "it":
            return {
                "intro": (
                    "INTRODUCTION phase.\n"
                    "Ask candidate to introduce themselves — background, education, and journey into tech."
                ),
                "why_hire": (
                    "WHY HIRE US phase.\n"
                    "Ask why we should hire them for this specific role. What makes them stand out?"
                ),
                "salary": (
                    "SALARY & AVAILABILITY phase.\n"
                    "Ask about salary expectations, notice period, and if they have other offers."
                ),
                "technical": (
                    f"TECHNICAL ROUND — question {phase_idx + 1} of 3. Difficulty: {difficulty}.\n"
                    f"Resume skills: {', '.join(all_skills[:6]) or 'N/A'}.\n"
                    f"Projects: {', '.join(sections.projects[:2]) or 'N/A'}.\n"
                    "Ask a SPECIFIC technical question based on their resume skills/projects.\n"
                    "Q1: Core technical concepts or architecture.\n"
                    "Q2: Problem-solving — bug, performance, or system design.\n"
                    "Q3: How they adapt to new technology."
                ),
                "resume": (
                    f"RESUME-BASED phase — question {phase_idx + 1} of 2.\n"
                    f"Best project: {sections.best_project() or 'N/A'}.\n"
                    f"Experience: {sections.best_experience() or 'N/A'}.\n"
                    "Q1: Ask about their best project — problem, approach, tech stack, outcome.\n"
                    "Q2: Ask about their proudest achievement and measurable impact."
                ),
                "adapt_tech": (
                    "ADAPTABILITY phase.\n"
                    "Ask how they stay updated with latest tech trends. What do they learn recently?"
                ),
                "behavioral": (
                    "BEHAVIORAL phase.\n"
                    "Ask about a conflict with teammate/manager — how they resolved it (STAR format)."
                ),
            }.get(phase_name, "Ask a relevant interview question.")

        else:  # non_it
            return {
                "intro": (
                    "INTRODUCTION phase.\n"
                    "Ask candidate to introduce themselves — background, education, key experiences."
                ),
                "why_role": (
                    "WHY THIS ROLE phase.\n"
                    f"Ask why they want to work in {job_role} at our company. What attracts them?"
                ),
                "resume_walk": (
                    "RESUME WALKTHROUGH phase.\n"
                    f"Experience: {sections.best_experience() or 'N/A'}.\n"
                    "Ask them to walk through their resume — key responsibilities and achievements."
                ),
                "job_change": (
                    "JOB CHANGE REASON phase.\n"
                    "Ask why they are looking for a change. Keep it positive and growth-focused."
                ),
                "strengths": (
                    "STRENGTHS & WEAKNESSES phase.\n"
                    "Ask their greatest strength with a real example, and one weakness with improvement plan."
                ),
                "behavioral": (
                    f"BEHAVIORAL / STAR phase — question {phase_idx + 1} of 2.\n"
                    "Q1: A major challenge they faced — STAR format (Situation, Task, Action, Result).\n"
                    "Q2: Conflict with colleague/manager — how they handled it professionally."
                ),
                "pressure": (
                    "PRESSURE & DEADLINES phase.\n"
                    "Ask how they handle pressure/tight deadlines with a specific real example."
                ),
                "salary": (
                    "SALARY EXPECTATIONS phase.\n"
                    "Ask salary expectations, location preference, and any other offers in hand."
                ),
                "closing": (
                    "CLOSING / FUTURE GOALS phase.\n"
                    f"Ask where they see themselves in 3-5 years and how {job_role} aligns with goals."
                ),
            }.get(phase_name, "Ask a relevant HR interview question.")

    # ── Fallback ──────────────────────────────────────────────────────────────

    def _fallback_question(
        self, ctype, phase_name, phase_idx, sections, all_skills, lang
    ) -> str:
        if ctype == "it":
            bank = IT_FALLBACKS
            phase_key_map = {
                "intro":       "intro",
                "why_hire":    "why_hire",
                "salary":      "salary",
                "technical":   f"technical_{phase_idx + 1}" if phase_idx < 3 else "technical_1",
                "resume":      f"resume_{phase_idx + 1}" if phase_idx < 2 else "resume_1",
                "adapt_tech":  "adapt_tech",
                "behavioral":  "behavioral",
            }
        else:
            bank = NON_IT_FALLBACKS
            phase_key_map = {
                "intro":       "intro",
                "why_role":    "why_role",
                "resume_walk": "resume_walk",
                "job_change":  "job_change",
                "strengths":   "strengths",
                "behavioral":  f"behavioral_{phase_idx + 1}" if phase_idx < 2 else "behavioral_1",
                "pressure":    "pressure",
                "salary":      "salary",
                "closing":     "closing",
            }

        key = phase_key_map.get(phase_name, "intro")
        entry = bank.get(key, bank.get("intro", {}))
        return entry.get(lang, entry.get("en", "Tell me about yourself."))

    # ── Result builder ────────────────────────────────────────────────────────

    @staticmethod
    def _build_result(
        question: str, phase_name: str, phase_label: str,
        difficulty: str, lang: str, ctype: str
    ) -> dict[str, Any]:

        follow_ups = {
            "en": {
                "easy":   "Can you explain that in more detail with an example?",
                "medium": "Can you give a specific example from your experience?",
                "hard":   "What were the trade-offs and what would you do differently?",
            },
            "hi": {
                "easy":   "क्या आप इसे एक example के साथ और विस्तार से समझा सकते हैं?",
                "medium": "क्या आप अपने experience से एक specific example दे सकते हैं?",
                "hard":   "इसमें क्या trade-offs थे और आप क्या अलग करते?",
            },
        }

        it_expected = {
            "intro":      ["Clear background", "Tech journey", "Communication clarity"],
            "why_hire":   ["Unique value", "Role alignment", "Confidence"],
            "salary":     ["Salary range", "Notice period", "Other offers"],
            "technical":  ["Technical depth", "Real examples", "Problem-solving"],
            "resume":     ["Project clarity", "Tech stack", "Measurable impact"],
            "adapt_tech": ["Learning approach", "Recent example", "Curiosity"],
            "behavioral": ["STAR format", "Self-awareness", "Conflict resolution"],
        }
        non_it_expected = {
            "intro":       ["Clear background", "Key experiences", "Communication"],
            "why_role":    ["Company knowledge", "Role motivation", "Enthusiasm"],
            "resume_walk": ["Achievement focus", "Role clarity", "Impact"],
            "job_change":  ["Positive framing", "Growth focus", "Honesty"],
            "strengths":   ["Specific strength", "Real example", "Honest weakness"],
            "behavioral":  ["STAR format", "Ownership", "Learning"],
            "pressure":    ["Prioritization", "Calm approach", "Real example"],
            "salary":      ["Market awareness", "Flexibility", "Clarity"],
            "closing":     ["Career vision", "Role alignment", "Ambition"],
        }

        expected = (it_expected if ctype == "it" else non_it_expected).get(
            phase_name, ["Clear answer", "Specific example", "Impact"]
        )

        return {
            "question":        question,
            "phase":           phase_name,
            "phase_label":     phase_label,
            "candidate_track": "IT" if ctype == "it" else "Non-IT",
            "difficulty":      difficulty,
            "follow_up":       follow_ups[lang][difficulty],
            "expected_points": expected,
        }

    # ── Stage-based method (backward compatible) ──────────────────────────────

    def next_question_by_stage(
        self,
        stage: int,
        candidate_type: str,
        resume_text: str,
        job_description: str | None,
        language: str = "english",
    ) -> dict[str, Any]:
        """Backward compatible — maps stage number to next_question."""
        return self.next_question(
            domain=candidate_type,
            job_role=candidate_type,
            resume_text=resume_text,
            job_description=job_description,
            history=[""] * max(0, stage - 1),
            language=language,
        )