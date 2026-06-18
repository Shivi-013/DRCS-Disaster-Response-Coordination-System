from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel
from services.storage_service import read_data, create_item, update_item, delete_item, get_by_id
from utils.auth import get_current_user
from utils.helpers import generate_id, now_iso

router = APIRouter()

RESOURCE_TYPES = ["Boat", "Life Jacket", "Medical Kit", "Food Pack", "Water Tanker",
                  "Rescue Rope", "Generator", "Blanket", "Tent", "Medicine", "Ambulance", "Other"]


class ResourceRequestCreate(BaseModel):
    incident_id: str
    resource_type: str
    quantity: int = 1
    urgency: str = "Medium"
    notes: Optional[str] = ""


@router.get("/")
async def list_resource_requests(
    status: Optional[str] = Query(None),
    incident_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    requests = await read_data("resource_requests")
    if incident_id:
        requests = [r for r in requests if r.get("incident_id") == incident_id]
    if status:
        requests = [r for r in requests if r.get("status", "").lower() == status.lower()]
    if current_user.get("role") == "volunteer":
        requests = [r for r in requests if r.get("requested_by_user_id") == current_user["sub"]]
    return {"items": sorted(requests, key=lambda x: x.get("created_at", ""), reverse=True), "total": len(requests)}


@router.post("/")
async def create_resource_request(req: ResourceRequestCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["volunteer", "authority"]:
        raise HTTPException(status_code=403, detail="Only volunteers or authority can request resources")

    incident = await get_by_id("incidents", req.incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    volunteers = await read_data("volunteers")
    vol = next((v for v in volunteers if v.get("user_id") == current_user["sub"]), None)

    resource_request = {
        "id": generate_id(),
        "incident_id": req.incident_id,
        "incident_type": incident.get("disaster_type", ""),
        "incident_district": incident.get("district", ""),
        "resource_type": req.resource_type,
        "quantity": req.quantity,
        "urgency": req.urgency,
        "notes": req.notes,
        "status": "Pending",
        "requested_by_user_id": current_user["sub"],
        "requested_by_name": current_user.get("name", ""),
        "volunteer_id": vol["id"] if vol else None,
        "created_at": now_iso(),
        "reviewed_at": None,
        "reviewed_by": None,
    }
    await create_item("resource_requests", resource_request)
    return resource_request


@router.patch("/{request_id}/approve")
async def approve_resource_request(request_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    updated = await update_item("resource_requests", request_id, {
        "status": "Approved",
        "reviewed_at": now_iso(),
        "reviewed_by": current_user.get("name", current_user["sub"]),
    })
    if not updated:
        raise HTTPException(status_code=404, detail="Request not found")
    return updated


@router.patch("/{request_id}/deny")
async def deny_resource_request(request_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    updated = await update_item("resource_requests", request_id, {
        "status": "Denied",
        "reviewed_at": now_iso(),
        "reviewed_by": current_user.get("name", current_user["sub"]),
    })
    if not updated:
        raise HTTPException(status_code=404, detail="Request not found")
    return updated


@router.get("/types")
async def get_resource_types(current_user: dict = Depends(get_current_user)):
    return {"types": RESOURCE_TYPES}
