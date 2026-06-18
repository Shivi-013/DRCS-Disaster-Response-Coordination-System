from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from services.storage_service import read_data, get_by_id, get_by_field
from services.pdf_service import generate_incident_report, generate_situation_report
from services.ai_service import generate_situation_summary
from utils.auth import get_current_user
import os

router = APIRouter()


@router.get("/incident/{incident_id}")
async def download_incident_report(incident_id: str, current_user: dict = Depends(get_current_user)):
    incident = await get_by_id("incidents", incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if current_user.get("role") == "citizen" and incident.get("user_id") != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Access denied")

    assignments = await read_data("assignments")
    assignment = next((a for a in assignments if a.get("incident_id") == incident_id), None)

    users = await read_data("users")
    user = next((u for u in users if u.get("id") == incident.get("user_id")), None)

    filepath = generate_incident_report(incident, assignment, user)
    filename = os.path.basename(filepath)

    return FileResponse(
        path=filepath,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/situation")
async def download_situation_report(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["authority", "volunteer"]:
        raise HTTPException(status_code=403, detail="Access denied")

    incidents = await read_data("incidents")
    resources = await read_data("resources")
    volunteers = await read_data("volunteers")
    camps = await read_data("relief_camps")

    ai_summary = await generate_situation_summary(incidents, resources, volunteers)

    filepath = generate_situation_report(incidents, resources, volunteers, camps, ai_summary)
    filename = os.path.basename(filepath)

    return FileResponse(
        path=filepath,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
