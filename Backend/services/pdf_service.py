from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
from pathlib import Path
import os

REPORTS_DIR = Path(__file__).parent.parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

PRIMARY = colors.HexColor("#2563EB")
SECONDARY = colors.HexColor("#22C55E")
DANGER = colors.HexColor("#EF4444")
WARNING = colors.HexColor("#F59E0B")
LIGHT_GRAY = colors.HexColor("#F8FAFC")
DARK = colors.HexColor("#1E293B")
MEDIUM_GRAY = colors.HexColor("#64748B")


def _priority_color(priority: str) -> colors.Color:
    mapping = {
        "Critical": DANGER,
        "High": WARNING,
        "Medium": colors.HexColor("#3B82F6"),
        "Low": SECONDARY,
    }
    return mapping.get(priority, colors.gray)


def generate_incident_report(incident: dict, assignment: dict | None, user: dict | None) -> str:
    filename = f"incident_report_{incident['id'][:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = REPORTS_DIR / filename

    doc = SimpleDocTemplate(
        str(filepath),
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", fontSize=18, textColor=PRIMARY, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=6)
    subtitle_style = ParagraphStyle("Subtitle", fontSize=11, textColor=MEDIUM_GRAY, alignment=TA_CENTER, spaceAfter=2)
    section_style = ParagraphStyle("Section", fontSize=12, textColor=PRIMARY, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=6)
    normal_style = ParagraphStyle("Normal", fontSize=10, textColor=DARK, spaceAfter=4)

    story = []

    story.append(Paragraph("STATE DISASTER MANAGEMENT AUTHORITY", title_style))
    story.append(Paragraph("Disaster Response Coordination System", subtitle_style))
    story.append(Paragraph("INCIDENT REPORT", ParagraphStyle("ITitle", fontSize=14, textColor=DARK, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=4)))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=12))

    priority = incident.get("priority", "Unknown")
    pri_color = _priority_color(priority)

    meta_data = [
        ["Incident ID", incident.get("id", "N/A")[:12] + "..."],
        ["Report Generated", datetime.now().strftime("%d %B %Y, %I:%M %p")],
        ["Priority", priority],
        ["Status", incident.get("status", "Pending")],
    ]
    meta_table = Table(meta_data, colWidths=[4 * cm, 12 * cm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LIGHT_GRAY, colors.white]),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("CITIZEN INFORMATION", section_style))
    citizen_data = [
        ["Name", incident.get("name", "N/A"), "Phone", incident.get("phone", "N/A")],
        ["District", incident.get("district", "N/A"), "Village", incident.get("village", "N/A")],
    ]
    citizen_table = Table(citizen_data, colWidths=[3 * cm, 7 * cm, 3 * cm, 5 * cm])
    citizen_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY),
        ("TEXTCOLOR", (2, 0), (2, -1), PRIMARY),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
    ]))
    story.append(citizen_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("INCIDENT DETAILS", section_style))
    incident_data = [
        ["Disaster Type", incident.get("disaster_type", "N/A"), "Reported At", incident.get("created_at", "N/A")[:19].replace("T", " ")],
        ["People Trapped", str(incident.get("people_trapped", 0)), "Water Level", incident.get("water_level", "N/A")],
        ["Medical Emergency", "YES" if incident.get("medical_emergency") else "NO", "Children Present", "YES" if incident.get("children_present") else "NO"],
        ["Senior Citizens", "YES" if incident.get("senior_citizens_present") else "NO", "Pregnant Woman", "YES" if incident.get("pregnant_woman_present") else "NO"],
        ["GPS Coordinates", f"{incident.get('lat', 'N/A')}, {incident.get('lng', 'N/A')}", "Priority Score", str(incident.get("priority_score", "N/A"))],
    ]
    inc_table = Table(incident_data, colWidths=[4 * cm, 6 * cm, 3.5 * cm, 4.5 * cm])
    inc_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY),
        ("TEXTCOLOR", (2, 0), (2, -1), PRIMARY),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LIGHT_GRAY, colors.white]),
    ]))
    story.append(inc_table)
    story.append(Spacer(1, 8))

    if incident.get("description"):
        story.append(Paragraph("DESCRIPTION", section_style))
        desc_data = [[incident.get("description", "")]]
        desc_table = Table(desc_data, colWidths=[18 * cm])
        desc_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(desc_table)
        story.append(Spacer(1, 8))

    if incident.get("priority_reasoning"):
        story.append(Paragraph("AI PRIORITY ANALYSIS", section_style))
        ai_data = [
            ["Priority Level", priority],
            ["AI Reasoning", incident.get("priority_reasoning", "N/A")],
        ]
        if incident.get("recommended_resources"):
            ai_data.append(["Recommended Resources", ", ".join(incident.get("recommended_resources", []))])
        if incident.get("estimated_response_time"):
            ai_data.append(["Estimated Response Time", incident.get("estimated_response_time", "N/A")])
        ai_table = Table(ai_data, colWidths=[4 * cm, 14 * cm])
        ai_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LIGHT_GRAY, colors.white]),
        ]))
        story.append(ai_table)
        story.append(Spacer(1, 8))

    if assignment:
        story.append(Paragraph("RESCUE ASSIGNMENT", section_style))
        assign_data = [
            ["Team Type", assignment.get("team_type", "N/A"), "ETA", assignment.get("eta", "N/A")],
            ["Assigned At", assignment.get("assigned_at", "N/A")[:19].replace("T", " "), "Status", assignment.get("status", "N/A")],
        ]
        if assignment.get("notes"):
            assign_data.append(["Notes", assignment.get("notes", ""), "", ""])
        assign_table = Table(assign_data, colWidths=[4 * cm, 6 * cm, 3.5 * cm, 4.5 * cm])
        assign_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY),
            ("TEXTCOLOR", (2, 0), (2, -1), PRIMARY),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LIGHT_GRAY, colors.white]),
        ]))
        story.append(assign_table)

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "This document is generated by the Disaster Response Coordination System (DRCS). "
        "State Disaster Management Authority. For emergency assistance call: 1077 / 112",
        ParagraphStyle("Footer", fontSize=8, textColor=MEDIUM_GRAY, alignment=TA_CENTER)
    ))

    doc.build(story)
    return str(filepath)


