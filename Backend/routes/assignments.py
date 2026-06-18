from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import Optional, List
from pydantic import BaseModel
from services.storage_service import read_data, create_item, update_item, delete_item, get_by_id, get_by_field
from services.notification_service import notify_rescue_assigned, notify_incident_completed, notify_eta_updated, notify_volunteer_assigned
from utils.auth import get_current_user
from utils.helpers import generate_id, now_iso

router = APIRouter()

TEAM_TYPES = ["Boat Rescue Team", "Medical Team", "Fire Team", "Police Unit", "Volunteer Group", "Army Unit", "NDRF Team", "Civil Defence"]


class AssignmentCreate(BaseModel):
    incident_id: str
    team_type: str
    team_members: Optional[List[str]] = []
    resource_ids: Optional[List[str]] = []
    eta: str
    notes: Optional[str] = ""


class AssignmentUpdate(BaseModel):
    team_type: Optional[str] = None
    eta: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


@router.get("/")
async def list_assignments(
    incident_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    assignments = await read_data("assignments")
    if incident_id:
        assignments = [a for a in assignments if a.get("incident_id") == incident_id]
    if status:
        assignments = [a for a in assignments if a.get("status", "").lower() == status.lower()]
    assignments = sorted(assignments, key=lambda x: x.get("assigned_at", ""), reverse=True)
    return {"items": assignments, "total": len(assignments)}


@router.post("/")
async def create_assignment(req: AssignmentCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")

    incident = await get_by_id("incidents", req.incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    assignment = {
        "id": generate_id(),
        "incident_id": req.incident_id,
        "team_type": req.team_type,
        "team_members": req.team_members,
        "resource_ids": req.resource_ids,
        "eta": req.eta,
        "notes": req.notes,
        "status": "Dispatched",
        "assigned_by": current_user["sub"],
        "self_assigned": False,
        "volunteer_status": "pending",
        "assigned_at": now_iso(),
        "completed_at": None,
    }
    await create_item("assignments", assignment)

    await update_item("incidents", req.incident_id, {
        "status": "Rescue Assigned",
        "assignment_id": assignment["id"],
        "updated_at": now_iso(),
    })

    for res_id in (req.resource_ids or []):
        await update_item("resources", res_id, {"status": "Assigned", "assigned_to": req.incident_id})

    # Notify citizen help is coming
    if incident.get("user_id"):
        await notify_rescue_assigned(incident["user_id"], req.incident_id, req.team_type, req.eta)

    # Set pending assignment on each volunteer and notify them
    for vol_id in (req.team_members or []):
        vol = await get_by_id("volunteers", vol_id)
        if vol:
            await update_item("volunteers", vol_id, {
                "assigned_incident_id": req.incident_id,
                "updated_at": now_iso(),
            })
            if vol.get("user_id"):
                await notify_volunteer_assigned(
                    vol["user_id"], req.incident_id,
                    incident.get("disaster_type", "incident"),
                    incident.get("district", ""),
                )

    return assignment


@router.get("/team-types")
async def get_team_types(current_user: dict = Depends(get_current_user)):
    return {"team_types": TEAM_TYPES}


@router.get("/{assignment_id}")
async def get_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await get_by_id("assignments", assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.put("/{assignment_id}")
async def update_assignment(assignment_id: str, req: AssignmentUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")

    assignment = await get_by_id("assignments", assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()

    if req.status == "Completed":
        updates["completed_at"] = now_iso()
        incident = await get_by_id("incidents", assignment["incident_id"])
        if incident:
            await update_item("incidents", assignment["incident_id"], {"status": "Completed", "updated_at": now_iso()})
            if incident.get("user_id"):
                await notify_incident_completed(incident["user_id"], assignment["incident_id"])
        # Free all volunteers in the team so they can take new missions
        for vol_id in assignment.get("team_members", []):
            await update_item("volunteers", vol_id, {"assigned_incident_id": None, "updated_at": now_iso()})

    if req.eta and req.eta != assignment.get("eta"):
        incident = await get_by_id("incidents", assignment["incident_id"])
        if incident and incident.get("user_id"):
            await notify_eta_updated(incident["user_id"], assignment["incident_id"], req.eta)

    updated = await update_item("assignments", assignment_id, updates)
    return updated


@router.patch("/{assignment_id}/complete")
async def volunteer_complete_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await get_by_id("assignments", assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.get("status") == "Completed":
        raise HTTPException(status_code=400, detail="Assignment is already completed")

    # Find the volunteer record for the calling user
    volunteers = await read_data("volunteers")
    volunteer = next((v for v in volunteers if v.get("user_id") == current_user["sub"]), None)

    if not volunteer:
        raise HTTPException(status_code=403, detail="No volunteer profile found for your account")

    if volunteer["id"] not in assignment.get("team_members", []):
        raise HTTPException(status_code=403, detail="You are not assigned to this mission")

    now = now_iso()

    updated = await update_item("assignments", assignment_id, {
        "status": "Completed",
        "completed_at": now,
        "updated_at": now,
    })

    # Mark incident completed
    incident = await get_by_id("incidents", assignment["incident_id"])
    if incident:
        await update_item("incidents", assignment["incident_id"], {
            "status": "Completed",
            "updated_at": now,
        })
        if incident.get("user_id"):
            await notify_incident_completed(incident["user_id"], assignment["incident_id"])

    # Free the volunteer so they can take a new mission
    await update_item("volunteers", volunteer["id"], {
        "assigned_incident_id": None,
        "updated_at": now,
    })

    return updated


@router.patch("/{assignment_id}/volunteer-response")
async def volunteer_response(
    assignment_id: str,
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    action = body.get("action")
    if action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'reject'")

    assignment = await get_by_id("assignments", assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    updates = {"volunteer_status": "accepted" if action == "accept" else "rejected", "updated_at": now_iso()}

    if action == "reject":
        updates["status"] = "Cancelled"
        # Free assigned volunteers
        for vol_id in assignment.get("team_members", []):
            await update_item("volunteers", vol_id, {"assigned_incident_id": None, "updated_at": now_iso()})
        # Revert incident to Under Review
        await update_item("incidents", assignment["incident_id"], {"status": "Under Review", "updated_at": now_iso()})
    else:
        # Confirm volunteer's assignment
        for vol_id in assignment.get("team_members", []):
            await update_item("volunteers", vol_id, {"assigned_incident_id": assignment["incident_id"], "updated_at": now_iso()})

    return await update_item("assignments", assignment_id, updates)


@router.delete("/{assignment_id}")
async def delete_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    deleted = await delete_item("assignments", assignment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Assignment deleted"}
