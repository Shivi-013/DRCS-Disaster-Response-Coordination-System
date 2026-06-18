from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import Optional
from services.storage_service import read_data, get_by_id
from services.ai_service import (
    calculate_priority, generate_situation_summary,
    match_volunteers, generate_mission_briefing, forecast_supply,
)
from utils.auth import get_current_user

router = APIRouter()


class PriorityRequest(BaseModel):
    people_trapped: int = 0
    children_present: bool = False
    senior_citizens_present: bool = False
    medical_emergency: bool = False
    pregnant_woman_present: bool = False
    water_level: str = ""
    description: str = ""
    disaster_type: str = ""


@router.post("/priority")
async def get_priority(req: PriorityRequest, current_user: dict = Depends(get_current_user)):
    result = await calculate_priority(req.model_dump())
    return result


@router.get("/situation-summary")
async def get_situation_summary(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["authority", "volunteer"]:
        raise HTTPException(status_code=403, detail="Access denied")

    incidents = await read_data("incidents")
    resources = await read_data("resources")
    volunteers = await read_data("volunteers")

    summary = await generate_situation_summary(incidents, resources, volunteers)
    return summary


@router.post("/volunteer-match")
async def ai_volunteer_match(body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")

    incident_id = body.get("incident_id")
    if not incident_id:
        raise HTTPException(status_code=400, detail="incident_id required")

    incident = await get_by_id("incidents", incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    volunteers = await read_data("volunteers")
    available = [v for v in volunteers if v.get("approved") and not v.get("assigned_incident_id")]

    rankings = await match_volunteers(incident, available)
    return {"rankings": rankings, "total": len(rankings)}


@router.get("/mission-briefing/{assignment_id}")
async def get_mission_briefing(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await get_by_id("assignments", assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    incident = await get_by_id("incidents", assignment["incident_id"])
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Nearest camp in same district
    camps = await read_data("relief_camps")
    district_camps = [
        c for c in camps
        if c.get("district", "").lower() == incident.get("district", "").lower()
        and c.get("status") != "Closed"
    ]
    nearest_camp = district_camps[0] if district_camps else None

    # Citizen contact
    citizen_contact = None
    if incident.get("user_id"):
        users = await read_data("users")
        citizen = next((u for u in users if u["id"] == incident["user_id"]), None)
        if citizen:
            citizen_contact = {"name": citizen.get("name"), "phone": citizen.get("phone")}

    briefing = await generate_mission_briefing(assignment, incident, nearest_camp, citizen_contact)
    return briefing


@router.get("/supply-forecast")
async def get_supply_forecast(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")

    camps = await read_data("relief_camps")
    incidents = await read_data("incidents")
    bookings = await read_data("bookings")

    return await forecast_supply(camps, incidents, bookings)


@router.get("/quick-stats")
async def get_quick_stats(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")

    incidents = await read_data("incidents")
    resources = await read_data("resources")
    volunteers = await read_data("volunteers")
    camps = await read_data("relief_camps")

    active_incidents = [i for i in incidents if i.get("status") not in ["Completed", "Closed"]]
    critical = [i for i in active_incidents if i.get("priority") == "Critical"]

    districts = {}
    for inc in active_incidents:
        d = inc.get("district", "Unknown")
        districts[d] = districts.get(d, 0) + 1

    return {
        "total_incidents": len(incidents),
        "active_incidents": len(active_incidents),
        "critical_incidents": len(critical),
        "total_people_trapped": sum(i.get("people_trapped", 0) for i in active_incidents),
        "available_resources": len([r for r in resources if r.get("status") == "Available"]),
        "active_volunteers": len([v for v in volunteers if v.get("approved") and v.get("status") == "Active"]),
        "camp_occupancy": sum(c.get("occupied", 0) for c in camps),
        "camp_capacity": sum(c.get("capacity", 0) for c in camps),
        "most_affected_districts": sorted(districts.items(), key=lambda x: x[1], reverse=True)[:5],
    }