def generate_situation_report(incidents: list, resources: list, volunteers: list, camps: list, ai_summary: dict | None = None) -> str:
    filename = f"situation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = REPORTS_DIR / filename

    doc = SimpleDocTemplate(
        str(filepath),
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", fontSize=18, textColor=PRIMARY, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=6)
    subtitle_style = ParagraphStyle("Subtitle", fontSize=11, textColor=MEDIUM_GRAY, alignment=TA_CENTER, spaceAfter=2)
    section_style = ParagraphStyle("Section", fontSize=12, textColor=PRIMARY, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=6)

    story = []

    story.append(Paragraph("STATE DISASTER MANAGEMENT AUTHORITY", title_style))
    story.append(Paragraph("Disaster Response Coordination System", subtitle_style))
    story.append(Paragraph("SITUATION REPORT", ParagraphStyle("ITitle", fontSize=14, textColor=DARK, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=4)))
    story.append(Paragraph(datetime.now().strftime("%d %B %Y, %I:%M %p"), subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=12))

    active = [i for i in incidents if i.get("status") not in ["Completed", "Closed"]]
    completed = [i for i in incidents if i.get("status") in ["Completed", "Closed"]]
    critical = [i for i in active if i.get("priority") == "Critical"]
    high = [i for i in active if i.get("priority") == "High"]
    available_res = [r for r in resources if r.get("status") == "Available"]
    active_vols = [v for v in volunteers if v.get("approved") and v.get("status") == "Active"]

    story.append(Paragraph("EXECUTIVE SUMMARY", section_style))
    summary_data = [
        ["Total Incidents", str(len(incidents)), "Active Incidents", str(len(active))],
        ["Critical Priority", str(len(critical)), "High Priority", str(len(high))],
        ["Completed Rescues", str(len(completed)), "Available Resources", str(len(available_res))],
        ["Active Volunteers", str(len(active_vols)), "Relief Camps", str(len(camps))],
    ]
    summary_table = Table(summary_data, colWidths=[5 * cm, 4 * cm, 5 * cm, 4 * cm])
    summary_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY),
        ("TEXTCOLOR", (2, 0), (2, -1), PRIMARY),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LIGHT_GRAY, colors.white]),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 8))

    if ai_summary:
        story.append(Paragraph("AI SITUATION ANALYSIS", section_style))
        ai_data = [
            ["Severity Level", ai_summary.get("severity_level", "N/A")],
            ["Overall Situation", ai_summary.get("overall_situation", "N/A")],
            ["Most Affected Regions", ", ".join(ai_summary.get("most_affected_regions", []))],
            ["Resource Shortages", ", ".join(ai_summary.get("resource_shortages", []))],
        ]
        ai_table = Table(ai_data, colWidths=[4 * cm, 14 * cm])
        ai_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LIGHT_GRAY, colors.white]),
        ]))
        story.append(ai_table)
        story.append(Spacer(1, 8))

    if active:
        story.append(Paragraph("ACTIVE INCIDENTS", section_style))
        headers = [["#", "District", "Type", "People", "Priority", "Status"]]
        rows = [[str(i + 1), inc.get("district", ""), inc.get("disaster_type", ""), str(inc.get("people_trapped", 0)), inc.get("priority", ""), inc.get("status", "")] for i, inc in enumerate(active[:20])]
        inc_table = Table(headers + rows, colWidths=[1 * cm, 3.5 * cm, 3.5 * cm, 2 * cm, 2.5 * cm, 4 * cm])
        inc_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ]))
        story.append(inc_table)

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "State Disaster Management Authority | DRCS | Emergency: 1077 / 112",
        ParagraphStyle("Footer", fontSize=8, textColor=MEDIUM_GRAY, alignment=TA_CENTER)
    ))

    doc.build(story)
    return str(filepath)
