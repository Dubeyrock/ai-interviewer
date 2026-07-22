from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, LongTable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from xml.sax.saxutils import escape


def _score_color(score: float) -> str:
    if score >= 80:
        return "#10b981"
    if score >= 60:
        return "#f59e0b"
    return "#ef4444"


def _listify(value) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        parts = [p.strip() for p in value.replace("\n", ",").split(",")]
        return [p for p in parts if p]
    return [str(value)]


def _draw_header(c, width, height, candidate_name: str, role: str, date_str: str, session_id: str):
    margin = 18 * mm
    y = height - 18 * mm

    c.setFillColor(colors.HexColor("#064e3b"))
    c.rect(0, height - 52 * mm, width, 52 * mm, fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(margin, height - 16 * mm, "Recruiter.AI")
    c.setFont("Helvetica", 10)
    c.drawString(margin, height - 23 * mm, "AI Interview Report")

    c.setFont("Helvetica", 9)
    c.drawRightString(width - margin, height - 17 * mm, f"Date: {date_str}")
    c.drawRightString(width - margin, height - 23 * mm, f"Session ID: {session_id}")
    c.drawRightString(width - margin, height - 29 * mm, f"Role: {role}")

    return y - 18 * mm


def _format_candidate_value(value) -> str:
    if isinstance(value, str) and value.strip():
        return escape(value).replace("\n", "<br/>")
    if isinstance(value, (list, tuple, set)):
        items = [str(item).strip() for item in value if str(item).strip()]
        if not items:
            return "N/A"
        return "<br/>".join(escape(item) for item in items)
    if value is None or value == "":
        return "N/A"
    return escape(str(value)).replace("\n", "<br/>")


def _format_candidate_label(label: str) -> str:
    return escape(label)


def _make_detail_table(c, usable: float, rows: list[tuple[str, object]]):
    styles = getSampleStyleSheet()

    label_style = ParagraphStyle(
        "CandidateInfoLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.HexColor("#4b5563"),
        leading=13,
    )
    value_style = ParagraphStyle(
        "CandidateInfoValue",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#111827"),
        leading=13,
    )

    data = [
        [
            Paragraph(_format_candidate_label(label), label_style),
            Paragraph(_format_candidate_value(value), value_style),
        ]
        for label, value in rows
    ]

    table = LongTable(
        data,
        colWidths=[usable * 0.25, usable * 0.75],
        splitByRow=1,
        repeatRows=0,
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#e5e7eb")),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#f9fafb"), colors.white]),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 4.5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5 * mm),
            ]
        )
    )
    return table


def _draw_detail_table(c, y, width, margin, title: str, rows: list[tuple[str, object]]):
    usable = width - 2 * margin
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CandidateInfoDetailTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        textColor=colors.HexColor("#064e3b"),
        leading=12.5,
        spaceAfter=3 * mm,
    )

    title_p = Paragraph(_format_candidate_label(title), title_style)
    _, title_h = title_p.wrapOn(c, usable, 20 * mm)
    table = _make_detail_table(c, usable, rows)
    _, table_h = table.wrapOn(c, usable, 220 * mm)

    min_bottom = 20 * mm
    block_h = title_h + 4 * mm + table_h

    if y - block_h < min_bottom:
        c.showPage()
        y = c._pagesize[1] - 18 * mm

    title_p.drawOn(c, margin, y - title_h)
    y -= title_h + 4 * mm

    available_height = max(min_bottom, y - min_bottom)
    fragments = table.split(usable, available_height) or [table]

    for fragment_index, fragment in enumerate(fragments):
        _, fragment_h = fragment.wrapOn(c, usable, available_height)
        if y - fragment_h < min_bottom:
            c.showPage()
            y = c._pagesize[1] - 18 * mm
            available_height = y - min_bottom

        fragment.drawOn(c, margin, y - fragment_h)
        y -= fragment_h + 2 * mm

        if fragment_index < len(fragments) - 1:
            c.showPage()
            y = c._pagesize[1] - 18 * mm

    return y - 5 * mm


def _draw_candidate_info(c, y, width, candidate: dict):
    margin = 18 * mm

    styles = getSampleStyleSheet()
    section_style = ParagraphStyle(
        "CandidateInfoSection",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=colors.HexColor("#111827"),
        leading=15,
        spaceAfter=4 * mm,
    )
    section_p = Paragraph("1. Candidate Information", section_style)
    _, section_h = section_p.wrapOn(c, width - 2 * margin, 20 * mm)
    section_p.drawOn(c, margin, y - section_h)
    y -= section_h + 4 * mm

    skills = _listify(candidate.get("skills", []))

    personal_rows = [
        ("Full Name", candidate.get("full_name") or "N/A"),
        ("Email", candidate.get("email") or "N/A"),
        ("Phone", candidate.get("phone") or "N/A"),
        ("Location", candidate.get("location") or "N/A"),
    ]

    profile_rows = [
        ("Experience", candidate.get("experience") or "N/A"),
        ("Current Company", candidate.get("current_company") or "N/A"),
        ("Current Salary", candidate.get("current_salary") or "N/A"),
        ("Expected Salary", candidate.get("expected_salary") or "N/A"),
        ("Skills", skills if skills else "N/A"),
        ("LinkedIn", candidate.get("linkedin") or "N/A"),
        ("GitHub", candidate.get("github") or "N/A"),
        ("Domain", candidate.get("domain") or "N/A"),
        ("Job Role", candidate.get("job_role") or "N/A"),
    ]

    y = _draw_detail_table(c, y, width, margin, "Personal Details", personal_rows)
    y = _draw_detail_table(c, y, width, margin, "Job / Profile Details", profile_rows)
    return y - 2 * mm


