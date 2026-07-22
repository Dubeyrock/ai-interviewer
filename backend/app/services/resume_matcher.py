from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List

from app.services.resume_parser import SKILL_PATTERNS, extract_skills


# =========================================================
# MARKET-READY ROLE SKILL MAPPING
# Core = Mandatory
# Advanced = Industry / Scale / Modern stack
# Soft = Communication / Leadership / Ownership
# =========================================================

ROLE_SKILLS = {
    # =====================================================
    # FRONTEND
    # =====================================================
    "frontend developer": {
        "core": [
            "html",
            "css",
            "javascript",
            "typescript",
            "react",
            "redux",
            "api",
            "responsive design",
            "git",
        ],
        "advanced": [
            "next.js",
            "tailwind",
            "vite",
            "webpack",
            "jest",
            "cypress",
            "performance optimization",
            "seo",
            "ssr",
            "pwa",
            "graphql",
        ],
        "soft": [
            "problem solving",
            "communication",
            "teamwork",
        ],
    },

    # =====================================================
    # BACKEND
    # =====================================================
    "backend developer": {
        "core": [
            "python",
            "java",
            "node.js",
            "fastapi",
            "spring boot",
            "rest api",
            "database",
            "sql",
            "authentication",
            "git",
        ],
        "advanced": [
            "microservices",
            "redis",
            "kafka",
            "rabbitmq",
            "docker",
            "kubernetes",
            "aws",
            "grpc",
            "system design",
            "caching",
            "mongodb",
            "postgresql",
        ],
        "soft": [
            "ownership",
            "debugging",
            "team collaboration",
        ],
    },

    # =====================================================
    # FULL STACK
    # =====================================================
    "full stack developer": {
        "core": [
            "react",
            "javascript",
            "typescript",
            "node.js",
            "api",
            "database",
            "sql",
            "git",
        ],
        "advanced": [
            "next.js",
            "docker",
            "aws",
            "microservices",
            "mongodb",
            "postgresql",
            "redis",
            "ci/cd",
            "graphql",
        ],
        "soft": [
            "problem solving",
            "communication",
            "ownership",
        ],
    },

    # =====================================================
    # DATA SCIENCE
    # =====================================================
    "data scientist": {
        "core": [
            "python",
            "pandas",
            "numpy",
            "statistics",
            "machine learning",
            "sql",
            "data analysis",
            "data visualization",
        ],
        "advanced": [
            "tensorflow",
            "pytorch",
            "xgboost",
            "nlp",
            "deep learning",
            "llm",
            "transformers",
            "feature engineering",
            "mlops",
            "power bi",
            "tableau",
        ],
        "soft": [
            "critical thinking",
            "communication",
            "business understanding",
        ],
    },

    # =====================================================
    # MACHINE LEARNING ENGINEER
    # =====================================================
    "ml engineer": {
        "core": [
            "python",
            "machine learning",
            "tensorflow",
            "pytorch",
            "model deployment",
            "api",
            "sql",
        ],
        "advanced": [
            "mlops",
            "docker",
            "kubernetes",
            "aws",
            "azure",
            "llm",
            "rag",
            "vector database",
            "langchain",
            "fine tuning",
            "transformers",
        ],
        "soft": [
            "problem solving",
            "research",
            "collaboration",
        ],
    },

    # =====================================================
    # DEVOPS
    # =====================================================
    "devops engineer": {
        "core": [
            "linux",
            "docker",
            "kubernetes",
            "aws",
            "ci/cd",
            "git",
            "jenkins",
            "terraform",
        ],
        "advanced": [
            "monitoring",
            "grafana",
            "prometheus",
            "ansible",
            "helm",
            "nginx",
            "azure",
            "gcp",
            "sre",
            "observability",
        ],
        "soft": [
            "automation mindset",
            "incident management",
            "team collaboration",
        ],
    },

    # =====================================================
    # CYBER SECURITY
    # =====================================================
    "cybersecurity engineer": {
        "core": [
            "network security",
            "siem",
            "firewall",
            "linux",
            "vulnerability assessment",
            "incident response",
        ],
        "advanced": [
            "ethical hacking",
            "penetration testing",
            "soc",
            "cloud security",
            "owasp",
            "splunk",
            "zero trust",
        ],
        "soft": [
            "attention to detail",
            "problem solving",
        ],
    },

    # =====================================================
    # UI UX
    # =====================================================
    "ui/ux designer": {
        "core": [
            "figma",
            "wireframing",
            "prototyping",
            "user research",
            "ui design",
            "ux design",
        ],
        "advanced": [
            "design system",
            "usability testing",
            "interaction design",
            "accessibility",
            "adobe xd",
            "framer",
        ],
        "soft": [
            "creativity",
            "communication",
            "empathy",
        ],
    },

    # =====================================================
    # SALES
    # =====================================================
    "sales executive": {
        "core": [
            "crm",
            "lead generation",
            "sales",
            "negotiation",
            "client handling",
            "communication",
        ],
        "advanced": [
            "b2b sales",
            "saas sales",
            "inside sales",
            "pipeline management",
            "salesforce",
            "cold calling",
        ],
        "soft": [
            "persuasion",
            "relationship building",
            "confidence",
        ],
    },

    # =====================================================
    # HR
    # =====================================================
    "hr executive": {
        "core": [
            "recruitment",
            "screening",
            "onboarding",
            "employee engagement",
            "communication",
        ],
        "advanced": [
            "ats",
            "talent acquisition",
            "hr analytics",
            "payroll",
            "labor laws",
            "performance management",
        ],
        "soft": [
            "people management",
            "empathy",
            "conflict resolution",
        ],
    },

    # =====================================================
    # FINANCE
    # =====================================================
    "finance analyst": {
        "core": [
            "excel",
            "financial analysis",
            "forecasting",
            "budgeting",
            "accounting",
        ],
        "advanced": [
            "power bi",
            "sap",
            "financial modeling",
            "tableau",
            "variance analysis",
            "sql",
        ],
        "soft": [
            "attention to detail",
            "decision making",
        ],
    },

    # =====================================================
    # DIGITAL MARKETING
    # =====================================================
    "digital marketer": {
        "core": [
            "seo",
            "social media marketing",
            "google ads",
            "content marketing",
            "analytics",
        ],
        "advanced": [
            "performance marketing",
            "meta ads",
            "email marketing",
            "marketing automation",
            "google analytics",
        ],
        "soft": [
            "creativity",
            "communication",
        ],
    },
}


