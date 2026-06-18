from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import Optional, List
from pydantic import BaseModel
from services.storage_service import read_data, create_item, update_item, delete_item, get_by_id
from utils.auth import get_current_user
from utils.helpers import generate_id, now_iso
from services.notification_service import notify_rescue_assigned

router = APIRouter()


class VolunteerCreate(BaseModel):
    name: str
    email: str
    phone: str
    blood_group: str
    skills: List[str]
    district: str
    availability: str


class VolunteerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    skills: Optional[List[str]] = None
    district: Optional[str] = None
    availability: Optional[str] = None
    status: Optional[str] = None


@router.get("/")
async def list_volunteers(
    district: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    approved: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    volunteers = await read_data("volunteers")

    if district:
        volunteers = [v for v in volunteers if v.get("district", "").lower() == district.lower()]
    if status:
        volunteers = [v for v in volunteers if v.get("status", "").lower() == status.lower()]
    if approved is not None:
        volunteers = [v for v in volunteers if v.get("approved") == approved]
    if search:
        q = search.lower()
        volunteers = [v for v in volunteers if q in v.get("name", "").lower() or q in v.get("district", "").lower()]

    return {"items": volunteers, "total": len(volunteers)}


@router.post("/")
async def create_volunteer(req: VolunteerCreate, current_user: dict = Depends(get_current_user)):
    volunteer = {
        "id": generate_id(),
        "user_id": current_user["sub"],
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "blood_group": req.blood_group,
        "skills": req.skills,
        "district": req.district,
        "availability": req.availability,
        "approved": False,
        "status": "Pending",
        "assigned_incident_id": None,
        "created_at": now_iso(),
        "approved_at": None,
    }
    await create_item("volunteers", volunteer)
    return volunteer


@router.get("/{volunteer_id}")
async def get_volunteer(volunteer_id: str, current_user: dict = Depends(get_current_user)):
    volunteer = await get_by_id("volunteers", volunteer_id)
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    return volunteer


@router.put("/{volunteer_id}")
async def update_volunteer(volunteer_id: str, req: VolunteerUpdate, current_user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    updated = await update_item("volunteers", volunteer_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    return updated


@router.patch("/{volunteer_id}/approve")
async def approve_volunteer(volunteer_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    updated = await update_item("volunteers", volunteer_id, {
        "approved": True,
        "status": "Active",
        "approved_at": now_iso(),
        "approved_by": current_user["sub"],
    })
    if not updated:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    return updated


@router.patch("/{volunteer_id}/reject")
async def reject_volunteer(volunteer_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    updated = await update_item("volunteers", volunteer_id, {
        "approved": False,
        "status": "Rejected",
        "updated_at": now_iso(),
    })
    if not updated:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    return updated


@router.patch("/{volunteer_id}/deactivate")
async def deactivate_volunteer(volunteer_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    updated = await update_item("volunteers", volunteer_id, {"status": "Inactive", "updated_at": now_iso()})
    if not updated:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    return updated


@router.post("/{volunteer_id}/self-assign")
async def self_assign_incident(
    volunteer_id: str,
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    incident_id = body.get("incident_id")
    if not incident_id:
        raise HTTPException(status_code=400, detail="incident_id required")

    volunteer = await get_by_id("volunteers", volunteer_id)
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    if not volunteer.get("approved"):
        raise HTTPException(status_code=403, detail="Your volunteer account is not approved yet")
    if volunteer.get("assigned_incident_id"):
        raise HTTPException(status_code=400, detail="You are already assigned to an incident")

    incident = await get_by_id("incidents", incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Create assignment record
    assignment = {
        "id": generate_id(),
        "incident_id": incident_id,
        "team_type": "Volunteer Group",
        "team_members": [volunteer_id],
        "resource_ids": [],
        "eta": "En Route",
        "notes": f"Volunteer {volunteer['name']} self-assigned to assist.",
        "status": "En Route",
        "assigned_by": volunteer_id,
        "self_assigned": True,
        "volunteer_status": "accepted",
        "assigned_at": now_iso(),
        "completed_at": None,
    }
    await create_item("assignments", assignment)

    # Update volunteer and incident
    await update_item("volunteers", volunteer_id, {
        "assigned_incident_id": incident_id,
        "updated_at": now_iso(),
    })
    await update_item("incidents", incident_id, {
        "status": "Rescue Assigned",
        "assignment_id": assignment["id"],
        "updated_at": now_iso(),
    })

    # Notify all authority users
    users = await read_data("users")
    for u in users:
        if u.get("role") == "authority":
            notif = {
                "id": generate_id(),
                "user_id": u["id"],
                "title": "Volunteer Self-Assigned",
                "message": f"{volunteer['name']} has self-assigned to {incident.get('disaster_type', 'incident')} in {incident.get('district', '')}. Please review.",
                "type": "info",
                "incident_id": incident_id,
                "read": False,
                "created_at": now_iso(),
            }
            await create_item("notifications", notif)

    # Notify the citizen that help is coming
    if incident.get("user_id"):
        await notify_rescue_assigned(
            incident["user_id"], incident_id,
            "Volunteer Group", "En Route"
        )

    return assignment


@router.patch("/{volunteer_id}/unassign")
async def unassign_volunteer(volunteer_id: str, current_user: dict = Depends(get_current_user)):
    await update_item("volunteers", volunteer_id, {
        "assigned_incident_id": None,
        "updated_at": now_iso(),
    })
    return {"message": "Unassigned successfully"}


@router.delete("/{volunteer_id}")
async def delete_volunteer(volunteer_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    deleted = await delete_item("volunteers", volunteer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    return {"message": "Volunteer removed"}
