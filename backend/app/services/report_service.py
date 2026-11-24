"""Report generation service producing Markdown and downloadable PDF documents."""

from pathlib import Path
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

REPORTS_DIR = Path(__file__).resolve().parent.parent.parent / "generated_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def generate_pdf_report(report_id: str, title: str, executive_summary: str, markdown_body: str) -> str:
    """Render a clean PDF report using ReportLab and return the file path."""
    pdf_file = REPORTS_DIR / f"report_{report_id}.pdf"
    doc = SimpleDocTemplate(str(pdf_file), pagesize=LETTER, title=title)
    styles = getSampleStyleSheet()
    story = [
        Paragraph(f"Autonomous Enterprise Intelligence System", styles["Heading4"]),
        Spacer(1, 6),
        Paragraph(title, styles["Title"]),
        Spacer(1, 12),
        Paragraph("Executive Summary", styles["Heading2"]),
        Paragraph(executive_summary.replace("\n", "<br/>"), styles["BodyText"]),
        Spacer(1, 12),
        Paragraph("Detailed Intelligence Findings", styles["Heading2"]),
    ]

    for block in markdown_body.split("\n\n"):
        clean = block.strip()
        if not clean:
            continue
        if clean.startswith("#"):
            heading_text = clean.lstrip("#").strip()
            story.append(Spacer(1, 8))
            story.append(Paragraph(heading_text, styles["Heading3"]))
        else:
            safe_html = (
                clean.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\n", "<br/>")
            )
            story.append(Paragraph(safe_html, styles["BodyText"]))
            story.append(Spacer(1, 6))

    doc.build(story)
    return str(pdf_file)
