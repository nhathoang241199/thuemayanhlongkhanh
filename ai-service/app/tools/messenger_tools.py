"""LangChain tools wrapping DB repositories."""

from __future__ import annotations

import asyncpg
from langchain_core.tools import tool

from app.db.repositories import availability as avail_repo
from app.db.repositories import cameras as cam_repo
from app.domain.formatters import (
    compute_camera_rental_total,
    format_camera_list,
    format_lens_list,
    format_price_quote_customer_reply,
    format_shop_promotion_tool_result,
    parse_slot,
)


def build_tools(pool: asyncpg.Pool):
    @tool
    async def list_cameras(brand: str = "") -> str:
        """Danh sách máy công khai + id + giá ngày/buổi. Dùng để khớp model trước khi báo giá hoặc check lịch."""
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
    async def quote_camera_price(
        cameraId: str,
        dayCount: int = 1,
        slot: str = "FULL_DAY",
    ) -> str:
        """Tính giá thuê một máy theo số ngày và buổi (FULL_DAY/MORNING/AFTERNOON/EVENING). Trả về câu báo giá cho khách."""
        cam = await cam_repo.get_camera(pool, cameraId)
        if not cam:
            return f"Không tìm thấy máy id={cameraId}"
        days = max(1, int(dayCount or 1))
        parsed_slot = parse_slot(slot)
        total = compute_camera_rental_total(cam, days, parsed_slot)
        return format_price_quote_customer_reply(cam, days, total)

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
    async def get_shop_promotion() -> str:
        """Chương trình giảm giá toàn shop (%, ngày bắt đầu/kết thúc). Dùng khi khách hỏi khuyến mãi, giảm giá, ưu đãi."""
        promo = await cam_repo.get_shop_promotion(pool)
        return format_shop_promotion_tool_result(promo)

    @tool
    async def check_availability(
        cameraId: str,
        startDate: str,
        endDate: str,
        slot: str = "FULL_DAY",
    ) -> str:
        """Kiểm tra máy còn trống trong khoảng ngày + buổi. startDate/endDate dạng YYYY-MM-DD."""
        parsed_slot = parse_slot(slot)
        ok, days = await avail_repo.is_range_available(
            pool, cameraId, startDate, endDate, parsed_slot
        )
        status = "CÒN TRỐNG" if ok else "KHÔNG CÒN TRỐNG"
        detail = ", ".join(
            f"{d['date']}: {'ok' if d['available'] else 'full'}" for d in days
        )
        return f"{status}. Chi tiết từng ngày: {detail}"

    @tool
    async def list_available_cameras(
        startDate: str,
        endDate: str,
        slot: str = "FULL_DAY",
        brand: str = "",
    ) -> str:
        """Máy còn trống theo khoảng ngày + buổi. startDate/endDate dạng YYYY-MM-DD."""
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
        quote_camera_price,
        list_lenses,
        get_booking_terms,
        get_shop_promotion,
        check_availability,
        list_available_cameras,
        closed_days,
    ]
