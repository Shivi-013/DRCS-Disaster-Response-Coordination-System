import json
import os
import asyncio
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent.parent / "data"

DATA_FILES = {
    "users": DATA_DIR / "users.json",
    "incidents": DATA_DIR / "incidents.json",
    "volunteers": DATA_DIR / "volunteers.json",
    "resources": DATA_DIR / "resources.json",
    "assignments": DATA_DIR / "assignments.json",
    "relief_camps": DATA_DIR / "relief_camps.json",
    "notifications": DATA_DIR / "notifications.json",
    "resource_requests": DATA_DIR / "resource_requests.json",
    "bookings": DATA_DIR / "bookings.json",
}

_lock = asyncio.Lock()


def _read_file(path: Path) -> list:
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            return []


def _write_file(path: Path, data: list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


async def read_data(collection: str) -> list:
    async with _lock:
        return _read_file(DATA_FILES[collection])


async def write_data(collection: str, data: list) -> None:
    async with _lock:
        _write_file(DATA_FILES[collection], data)


async def get_by_id(collection: str, item_id: str) -> dict | None:
    items = await read_data(collection)
    return next((i for i in items if i.get("id") == item_id), None)


async def create_item(collection: str, item: dict) -> dict:
    items = await read_data(collection)
    items.append(item)
    await write_data(collection, items)
    return item


async def update_item(collection: str, item_id: str, updates: dict) -> dict | None:
    items = await read_data(collection)
    for i, item in enumerate(items):
        if item.get("id") == item_id:
            items[i] = {**item, **updates}
            await write_data(collection, items)
            return items[i]
    return None


async def delete_item(collection: str, item_id: str) -> bool:
    items = await read_data(collection)
    new_items = [i for i in items if i.get("id") != item_id]
    if len(new_items) == len(items):
        return False
    await write_data(collection, new_items)
    return True


async def get_by_field(collection: str, field: str, value: Any) -> list:
    items = await read_data(collection)
    return [i for i in items if i.get(field) == value]
