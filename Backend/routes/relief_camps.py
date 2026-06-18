from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import Optional, List
from pydantic import BaseModel
from services.storage_service import read_data, create_item, update_item, delete_item, get_by_id
from utils.auth import get_current_user
from utils.helpers import generate_id, now_iso

router = APIRouter()


class ReliefCampCreate(BaseModel):
    name: str
    district: str
    address: str
    lat: float
    lng: float
    capacity: int
    contact_person: str
    contact_phone: str
    facilities: Optional[List[str]] = []


class ReliefCampUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    capacity: Optional[int] = None
    occupied: Optional[int] = None
    beds_available: Optional[int] = None
    medical_staff: Optional[int] = None
    food_stock_days: Optional[int] = None
    water_stock_liters: Optional[int] = None
    status: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    facilities: Optional[List[str]] = None


class BookingCreate(BaseModel):
    beds: int
    notes: Optional[str] = None


@router.get("/")
async def list_camps(
    district: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    camps = await read_data("relief_camps")
    if district:
        camps = [c for c in camps if c.get("district", "").lower() == district.lower()]
    if status:
        camps = [c for c in camps if c.get("status", "").lower() == status.lower()]
    if search:
        q = search.lower()
        camps = [c for c in camps if q in c.get("name", "").lower() or q in c.get("district", "").lower()]

    total_capacity = sum(c.get("capacity", 0) for c in camps)
    total_occupied = sum(c.get("occupied", 0) for c in camps)

    return {
        "items": camps,
        "total": len(camps),
        "stats": {
            "total_capacity": total_capacity,
            "total_occupied": total_occupied,
            "occupancy_rate": round(total_occupied / total_capacity * 100, 1) if total_capacity > 0 else 0,
            "active": len([c for c in camps if c.get("status") == "Active"]),
            "full": len([c for c in camps if c.get("status") == "Full"]),
        },
    }


@router.post("/")
async def create_camp(req: ReliefCampCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    camp = {
        "id": generate_id(),
        "name": req.name,
        "district": req.district,
        "address": req.address,
        "lat": req.lat,
        "lng": req.lng,
        "capacity": req.capacity,
        "occupied": 0,
        "beds_available": req.capacity,
        "medical_staff": 0,
        "food_stock_days": 0,
        "water_stock_liters": 0,
        "status": "Active",
        "contact_person": req.contact_person,
        "contact_phone": req.contact_phone,
        "facilities": req.facilities,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await create_item("relief_camps", camp)
    return camp


# IMPORTANT: /my-bookings and /cancel-booking MUST come before /{camp_id}

@router.get("/my-bookings")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await read_data("bookings")
    my = [b for b in bookings if b.get("user_id") == current_user["sub"] and b.get("status") == "Active"]
    my.sort(key=lambda b: b.get("booked_at", ""), reverse=True)
    return {"items": my, "total": len(my)}


@router.patch("/cancel-booking/{booking_id}")
async def cancel_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await get_by_id("bookings", booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("user_id") != current_user["sub"] and current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    if booking.get("status") != "Active":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    await update_item("bookings", booking_id, {"status": "Cancelled", "cancelled_at": now_iso()})

    # Release the beds back to the camp
    camp = await get_by_id("relief_camps", booking["camp_id"])
    if camp:
        beds = booking.get("beds_booked", 0)
        new_occupied = max(0, camp.get("occupied", 0) - beds)
        capacity = camp.get("capacity", 0)
        beds_available = max(0, capacity - new_occupied)
        occupancy_pct = (new_occupied / capacity * 100) if capacity > 0 else 0
        status = camp.get("status", "Active")
        if status == "Full" and occupancy_pct < 90:
            status = "Active"
        await update_item("relief_camps", booking["camp_id"], {
            "occupied": new_occupied,
            "beds_available": beds_available,
            "status": status,
            "updated_at": now_iso(),
        })

    return {"message": "Booking cancelled", "beds_released": booking.get("beds_booked", 0)}


@router.get("/{camp_id}")
async def get_camp(camp_id: str, current_user: dict = Depends(get_current_user)):
    camp = await get_by_id("relief_camps", camp_id)
    if not camp:
        raise HTTPException(status_code=404, detail="Relief camp not found")
    return camp


@router.put("/{camp_id}")
async def update_camp(camp_id: str, req: ReliefCampUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()

    camp = await get_by_id("relief_camps", camp_id)
    if not camp:
        raise HTTPException(status_code=404, detail="Relief camp not found")

    if "occupied" in updates:
        capacity = updates.get("capacity", camp.get("capacity", 0))
        updates["beds_available"] = max(0, capacity - updates["occupied"])
        if updates["occupied"] >= capacity * 0.95:
            updates["status"] = "Full"
        elif camp.get("status") == "Full":
            updates["status"] = "Active"

    updated = await update_item("relief_camps", camp_id, updates)
    return updated


@router.post("/{camp_id}/book")
async def book_beds(
    camp_id: str,
    req: BookingCreate,
    current_user: dict = Depends(get_current_user),
):
    if req.beds < 1 or req.beds > 50:
        raise HTTPException(status_code=400, detail="Number of beds must be between 1 and 50")

    camp = await get_by_id("relief_camps", camp_id)
    if not camp:
        raise HTTPException(status_code=404, detail="Camp not found")
    if camp.get("status") == "Closed":
        raise HTTPException(status_code=400, detail="This camp is closed")
    if camp.get("status") == "Full":
        raise HTTPException(status_code=400, detail="This camp is full — no beds available")

    beds_available = camp.get("beds_available", 0)
    if beds_available < req.beds:
        raise HTTPException(
            status_code=400,
            detail=f"Only {beds_available} bed{'s' if beds_available != 1 else ''} available"
        )

    new_occupied = camp.get("occupied", 0) + req.beds
    capacity = camp.get("capacity", 0)
    new_beds_available = max(0, capacity - new_occupied)
    occupancy_pct = (new_occupied / capacity * 100) if capacity > 0 else 0
    status = "Full" if occupancy_pct >= 95 else camp.get("status", "Active")

    updated_camp = await update_item("relief_camps", camp_id, {
        "occupied": new_occupied,
        "beds_available": new_beds_available,
        "status": status,
        "updated_at": now_iso(),
    })

    booking = {
        "id": generate_id(),
        "camp_id": camp_id,
        "camp_name": camp.get("name"),
        "camp_district": camp.get("district"),
        "camp_address": camp.get("address"),
        "camp_phone": camp.get("contact_phone"),
        "user_id": current_user["sub"],
        "user_name": current_user.get("name"),
        "beds_booked": req.beds,
        "status": "Active",
        "notes": req.notes,
        "booked_at": now_iso(),
    }
    await create_item("bookings", booking)

    return {"camp": updated_camp, "booking": booking}


@router.get("/{camp_id}/bookings")
async def get_camp_bookings(camp_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    bookings = await read_data("bookings")
    camp_bookings = [b for b in bookings if b.get("camp_id") == camp_id]
    camp_bookings.sort(key=lambda b: b.get("booked_at", ""), reverse=True)
    return {"items": camp_bookings, "total": len(camp_bookings)}


@router.patch("/{camp_id}/restock")
async def restock_camp(camp_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    camp = await get_by_id("relief_camps", camp_id)
    if not camp:
        raise HTTPException(status_code=404, detail="Relief camp not found")
    updated = await update_item("relief_camps", camp_id, {
        "food_stock_days": 30,
        "water_stock_liters": 10000,
        "medical_staff": max(camp.get("medical_staff", 0), 5),
        "updated_at": now_iso(),
    })
    return updated


@router.patch("/{camp_id}/occupancy")
async def update_occupancy(
    camp_id: str,
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    camp = await get_by_id("relief_camps", camp_id)
    if not camp:
        raise HTTPException(status_code=404, detail="Relief camp not found")

    delta = body.get("delta", 0)
    capacity = camp.get("capacity", 0)
    new_occupied = max(0, min(capacity, camp.get("occupied", 0) + delta))
    beds_available = max(0, capacity - new_occupied)
    occupancy_pct = (new_occupied / capacity * 100) if capacity > 0 else 0

    if occupancy_pct >= 95:
        status = "Full"
    elif camp.get("status") == "Full" and occupancy_pct < 90:
        status = "Active"
    else:
        status = camp.get("status", "Active")

    updated = await update_item("relief_camps", camp_id, {
        "occupied": new_occupied,
        "beds_available": beds_available,
        "status": status,
        "updated_at": now_iso(),
    })
    return updated


@router.delete("/{camp_id}")
async def delete_camp(camp_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    deleted = await delete_item("relief_camps", camp_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Relief camp not found")
    return {"message": "Relief camp deleted"}
