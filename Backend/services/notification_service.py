from services.storage_service import create_item, get_by_field, update_item
from utils.helpers import generate_id, now_iso


async def create_notification(user_id: str, title: str, message: str, notification_type: str = "info", incident_id: str | None = None) -> dict:
    notification = {
        "id": generate_id(),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "incident_id": incident_id,
        "read": False,
        "created_at": now_iso(),
    }
    await create_item("notifications", notification)
    return notification


async def notify_incident_received(user_id: str, incident_id: str, district: str) -> None:
    await create_notification(
        user_id=user_id,
        title="Incident Report Received",
        message=f"Your incident report from {district} has been received and is being reviewed by our team.",
        notification_type="success",
        incident_id=incident_id,
    )


async def notify_rescue_assigned(user_id: str, incident_id: str, team_type: str, eta: str) -> None:
    await create_notification(
        user_id=user_id,
        title="Rescue Team Assigned",
        message=f"A {team_type} has been assigned to your incident. Estimated arrival: {eta}.",
        notification_type="info",
        incident_id=incident_id,
    )


async def notify_incident_completed(user_id: str, incident_id: str) -> None:
    await create_notification(
        user_id=user_id,
        title="Rescue Completed",
        message="Your rescue operation has been marked as completed. Thank you for your patience.",
        notification_type="success",
        incident_id=incident_id,
    )


async def notify_eta_updated(user_id: str, incident_id: str, new_eta: str) -> None:
    await create_notification(
        user_id=user_id,
        title="ETA Updated",
        message=f"The estimated arrival time for your rescue team has been updated to: {new_eta}.",
        notification_type="warning",
        incident_id=incident_id,
    )


async def notify_volunteer_assigned(user_id: str, incident_id: str, disaster_type: str, district: str) -> None:
    await create_notification(
        user_id=user_id,
        title="You've Been Assigned to an Incident",
        message=f"Authority has assigned you to handle a {disaster_type} incident in {district}. Please accept or decline from your dashboard.",
        notification_type="warning",
        incident_id=incident_id,
    )
