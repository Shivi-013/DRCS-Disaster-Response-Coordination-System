from fastapi import APIRouter, HTTPException, Depends, Query
from services.storage_service import read_data, update_item, delete_item
from utils.auth import get_current_user
from utils.helpers import now_iso

router = APIRouter()


@router.get("/")
async def list_notifications(
    unread_only: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    notifications = await read_data("notifications")
    user_notifications = [n for n in notifications if n.get("user_id") == current_user["sub"]]
    if unread_only:
        user_notifications = [n for n in user_notifications if not n.get("read")]
    user_notifications = sorted(user_notifications, key=lambda x: x.get("created_at", ""), reverse=True)
    unread_count = len([n for n in user_notifications if not n.get("read")])
    return {"items": user_notifications, "total": len(user_notifications), "unread_count": unread_count}


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    updated = await update_item("notifications", notification_id, {"read": True, "read_at": now_iso()})
    if not updated:
        raise HTTPException(status_code=404, detail="Notification not found")
    return updated


@router.patch("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    notifications = await read_data("notifications")
    for n in notifications:
        if n.get("user_id") == current_user["sub"] and not n.get("read"):
            await update_item("notifications", n["id"], {"read": True, "read_at": now_iso()})
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, current_user: dict = Depends(get_current_user)):
    notifications = await read_data("notifications")
    notification = next((n for n in notifications if n.get("id") == notification_id), None)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.get("user_id") != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Access denied")
    await delete_item("notifications", notification_id)
    return {"message": "Notification deleted"}


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    notifications = await read_data("notifications")
    count = len([n for n in notifications if n.get("user_id") == current_user["sub"] and not n.get("read")])
    return {"count": count}
