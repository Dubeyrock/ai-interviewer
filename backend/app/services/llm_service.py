from typing import List


class LLMService:
    def generate_question(self, domain: str, history: List[str], job_description: str | None = None) -> str:
        domain = domain.lower().strip()
        base = {
            "python": "Explain how you would optimize a slow Python API endpoint.",
            "data science": "How would you handle missing values in a dataset before modeling?",
            "ml": "Describe the difference between bias and variance.",
            "frontend": "How do you manage state in a large React application?",
            "backend": "How do you design a scalable REST API?",
            "devops": "How would you safely deploy a backend service with zero downtime?",
        }
        if domain in base:
            q = base[domain]
        else:
            q = "Tell me about a project where you solved a difficult technical problem."
        if job_description:
            q += " Please tailor your answer to the job description."
        return q

    def summarize_feedback(self, answer: str, score: float) -> str:
        if score >= 8:
            return "Strong answer with clear structure and relevant details."
        if score >= 5:
            return "Good start, but add more depth, examples, and measurable impact."
        return "The answer needs more clarity, structure, and role-specific detail."