def _draw_score_dashboard(c, y, width, decision: dict, resume_match: int = 0):
    margin = 18 * mm
    usable = width - 2 * margin

    c.setFillColor(colors.HexColor("#111827"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, y, "2. Score Dashboard")
    y -= 5 * mm

    c.setStrokeColor(colors.HexColor("#e5e7eb"))
    c.setLineWidth(0.5)
    c.line(margin, y, width - margin, y)
    y -= 4 * mm

    scores = [
        ("Overall Score", decision.get("final_score", 0), True),
        ("Resume Match", float(resume_match or 0), False),
        ("Confidence", decision.get("emotion_score", 0), False),
        ("Communication", decision.get("communication_score", 0), False),
        ("Behavioral", decision.get("behavioral_score", 0), False),
    ]

    bar_w = usable * 0.65
    val_w = usable - bar_w

    for label, value, is_overall in scores:
        c.setFillColor(colors.HexColor("#374151"))
        c.setFont("Helvetica-Bold" if is_overall else "Helvetica", 10 if is_overall else 9)
        c.drawString(margin, y, label)

        c.setFillColor(colors.HexColor("#d1d5db"))
        c.rect(margin + val_w, y - 1.2 * mm, bar_w, 3.5 * mm, fill=1, stroke=0)

        fill_color = colors.HexColor(_score_color(float(value)))
        c.setFillColor(fill_color)
        c.rect(
            margin + val_w,
            y - 1.2 * mm,
            max(0, bar_w * min(100, float(value)) / 100),
            3.5 * mm,
            fill=1,
            stroke=0,
        )

        c.setFillColor(colors.HexColor("#111827"))
        c.setFont("Helvetica-Bold" if is_overall else "Helvetica", 10 if is_overall else 9)
        c.drawRightString(width - margin, y - 1.2 * mm, f"{float(value):.1f}/100")

        y -= 8 * mm

    return y - 2 * mm


def _draw_section_title(c, y, margin, title: str):
    c.setFillColor(colors.HexColor("#111827"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, y, title)
    y -= 5 * mm
    c.setStrokeColor(colors.HexColor("#e5e7eb"))
    c.setLineWidth(0.5)
    c.line(margin, y, c._pagesize[0] - margin, y)
    return y - 4 * mm


def _draw_bullets(c, y, width, items: list[str], bullet: str = "•"):
    margin = 18 * mm
    usable = width - 2 * margin
    styles = getSampleStyleSheet()
    item_style = ParagraphStyle(
        "Item",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#374151"),
        leading=12,
        leftIndent=8 * mm,
        firstLineIndent=-6 * mm,
    )

    for item in items:
        p = Paragraph(f"{bullet} {escape(str(item))}", item_style)
        _, h = p.wrapOn(c, usable, 50 * mm)
        if y - h < 20 * mm:
            c.showPage()
            y = c._pagesize[1] - 18 * mm
        p.drawOn(c, margin, y - h)
        y -= h + 1.5 * mm

    return y - 2 * mm


def _draw_recruiter_action(c, y, width, decision: dict):
    margin = 18 * mm

    final_score = float(decision.get("final_score", 0) or 0)
    next_step = decision.get("next_step")
    reason = decision.get("reason")
    follow_up = decision.get("follow_up")
    hr_remark = decision.get("hr_remark")

    if not next_step:
        if final_score >= 70:
            next_step = "SELECTED"
        elif final_score >= 50:
            next_step = "HOLD"
        else:
            next_step = "REJECTED"

    if not reason:
        if next_step == "SELECTED":
            reason = "Candidate meets role expectations and interview performance is strong."
        elif next_step == "HOLD":
            reason = "Candidate has potential but needs improvement in one or more areas."
        else:
            reason = "Resume match is below threshold and interview responses need more depth."

    if not follow_up:
        if next_step == "SELECTED":
            follow_up = "Proceed to the next hiring stage."
        elif next_step == "HOLD":
            follow_up = "Re-evaluate after skill improvement or another interview round."
        else:
            follow_up = "Recommend foundational skill improvement before reapplying."

    if not hr_remark:
        if next_step == "SELECTED":
            hr_remark = "Strong candidate. Recommend moving forward."
        elif next_step == "HOLD":
            hr_remark = "Candidate can be reconsidered after development."
        else:
            hr_remark = "Not recommended for current role at this stage."

    rows = [
        ("Recommended Next Step", next_step),
        ("Reason", reason),
        ("Follow-up Suggestion", follow_up),
        ("HR Remark", hr_remark),
    ]
    return _draw_detail_table(c, y, width, margin, "6. Recruiter Action Summary", rows)


def generate_pdf_report(output_path: str, candidate: dict, session: dict, decision: dict) -> str:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    c.setTitle(f"Interview Report - {candidate.get('full_name')}")

    session_id = session.get("id", "")
    role = candidate.get("job_role") or "N/A"
    date_str = candidate.get("created_at", "")
    if hasattr(date_str, "strftime"):
        date_str = date_str.strftime("%d %B %Y")
    elif isinstance(date_str, str) and date_str:
        date_str = date_str.split("T")[0]
    else:
        date_str = "N/A"

    y = _draw_header(c, width, height, candidate.get("full_name") or "Candidate", role, date_str, session_id)

    c.setFillColor(colors.HexColor("#064e3b"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(18 * mm, y, "Recruiter: Recruiter AI")

    y = _draw_candidate_info(c, y - 2 * mm, width, candidate)

    resume_match = candidate.get("fit_score", 0)
    if isinstance(resume_match, str):
        try:
            resume_match = int(float(resume_match))
        except ValueError:
            resume_match = 0

    y = _draw_score_dashboard(c, y, width, decision, resume_match=int(resume_match))

    y = _draw_section_title(c, y, 18 * mm, "3. Strengths")
    strengths = decision.get("strengths", []) or ["Good communication", "Clear career goals"]
    y = _draw_bullets(c, y, width, strengths, "✅")

    y = _draw_section_title(c, y, 18 * mm, "4. Weaknesses")
    weaknesses = decision.get("weaknesses", []) or ["Technical depth can improve"]
    y = _draw_bullets(c, y, width, weaknesses, "⚠️")

    y = _draw_recruiter_action(c, y, width, decision)

    y = _draw_section_title(c, y, 18 * mm, "7. Question & Answer Evaluation")
    y -= 2 * mm

    questions = session.get("questions", []) or []
    answers = session.get("answers", []) or []
    stage_responses = session.get("stage_responses", []) or []

    evaluations = []
    for sr in stage_responses:
        if isinstance(sr, dict):
            fb = sr.get("feedback") or sr.get("evaluation") or sr.get("response_feedback") or ""
            evaluations.append(str(fb))

    styles = getSampleStyleSheet()
    q_style = ParagraphStyle(
        "Q",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.HexColor("#064e3b"),
        leading=11,
    )
    a_style = ParagraphStyle(
        "A",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#374151"),
        leading=11,
    )
    e_style = ParagraphStyle(
        "E",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        textColor=colors.HexColor("#6b7280"),
        leading=10,
    )

    margin = 18 * mm
    usable = width - 2 * margin
    max_q = min(len(questions), 6)

    for idx in range(max_q):
        q_text = str(questions[idx])
        a_text = str(answers[idx]) if idx < len(answers) else "N/A"
        e_text = str(evaluations[idx]) if idx < len(evaluations) else ""

        pq = Paragraph(f"Q{idx + 1}: {escape(q_text)}", q_style)
        pa = Paragraph(f" Candidate Response : {escape(a_text)}", a_style)
        pe = Paragraph(f"Evaluation: {escape(e_text)}", e_style) if e_text else None

        _, qh = pq.wrapOn(c, usable - 6 * mm, 50 * mm)
        _, ah = pa.wrapOn(c, usable - 6 * mm, 50 * mm)
        eh = 0
        if pe:
            _, eh = pe.wrapOn(c, usable - 6 * mm, 30 * mm)

        block_h = qh + ah + eh + 12 * mm

        if y - block_h < 22 * mm:
            c.showPage()
            y = height - 18 * mm

        c.setFillColor(colors.HexColor("#ecfdf5"))
        c.setStrokeColor(colors.HexColor("#a7f3d0"))
        c.roundRect(margin, y - block_h, usable, block_h, 2 * mm, fill=1, stroke=1)

        py = y - 3 * mm
        pq.drawOn(c, margin + 3 * mm, py - qh)
        py -= qh + 2 * mm

        pa.drawOn(c, margin + 3 * mm, py - ah)
        py -= ah + 1.5 * mm

        if pe:
            pe.drawOn(c, margin + 3 * mm, py - eh)

        y -= block_h + 3 * mm

    if y < 30 * mm:
        c.showPage()
        y = height - 18 * mm

    c.setStrokeColor(colors.HexColor("#e5e7eb"))
    c.setLineWidth(0.5)
    c.line(margin, y, width - margin, y)
    y -= 6 * mm

    c.setFillColor(colors.HexColor("#374151"))
    c.setFont("Helvetica", 8)
    footer = "This report is auto-generated by RecruWeb AI Interviewer. Results are indicative and should be reviewed by HR."
    c.drawString(margin, y, footer)
    y -= 4 * mm
    c.drawString(margin, y, "Confidential — For internal recruitment use only.")

    c.save()
    return str(path)