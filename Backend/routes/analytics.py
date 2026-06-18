from fastapi import APIRouter, Depends
from collections import defaultdict
from services.storage_service import read_data
from utils.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_analytics(current_user: dict = Depends(get_current_user)):
    incidents = await read_data("incidents")
    volunteers = await read_data("volunteers")
    resources = await read_data("resources")
    camps = await read_data("relief_camps")
    assignments = await read_data("assignments")

    by_district = defaultdict(int)
    by_type = defaultdict(int)
    by_priority = defaultdict(int)
    by_status = defaultdict(int)
    by_day = defaultdict(int)

    for inc in incidents:
        by_district[inc.get("district", "Unknown")] += 1
        by_type[inc.get("disaster_type", "Unknown")] += 1
        by_priority[inc.get("priority", "Unknown")] += 1
        by_status[inc.get("status", "Unknown")] += 1

        created = inc.get("created_at", "")
        if created:
            try:
                day = created[:10]
                by_day[day] += 1
            except Exception:
                pass

    sorted_days = sorted(by_day.items())[-30:]

    active = [i for i in incidents if i.get("status") not in ["Completed", "Closed"]]
    completed = [i for i in incidents if i.get("status") in ["Completed", "Closed"]]

    return {
        "overview": {
            "total_incidents": len(incidents),
            "active_incidents": len(active),
            "completed_rescues": len(completed),
            "people_rescued": sum(i.get("people_trapped", 0) for i in completed),
            "people_at_risk": sum(i.get("people_trapped", 0) for i in active),
            "total_volunteers": len(volunteers),
            "approved_volunteers": len([v for v in volunteers if v.get("approved")]),
            "total_resources": len(resources),
            "available_resources": len([r for r in resources if r.get("status") == "Available"]),
            "total_camps": len(camps),
            "camp_capacity": sum(c.get("capacity", 0) for c in camps),
            "camp_occupied": sum(c.get("occupied", 0) for c in camps),
            "assignments_total": len(assignments),
            "assignments_active": len([a for a in assignments if a.get("status") not in ["Completed"]]),
        },
        "by_district": dict(sorted(by_district.items(), key=lambda x: x[1], reverse=True)),
        "by_type": dict(by_type),
        "by_priority": dict(by_priority),
        "by_status": dict(by_status),
        "timeline": [{"date": d, "count": c} for d, c in sorted_days],
        "resource_breakdown": {
            "available": len([r for r in resources if r.get("status") == "Available"]),
            "assigned": len([r for r in resources if r.get("status") == "Assigned"]),
            "maintenance": len([r for r in resources if r.get("status") == "Maintenance"]),
        },
        "volunteer_breakdown": {
            "active": len([v for v in volunteers if v.get("status") == "Active"]),
            "pending": len([v for v in volunteers if v.get("status") == "Pending"]),
            "inactive": len([v for v in volunteers if v.get("status") == "Inactive"]),
        },
        "medical_emergencies": len([i for i in incidents if i.get("medical_emergency")]),
        "children_involved": len([i for i in incidents if i.get("children_present")]),
        "pregnant_women": len([i for i in incidents if i.get("pregnant_woman_present")]),
    }


@router.get("/district-heatmap")
async def get_district_heatmap(current_user: dict = Depends(get_current_user)):
    incidents = await read_data("incidents")
    heatmap = defaultdict(lambda: {"count": 0, "critical": 0, "people_trapped": 0})

    for inc in incidents:
        d = inc.get("district", "Unknown")
        heatmap[d]["count"] += 1
        heatmap[d]["people_trapped"] += inc.get("people_trapped", 0)
        if inc.get("priority") == "Critical":
            heatmap[d]["critical"] += 1

    return {"districts": dict(heatmap)}