DOMAIN_THRESHOLDS = {
    "it": 65,
    "non-it": 58,
    "data science": 70,
    "ml": 72,
    "devops": 72,
    "cybersecurity": 70,
    "finance": 60,
    "hr": 58,
    "sales": 55,
    "marketing": 58,
    "ui/ux": 60,
}


# =========================================================
# DATA MODEL
# =========================================================

@dataclass
class MatchResult:
    fit_score: int
    recommendation: str
    matched_skills: List[str]
    missing_skills: List[str]
    core_score: int
    advanced_score: int
    soft_score: int
    summary: str


# =========================================================
# HELPERS
# =========================================================

def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def _contains_skill(text: str, skill: str) -> bool:
    return skill.lower() in text.lower()


def _extract_resume_skills(resume_text: str) -> set[str]:
    extracted = extract_skills(resume_text)
    return set(skill.lower() for skill in extracted)


def _get_role_config(job_role: str) -> Dict:
    role_key = _normalize(job_role)

    for role_name, config in ROLE_SKILLS.items():
        if role_name in role_key:
            return config

    return {
        "core": [],
        "advanced": [],
        "soft": [],
    }


# =========================================================
# SCORING ENGINE
# =========================================================

def _calculate_weighted_score(
    matched_core: List[str],
    total_core: List[str],
    matched_advanced: List[str],
    total_advanced: List[str],
    matched_soft: List[str],
    total_soft: List[str],
    resume_text: str,
) -> tuple[int, int, int, int]:

    core_score = 0
    advanced_score = 0
    soft_score = 0

    # =====================================================
    # CORE SCORE (60)
    # =====================================================
    if total_core:
        core_score = int((len(matched_core) / len(total_core)) * 60)

    # =====================================================
    # ADVANCED SCORE (25)
    # =====================================================
    if total_advanced:
        advanced_score = int(
            (len(matched_advanced) / len(total_advanced)) * 25
        )

    # =====================================================
    # SOFT SKILL SCORE (10)
    # =====================================================
    if total_soft:
        soft_score = int((len(matched_soft) / len(total_soft)) * 10)

    # =====================================================
    # RESUME QUALITY BONUS (5)
    # =====================================================
    bonus = 0

    word_count = len(resume_text.split())

    if word_count > 300:
        bonus += 2

    if "project" in resume_text.lower():
        bonus += 1

    if "experience" in resume_text.lower():
        bonus += 1

    if "certification" in resume_text.lower():
        bonus += 1

    final_score = min(100, core_score + advanced_score + soft_score + bonus)

    return final_score, core_score, advanced_score, soft_score


