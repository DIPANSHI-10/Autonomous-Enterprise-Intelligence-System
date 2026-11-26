"""Report generation service producing clean, executive-grade Markdown and PDF documents."""

import re
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

REPORTS_DIR = Path(__file__).resolve().parent.parent.parent / "generated_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _format_inline_markdown(text: str) -> str:
    """Escape XML special chars safely, then convert basic Markdown bold/links for ReportLab."""
    escaped = escape(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"\[([^\]]+)\]\((https?://[^)]+|kb://[^)]+)\)", r"\1 (\2)", escaped)
    return escaped


def generate_pdf_report(report_id: str, title: str, executive_summary: str, markdown_body: str) -> str:
    """Render a clean, XML-safe PDF report using ReportLab without duplicate sections."""
    pdf_file = REPORTS_DIR / f"report_{report_id}.pdf"
    safe_title = escape(title)
    doc = SimpleDocTemplate(
        str(pdf_file),
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title=title,
    )
    base_styles = getSampleStyleSheet()
    kicker_style = ParagraphStyle(
        "AEISKicker",
        parent=base_styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#2563EB"),
        spaceAfter=4,
    )
    title_style = ParagraphStyle(
        "AEISTitle",
        parent=base_styles["Title"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6,
    )
    meta_style = ParagraphStyle(
        "AEISMeta",
        parent=base_styles["Normal"],
        fontSize=8.5,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=10,
    )
    h2_style = ParagraphStyle(
        "AEISH2",
        parent=base_styles["Heading2"],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=10,
        spaceAfter=5,
    )
    h3_style = ParagraphStyle(
        "AEISH3",
        parent=base_styles["Heading3"],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceBefore=6,
        spaceAfter=3,
    )
    body_style = ParagraphStyle(
        "AEISBody",
        parent=base_styles["BodyText"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=4,
    )
    bullet_style = ParagraphStyle(
        "AEISBullet",
        parent=body_style,
        leftIndent=14,
        bulletIndent=4,
        spaceAfter=3,
    )

    generated_date = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story = [
        Paragraph("AUTONOMOUS ENTERPRISE INTELLIGENCE SYSTEM", kicker_style),
        Paragraph(safe_title, title_style),
        Paragraph(f"Report ID: {escape(report_id[:8])} · Generated: {generated_date}", meta_style),
        HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=10),
        Paragraph("Executive Summary", h2_style),
        Paragraph(_format_inline_markdown(executive_summary).replace("\n", "<br/>"), body_style),
        Spacer(1, 6),
    ]

    for block in markdown_body.split("\n\n"):
        clean = block.strip()
        if not clean:
            continue
        lines = [ln.strip() for ln in clean.splitlines() if ln.strip()]
        if not lines:
            continue

        # Handle section heading followed by lines in the same block
        if lines[0].startswith("## "):
            heading_text = escape(lines[0][3:].strip())
            if heading_text.lower() == "executive summary":
                continue
            story.append(Paragraph(heading_text, h2_style))
            lines = lines[1:]
        elif lines[0].startswith("### "):
            story.append(Paragraph(escape(lines[0][4:].strip()), h3_style))
            lines = lines[1:]
        elif lines[0].startswith("# "):
            # Skip duplicate top-level title if present
            lines = lines[1:]

        for ln in lines:
            if ln.startswith("### "):
                story.append(Paragraph(escape(ln[4:].strip()), h3_style))
            elif ln.startswith("- ") or ln.startswith("* "):
                bullet_text = _format_inline_markdown(ln[2:].strip())
                story.append(Paragraph(f"• {bullet_text}", bullet_style))
            else:
                story.append(Paragraph(_format_inline_markdown(ln), body_style))

    doc.build(story)
    return str(pdf_file)
