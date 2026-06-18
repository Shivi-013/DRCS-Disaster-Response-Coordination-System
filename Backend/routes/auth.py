from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from services.storage_service import read_data, create_item, get_by_field, update_item
from utils.auth import verify_password, get_password_hash, create_access_token, get_current_user
from utils.helpers import generate_id, now_iso

router = APIRouter()


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    role: str = "citizen"
    district: Optional[str] = None
    address: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None


@router.post("/register")
async def register(req: RegisterRequest):
    users = await read_data("users")
    if any(u["email"].lower() == req.email.lower() for u in users):
        raise HTTPException(status_code=400, detail="Email already registered")

    if req.role not in ["citizen", "volunteer", "authority"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = {
        "id": generate_id(),
        "name": req.name,
        "email": req.email.lower(),
        "phone": req.phone,
        "password": get_password_hash(req.password),
        "role": req.role,
        "district": req.district,
        "address": req.address,
        "is_active": True,
        "created_at": now_iso(),
    }
    await create_item("users", user)

    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role"], "name": user["name"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {k: v for k, v in user.items() if k != "password"},
    }


@router.post("/login")
async def login(req: LoginRequest):
    users = await read_data("users")
    user = next((u for u in users if u["email"].lower() == req.email.lower()), None)

    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role"], "name": user["name"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {k: v for k, v in user.items() if k != "password"},
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    users = await read_data("users")
    user = next((u for u in users if u["id"] == current_user["sub"]), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {k: v for k, v in user.items() if k != "password"}


@router.put("/profile")
async def update_profile(req: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    updated = await update_item("users", current_user["sub"], updates)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return {k: v for k, v in updated.items() if k != "password"}


@router.get("/users")
async def list_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Access denied")
    users = await read_data("users")
    return [{k: v for k, v in u.items() if k != "password"} for u in users]


@router.get("/users/{user_id}/contact")
async def get_user_contact(user_id: str, current_user: dict = Depends(get_current_user)):
    users = await read_data("users")
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user["id"], "name": user["name"], "phone": user["phone"], "role": user["role"]}
