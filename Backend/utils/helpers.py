import uuid
from datetime import datetime
from typing import Any


def generate_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def paginate(items: list, page: int = 1, per_page: int = 20) -> dict:
    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


def filter_incidents(incidents: list, filters: dict) -> list:
    result = incidents
    if filters.get("district"):
        result = [i for i in result if i.get("district", "").lower() == filters["district"].lower()]
    if filters.get("priority"):
        result = [i for i in result if i.get("priority", "").lower() == filters["priority"].lower()]
    if filters.get("status"):
        result = [i for i in result if i.get("status", "").lower() == filters["status"].lower()]
    if filters.get("disaster_type"):
        result = [i for i in result if i.get("disaster_type", "").lower() == filters["disaster_type"].lower()]
    if filters.get("medical_emergency") is not None:
        result = [i for i in result if i.get("medical_emergency") == filters["medical_emergency"]]
    if filters.get("search"):
        q = filters["search"].lower()
        result = [
            i for i in result
            if q in i.get("name", "").lower()
            or q in i.get("description", "").lower()
            or q in i.get("village", "").lower()
            or q in i.get("district", "").lower()
        ]
    return result
