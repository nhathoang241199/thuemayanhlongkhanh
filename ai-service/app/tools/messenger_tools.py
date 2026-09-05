"""LangChain tools wrapping DB repositories."""

from __future__ import annotations

import asyncpg
from langchain_core.tools import tool

from app.db.repositories import availability as avail_repo
from app.db.repositories import cameras as cam_repo
from app.domain.formatters import format_camera_list, format_lens_list, parse_slot


def build_tools(pool: asyncpg.Pool):
    @tool
    async def list_cameras(brand: str = "") -> str:
        """Danh sách máy + id. Không dùng để báo giá khách — giá xem trên web đặt lịch."""
        rows = await cam_repo.list_public_cameras(pool, brand or None)
        return format_camera_list(rows)

    @tool
    async def get_camera(cameraId: str) -> str:
        """Chi tiết một máy theo id."""
        cam = await cam_repo.get_camera(pool, cameraId)
        if not cam:
            return f"Không tìm thấy máy id={cameraId}"
        return format_camera_list([cam])

    @tool
    async def list_lenses(cameraId: str) -> str:
        """Lens tương thích với một máy (cần cameraId)."""
        lenses = await cam_repo.list_lenses_for_camera(pool, cameraId)
        return format_lens_list(lenses)

    @tool
    async def get_booking_terms() -> str:
        """Toàn bộ điều khoản đặt lịch (cọc, giao nhận, đền bù, thời gian thuê…)."""
        return await cam_repo.get_booking_terms(pool)

    @tool
    async def check_availability(
        cameraId: str,
        startDate: str,
        endDate: str,
        slot: str = "FULL_DAY",
    ) -> str:
        """Kiểm tra máy còn trống trong khoảng ngày + buổi."""
        parsed_slot = parse_slot(slot)
        ok, days = await avail_repo.is_range_available(
            pool, cameraId, startDate, endDate, parsed_slot
        )
        status = "CÒN TRỐNG" if ok else "KHÔNG CÒN TRỐNG"
        detail = ", ".join(f"{d['date']}: {'ok' if d['available'] else 'full'}" for d in days)
        return f"{status}. Chi tiết từng ngày: {detail}"

    @tool
    async def list_available_cameras(
        startDate: str,
        endDate: str,
        slot: str = "FULL_DAY",
        brand: str = "",
    ) -> str:
        """Máy còn trống theo khoảng ngày + buổi."""
        parsed_slot = parse_slot(slot)
        rows = await avail_repo.cameras_for_slot(
            pool, brand or None, startDate, endDate, parsed_slot
        )
        return format_camera_list(rows)

    @tool
    async def closed_days(year: int, month: int) -> str:
        """Ngày shop nghỉ trong một tháng."""
        dates = await avail_repo.closed_days_in_month(pool, year, month)
        if not dates:
            return "Shop không nghỉ ngày nào trong tháng này."
        return ", ".join(dates)

    return [
        list_cameras,
        get_camera,
        list_lenses,
        get_booking_terms,
        check_availability,
        list_available_cameras,
        closed_days,
    ]
