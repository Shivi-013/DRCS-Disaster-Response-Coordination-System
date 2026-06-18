from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from typing import Optional
from pathlib import Path
import shutil
import os
from services.storage_service import read_data, create_item, update_item, delete_item, get_by_id
from services.ai_service import calculate_priority
from services.notification_service import notify_incident_received
from utils.auth import get_current_user
from utils.helpers import generate_id, now_iso, filter_incidents

router = APIRouter()
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"


@router.get("/")
async def list_incidents(
    district: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    disaster_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    incidents = await read_data("incidents")
    if current_user.get("role") == "citizen":
        incidents = [i for i in incidents if i.get("user_id") == current_user["sub"]]

    filters = {k: v for k, v in {"district": district, "priority": priority, "status": status, "disaster_type": disaster_type, "search": search}.items() if v}
    incidents = filter_incidents(incidents, filters)
    incidents = sorted(incidents, key=lambda x: x.get("created_at", ""), reverse=True)

    total = len(incidents)
    start = (page - 1) * per_page
    return {
        "items": incidents[start:start + per_page],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.post("/")
async def create_incident(
    name: str = Form(...),
    phone: str = Form(...),
    district: str = Form(...),
    village: str = Form(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    disaster_type: str = Form(...),
    people_trapped: int = Form(0),
    children_present: bool = Form(False),
    senior_citizens_present: bool = Form(False),
    medical_emergency: bool = Form(False),
    pregnant_woman_present: bool = Form(False),
    water_level: str = Form(""),
    description: str = Form(""),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    image_url = None
    if image and image.filename:
        ext = Path(image.filename).suffix
        filename = f"{generate_id()}{ext}"
        filepath = UPLOADS_DIR / filename
        with open(filepath, "wb") as f:
            shutil.copyfileobj(image.file, f)
        image_url = f"/uploads/{filename}"

    incident_data = {
        "people_trapped": people_trapped,
        "children_present": children_present,
        "senior_citizens_present": senior_citizens_present,
        "medical_emergency": medical_emergency,
        "pregnant_woman_present": pregnant_woman_present,
        "water_level": water_level,
        "description": description,
        "disaster_type": disaster_type,
    }

    priority_result = await calculate_priority(incident_data)

    incident = {
        "id": generate_id(),
        "user_id": current_user["sub"],
        "name": name,
        "phone": phone,
        "district": district,
        "village": village,
        "lat": lat or 0.0,
        "lng": lng or 0.0,
        "disaster_type": disaster_type,
        "people_trapped": people_trapped,
        "children_present": children_present,
        "senior_citizens_present": senior_citizens_present,
        "medical_emergency": medical_emergency,
        "pregnant_woman_present": pregnant_woman_present,
        "water_level": water_level,
        "description": description,
        "image_url": image_url,
        "priority": priority_result.get("priority", "Medium"),
        "priority_score": priority_result.get("score", 50),
        "priority_reasoning": priority_result.get("reasoning", ""),
        "recommended_resources": priority_result.get("recommended_resources", []),
        "estimated_response_time": priority_result.get("estimated_response_time", ""),
        "status": "Pending",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    await create_item("incidents", incident)
    await notify_incident_received(current_user["sub"], incident["id"], district)

    return incident


@router.get("/{incident_id}")
async def get_incident(incident_id: str, current_user: dict = Depends(get_current_user)):
    incident = await get_by_id("incidents", incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.get("role") == "citizen" and incident.get("user_id") != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return incident


@router.put("/{incident_id}")
async def update_incident(incident_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["authority", "volunteer"]:
        raise HTTPException(status_code=403, detail="Access denied")
    updates["updated_at"] = now_iso()
    updated = await update_item("incidents", incident_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Incident not found")
    return updated


@router.patch("/{incident_id}/status")
async def update_status(incident_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["authority", "volunteer"]:
        raise HTTPException(status_code=403, detail="Access denied")
    new_status = body.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status required")
    updated = await update_item("incidents", incident_id, {"status": new_status, "updated_at": now_iso()})
    if not updated:
        raise HTTPException(status_code=404, detail="Incident not found")
    return updated


@router.delete("/{incident_id}")
async def delete_incident(incident_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    deleted = await delete_item("incidents", incident_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"message": "Incident deleted"}


@router.get("/stats/summary")
async def get_stats(current_user: dict = Depends(get_current_user)):
    incidents = await read_data("incidents")
    if current_user.get("role") == "citizen":
        incidents = [i for i in incidents if i.get("user_id") == current_user["sub"]]

    return {
        "total": len(incidents),
        "pending": len([i for i in incidents if i.get("status") == "Pending"]),
        "active": len([i for i in incidents if i.get("status") in ["Under Review", "Rescue Assigned", "In Progress"]]),
        "completed": len([i for i in incidents if i.get("status") in ["Completed", "Closed"]]),
        "critical": len([i for i in incidents if i.get("priority") == "Critical"]),
        "high": len([i for i in incidents if i.get("priority") == "High"]),
        "total_trapped": sum(i.get("people_trapped", 0) for i in incidents),
    }
