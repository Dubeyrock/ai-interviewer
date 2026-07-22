from __future__ import annotations

import io
import re
from pathlib import Path


def _extract_with_pymupdf(file_bytes: bytes) -> str:
    try:
        import fitz  # type: ignore
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return "\\n".join(page.get_text() for page in doc)
    except Exception:
        return ""


def _extract_with_pypdf2(file_bytes: bytes) -> str:
    try:
        # pyrefly: ignore [missing-import]
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        return ""


def _extract_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        return "\\n".join(p.text for p in doc.paragraphs)
    except Exception:
        return ""


def extract_text_from_file(file_bytes: bytes, filename: str | None = None) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix == ".pdf":
        text = _extract_with_pymupdf(file_bytes) or _extract_with_pypdf2(file_bytes)
    elif suffix in {".docx", ".doc"}:
        text = _extract_docx(file_bytes)
    else:
        text = file_bytes.decode("utf-8", errors="ignore")

    text = re.sub(r"\\s+", " ", text).strip()
    return text


SKILL_PATTERNS = {
    "python": ["python", "fastapi", "django", "flask", "pandas", "numpy"],
    "frontend": ["react", "vite", "typescript", "javascript", "redux", "tailwind"],
    "backend": ["fastapi", "django", "flask", "node", "express", "mongodb", "postgres"],
    "data science": ["pandas", "numpy", "scikit", "tensorflow", "pytorch", "machine learning"],
    "devops": ["docker", "kubernetes", "aws", "ci/cd", "jenkins", "terraform"],
    "cybersecurity": ["network", "siem", "threat", "vulnerability", "incident", "firewall"],
    "non-it": ["communication", "sales", "operations", "process", "customer", "analysis"],
    "finance": ["excel", "valuation", "budget", "forecast", "audit", "accounting"],
    "hr": ["recruitment", "onboarding", "talent", "employee", "policy", "compliance"],
    "marketing": ["seo", "sem", "content", "campaign", "analytics", "brand"],
    "sales": ["lead", "crm", "pipeline", "negotiation", "closing", "target"],
    "ui/ux": ["figma", "wireframe", "prototype", "usability", "design system", "accessibility"],
}


def extract_skills(text: str) -> list[str]:
    lowered = text.lower()
    found = set()
    for skills in SKILL_PATTERNS.values():
        for skill in skills:
            if skill in lowered:
                found.add(skill)
    return sorted(found)
