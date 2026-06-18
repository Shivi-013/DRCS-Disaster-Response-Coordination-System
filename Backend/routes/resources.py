from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from pydantic import BaseModel
from services.storage_service import read_data, create_item, update_item, delete_item, get_by_id
from utils.auth import get_current_user
from utils.helpers import generate_id, now_iso

router = APIRouter()

RESOURCE_TYPES = ["Rescue Boat", "Ambulance", "Fire Truck", "Medical Kit", "Food Truck", "Generator", "Water Pump", "Helicopter", "Police Vehicle", "Tent"]


class ResourceCreate(BaseModel):
    name: str
    type: str
    category: str
    district: str
    quantity: int = 1


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    district: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None


@router.get("/")
async def list_resources(
    district: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    resources = await read_data("resources")

    if district:
        resources = [r for r in resources if r.get("district", "").lower() == district.lower()]
    if status:
        resources = [r for r in resources if r.get("status", "").lower() == status.lower()]
    if type:
        resources = [r for r in resources if r.get("type", "").lower() == type.lower()]
    if search:
        q = search.lower()
        resources = [r for r in resources if q in r.get("name", "").lower() or q in r.get("type", "").lower()]

    stats = {
        "total": len(resources),
        "available": len([r for r in resources if r.get("status") == "Available"]),
        "assigned": len([r for r in resources if r.get("status") == "Assigned"]),
        "maintenance": len([r for r in resources if r.get("status") == "Maintenance"]),
    }

    return {"items": resources, "total": len(resources), "stats": stats}


@router.post("/")
async def create_resource(req: ResourceCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    resource = {
        "id": generate_id(),
        "name": req.name,
        "type": req.type,
        "category": req.category,
        "district": req.district,
        "status": "Available",
        "assigned_to": None,
        "last_maintained": now_iso(),
        "created_at": now_iso(),
    }
    await create_item("resources", resource)
    return resource


@router.get("/types")
async def get_resource_types(current_user: dict = Depends(get_current_user)):
    return {"types": RESOURCE_TYPES}


@router.get("/{resource_id}")
async def get_resource(resource_id: str, current_user: dict = Depends(get_current_user)):
    resource = await get_by_id("resources", resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@router.put("/{resource_id}")
async def update_resource(resource_id: str, req: ResourceUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    updated = await update_item("resources", resource_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Resource not found")
    return updated


@router.patch("/{resource_id}/status")
async def update_resource_status(resource_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    new_status = body.get("status")
    if new_status not in ["Available", "Assigned", "Maintenance"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    updated = await update_item("resources", resource_id, {"status": new_status, "updated_at": now_iso()})
    if not updated:
        raise HTTPException(status_code=404, detail="Resource not found")
    return updated


@router.delete("/{resource_id}")
async def delete_resource(resource_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    deleted = await delete_item("resources", resource_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {"message": "Resource deleted"}