# =========================================================
# MAIN MATCHER
# =========================================================

def match_candidate(
    resume_text: str,
    domain: str,
    job_role: str,
    job_description: str | None = None,
) -> MatchResult:

    normalized_resume = _normalize(resume_text)

    extracted_resume_skills = _extract_resume_skills(resume_text)

    role_config = _get_role_config(job_role)

    core_skills = role_config["core"]
    advanced_skills = role_config["advanced"]
    soft_skills = role_config["soft"]

    # =====================================================
    # JD SKILLS ADDITION
    # =====================================================
    jd_skills = []

    if job_description:
        jd_skills = extract_skills(job_description)

    all_core = list(dict.fromkeys(core_skills + jd_skills))

    # =====================================================
    # MATCHING
    # =====================================================

    matched_core = [
        skill for skill in all_core
        if skill in extracted_resume_skills
        or _contains_skill(normalized_resume, skill)
    ]

    matched_advanced = [
        skill for skill in advanced_skills
        if skill in extracted_resume_skills
        or _contains_skill(normalized_resume, skill)
    ]

    matched_soft = [
        skill for skill in soft_skills
        if _contains_skill(normalized_resume, skill)
    ]

    missing_core = [
        skill for skill in all_core
        if skill not in matched_core
    ]

    missing_advanced = [
        skill for skill in advanced_skills
        if skill not in matched_advanced
    ]

    # =====================================================
    # FINAL SCORE
    # =====================================================

    fit_score, core_score, advanced_score, soft_score = (
        _calculate_weighted_score(
            matched_core,
            all_core,
            matched_advanced,
            advanced_skills,
            matched_soft,
            soft_skills,
            resume_text,
        )
    )

    threshold = DOMAIN_THRESHOLDS.get(_normalize(domain), 60)

    recommendation = (
        "SELECTED"
        if fit_score >= threshold
        else "REJECTED"
    )

    matched_skills = sorted(
        list(
            dict.fromkeys(
                matched_core +
                matched_advanced +
                matched_soft
            )
        )
    )

    missing_skills = sorted(
        list(
            dict.fromkeys(
                missing_core +
                missing_advanced
            )
        )
    )

    summary = (
        f"Candidate matched "
        f"{len(matched_skills)} relevant skills. "
        f"Core score: {core_score}/60, "
        f"Advanced score: {advanced_score}/25, "
        f"Soft skills score: {soft_score}/10."
    )

    return MatchResult(
        fit_score=fit_score,
        recommendation=recommendation,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        core_score=core_score,
        advanced_score=advanced_score,
        soft_score=soft_score,
        summary=summary,
    )