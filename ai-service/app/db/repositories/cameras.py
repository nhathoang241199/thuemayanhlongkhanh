"""Camera / lens / shop repositories."""

from __future__ import annotations

import asyncpg

from app.domain.formatters import parse_brand


def _camera_row(row: asyncpg.Record) -> dict:
    return {
        "id": row["id"],
        "brand": row["brand"],
        "name": row["name"],
        "quantity": row["quantity"],
        "day_price": row["dayPrice"],
        "shift_price": row["shiftPrice"],
        "discount_percent": row["discountPercent"],
        "image_url": row["imageUrl"],
    }


async def list_public_cameras(pool: asyncpg.Pool, brand: str | None = None) -> list[dict]:
    parsed = parse_brand(brand)
    if parsed:
        rows = await pool.fetch(
            '''
            SELECT id, brand, name, quantity, "dayPrice", "shiftPrice", "discountPercent", "imageUrl"
            FROM "Camera"
            WHERE quantity > 0 AND brand = $1::"CameraBrand"
            ORDER BY name ASC
            ''',
            parsed,
        )
    else:
        rows = await pool.fetch(
            '''
            SELECT id, brand, name, quantity, "dayPrice", "shiftPrice", "discountPercent", "imageUrl"
            FROM "Camera"
            WHERE quantity > 0
            ORDER BY name ASC
            '''
        )
    return [_camera_row(r) for r in rows]


async def get_camera(pool: asyncpg.Pool, camera_id: str) -> dict | None:
    row = await pool.fetchrow(
        '''
        SELECT id, brand, name, quantity, "dayPrice", "shiftPrice", "discountPercent", "imageUrl"
        FROM "Camera"
        WHERE id = $1 AND quantity > 0
        ''',
        camera_id,
    )
    return _camera_row(row) if row else None


async def list_lenses_for_camera(pool: asyncpg.Pool, camera_id: str) -> list[dict]:
    rows = await pool.fetch(
        '''
        SELECT l.id, l.name, l."dayPrice", l."shiftPrice", l."discountPercent"
        FROM "Lens" l
        INNER JOIN "CameraLens" cl ON cl."lensId" = l.id
        WHERE cl."cameraId" = $1 AND l.quantity > 0
        ORDER BY l.name ASC
        ''',
        camera_id,
    )
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "day_price": r["dayPrice"],
            "shift_price": r["shiftPrice"],
            "discount_percent": r["discountPercent"],
        }
        for r in rows
    ]


async def get_shop_info(pool: asyncpg.Pool) -> dict:
    row = await pool.fetchrow(
        'SELECT phone, address, "mapUrl" FROM "ShopInfo" WHERE id = $1',
        "singleton",
    )
    if not row:
        return {"phone": "", "address": "", "map_url": ""}
    return {
        "phone": row["phone"] or "",
        "address": row["address"] or "",
        "map_url": row["mapUrl"] or "",
    }


async def get_booking_terms(pool: asyncpg.Pool) -> str:
    row = await pool.fetchrow('SELECT content FROM "BookingTerms" WHERE id = $1', "singleton")
    if not row or not row["content"]:
        return "Chưa có điều khoản — nhờ admin xác nhận."
    return row["content"].strip()
