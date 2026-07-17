"""Availability queries — port of AvailabilityService core logic."""

from __future__ import annotations

from datetime import date

import asyncpg

from app.domain.formatters import parse_brand, parse_slot
from app.domain.pricing import (
    BookingSlot,
    OCCUPYING_STATUSES,
    booking_covers_calendar_day_vn,
    can_add_slot,
    day_count_inclusive,
    each_calendar_day_vn,
    return_next_morning_occupancy_date,
)
from app.db.repositories.cameras import list_public_cameras


def _as_date(value: str | date) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)


async def is_date_closed(pool: asyncpg.Pool, date_str: str | date) -> bool:
    row = await pool.fetchrow(
        '''
        SELECT EXISTS (
          SELECT 1 FROM "ShopClosure"
          WHERE $1::date BETWEEN "startDate" AND "endDate"
        ) AS closed
        ''',
        _as_date(date_str),
    )
    return bool(row and row["closed"])


async def _get_camera_quantity(pool: asyncpg.Pool, camera_id: str) -> int:
    row = await pool.fetchrow('SELECT quantity FROM "Camera" WHERE id = $1', camera_id)
    if not row:
        raise ValueError(f"Camera {camera_id} not found")
    return row["quantity"]


async def _get_occupying_bookings(pool: asyncpg.Pool, camera_id: str) -> list[dict]:
    rows = await pool.fetch(
        '''
        SELECT id, slot, "startBookingDate", "endBookingDate", "returnNextMorning"
        FROM "Booking"
        WHERE "cameraId" = $1 AND status = ANY($2::"BookingStatus"[])
        ''',
        camera_id,
        list(OCCUPYING_STATUSES),
    )
    return [
        {
            "id": r["id"],
            "slot": r["slot"],
            "start": r["startBookingDate"],
            "end": r["endBookingDate"],
            "return_next_morning": r["returnNextMorning"],
        }
        for r in rows
    ]


def _counts_for_day(bookings: list[dict], date_str: str, exclude_id: str | None = None) -> dict:
    counts = {"m": 0, "a": 0, "e": 0, "fd": 0}
    for b in bookings:
        if exclude_id and b["id"] == exclude_id:
            continue
        if not booking_covers_calendar_day_vn(b["start"], b["end"], date_str):
            continue
        slot = b["slot"]
        if slot == "MORNING":
            counts["m"] += 1
        elif slot == "AFTERNOON":
            counts["a"] += 1
        elif slot == "EVENING":
            counts["e"] += 1
        elif slot == "FULL_DAY":
            counts["fd"] += 1
        if b["return_next_morning"]:
            morning_day = return_next_morning_occupancy_date(b["end"])
            if date_str == morning_day:
                counts["m"] += 1
    return counts


async def is_slot_available(
    pool: asyncpg.Pool,
    camera_id: str,
    date_str: str,
    slot: BookingSlot,
    exclude_booking_id: str | None = None,
) -> tuple[bool, int]:
    if await is_date_closed(pool, date_str):
        return False, 0
    quantity = await _get_camera_quantity(pool, camera_id)
    bookings = await _get_occupying_bookings(pool, camera_id)
    c = _counts_for_day(bookings, date_str, exclude_booking_id)
    available = can_add_slot(slot, c["m"], c["a"], c["e"], c["fd"], quantity)
    remaining = max(0, quantity - c["fd"] - max(c["m"], c["a"], c["e"]))
    return available, remaining


async def is_range_available(
    pool: asyncpg.Pool,
    camera_id: str,
    start_date: str,
    end_date: str,
    slot: BookingSlot,
    exclude_booking_id: str | None = None,
) -> tuple[bool, list[dict]]:
    days = each_calendar_day_vn(start_date, end_date)
    results: list[dict] = []
    all_ok = True
    for d in days:
        ok, _ = await is_slot_available(pool, camera_id, d, slot, exclude_booking_id)
        results.append({"date": d, "available": ok})
        if not ok:
            all_ok = False
    return all_ok, results


async def cameras_for_slot(
    pool: asyncpg.Pool,
    brand: str | None,
    start_date: str,
    end_date: str,
    slot: BookingSlot,
) -> list[dict]:
    cameras = await list_public_cameras(pool, brand)
    result: list[dict] = []
    for cam in cameras:
        available, _ = await is_range_available(pool, cam["id"], start_date, end_date, slot)
        row = {**cam, "available": available}
        result.append(row)
    result.sort(key=lambda c: (-c["day_price"], -c["shift_price"], c["name"]))
    return result


async def has_any_available_camera(
    pool: asyncpg.Pool,
    start_date: str,
    end_date: str,
    slot: BookingSlot = "FULL_DAY",
    brand: str | None = None,
    camera_id: str | None = None,
) -> bool:
    if camera_id:
        ok, _ = await is_range_available(pool, camera_id, start_date, end_date, slot)
        return ok
    cams = await cameras_for_slot(pool, brand, start_date, end_date, slot)
    return any(c["available"] for c in cams)


async def closed_days_in_month(pool: asyncpg.Pool, year: int, month: int) -> list[str]:
    import calendar

    days_in_month = calendar.monthrange(year, month)[1]
    closed: list[str] = []
    for d in range(1, days_in_month + 1):
        date_str = f"{year}-{month:02d}-{d:02d}"
        if await is_date_closed(pool, date_str):
            closed.append(date_str)
    return closed
