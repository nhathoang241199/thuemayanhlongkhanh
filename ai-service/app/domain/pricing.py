"""Booking pricing — port of backend/src/common/booking-schedule.ts"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

BookingSlot = Literal["FULL_DAY", "MORNING", "AFTERNOON", "EVENING"]

OCCUPYING_STATUSES = ("PENDING_PAYMENT", "CONFIRMED", "RENTING")
MAX_BOOKING_RANGE_DAYS = 30
VN_OFFSET = timedelta(hours=7)


def multi_day_rental_multiplier(day_count: int) -> float:
    if day_count == 1:
        return 1
    if day_count == 2:
        return 1.75
    if day_count == 3:
        return 2.4
    if day_count == 4:
        return 3
    if day_count == 5:
        return 3.5
    return 0.65 * day_count


def rental_amount_vnd(
    day_count: int,
    day_price: int,
    shift_price: int,
    slot: BookingSlot = "FULL_DAY",
) -> int:
    if day_count < 1:
        return 0
    if day_count == 1 and slot != "FULL_DAY":
        return shift_price
    return round(day_price * multi_day_rental_multiplier(day_count))


def clamp_discount_percent(discount_percent: int) -> int:
    if not isinstance(discount_percent, (int, float)):
        return 0
    return min(100, max(0, int(discount_percent)))


def discounted_rental_vnd(rental: int, discount_percent: int) -> int:
    pct = clamp_discount_percent(discount_percent)
    if pct <= 0:
        return rental
    return round(rental * (100 - pct) / 100)


def rental_amount_with_options_vnd(
    day_count: int,
    day_price: int,
    shift_price: int,
    slot: BookingSlot = "FULL_DAY",
    return_next_morning: bool = False,
) -> int:
    base = rental_amount_vnd(day_count, day_price, shift_price, slot)
    if not return_next_morning or slot not in ("FULL_DAY", "EVENING"):
        return base
    return base + round(day_price * 0.5)


def to_calendar_day_vn(dt: datetime) -> str:
    vn = dt.astimezone(timezone.utc) + VN_OFFSET
    return vn.strftime("%Y-%m-%d")


def today_calendar_day_vn() -> str:
    return to_calendar_day_vn(datetime.now(timezone.utc))


def add_days_date_str(date_str: str, n: int) -> str:
    y, m, d = map(int, date_str.split("-"))
    dt = datetime(y, m, d) + timedelta(days=n)
    return dt.strftime("%Y-%m-%d")


def each_calendar_day_vn(start_date: str, end_date: str) -> list[str]:
    days: list[str] = []
    cur = start_date
    while cur <= end_date:
        days.append(cur)
        nxt = add_days_date_str(cur, 1)
        if nxt <= cur:
            break
        cur = nxt
    return days


def day_count_inclusive(start_date: str, end_date: str) -> int:
    return len(each_calendar_day_vn(start_date, end_date))


def vn_datetime_to_utc(date_str: str, hour: int, minute: int = 0, second: int = 0) -> datetime:
    y, m, d = map(int, date_str.split("-"))
    local = datetime(y, m, d, hour, minute, second)
    return (local - timedelta(hours=7)).replace(tzinfo=timezone.utc)


def booking_covers_calendar_day_vn(
    start_booking: datetime,
    end_booking: datetime,
    date_str: str,
) -> bool:
    day_start = vn_datetime_to_utc(date_str, 0, 0, 0)
    day_end = vn_datetime_to_utc(date_str, 23, 59, 59)
    return (
        start_booking.timestamp() <= day_end.timestamp()
        and end_booking.timestamp() >= day_start.timestamp()
    )


def shift_units(m: int, a: int, e: int) -> int:
    return max(m, a, e)


def can_add_slot(
    slot: BookingSlot,
    m: int,
    a: int,
    e: int,
    fd: int,
    quantity: int,
) -> bool:
    if slot == "FULL_DAY":
        return fd + 1 + shift_units(m, a, e) <= quantity
    if slot == "MORNING":
        return fd + shift_units(m + 1, a, e) <= quantity
    if slot == "AFTERNOON":
        return fd + shift_units(m, a + 1, e) <= quantity
    if slot == "EVENING":
        return fd + shift_units(m, a, e + 1) <= quantity
    return False


def remaining_for_slot(
    slot: BookingSlot,
    m: int,
    a: int,
    e: int,
    fd: int,
    quantity: int,
) -> int:
    return max(0, quantity - fd - shift_units(m, a, e))


def return_next_morning_date(end_date: str) -> str:
    return add_days_date_str(end_date, 1)


def return_next_morning_occupancy_date(end_booking: datetime) -> str:
    return return_next_morning_date(to_calendar_day_vn(end_booking))
