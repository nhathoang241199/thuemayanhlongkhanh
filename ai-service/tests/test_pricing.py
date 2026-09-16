from app.domain.pricing import (
    multi_day_rental_multiplier,
    rental_amount_vnd,
    resolve_effective_discount_percent,
)
from app.domain.formatters import camera_with_effective_discount, compute_camera_rental_total
from app.graph.nodes.agent import _history_for_llm, _redact_price_amounts


def test_multi_day_multiplier():
    assert multi_day_rental_multiplier(1) == 1
    assert multi_day_rental_multiplier(2) == 1.75
    assert multi_day_rental_multiplier(3) == 2.4


def test_rental_amount_vnd():
    assert rental_amount_vnd(1, 400_000, 220_000, "FULL_DAY") == 400_000
    assert rental_amount_vnd(2, 400_000, 220_000, "FULL_DAY") == 700_000
    assert rental_amount_vnd(1, 400_000, 220_000, "MORNING") == 220_000


def test_resolve_effective_discount_shop_promo_overrides():
    promo = {"discount_percent": 20, "start_date": None, "end_date": None}
    assert resolve_effective_discount_percent(5, promo, "2026-09-16", "2026-09-16") == 20
    assert resolve_effective_discount_percent(5, None, "2026-09-16", "2026-09-16") == 5


def test_camera_with_effective_discount_applies_promo():
    cam = {
        "id": "1",
        "name": "xt3",
        "brand": "FUJIFILM",
        "day_price": 500_000,
        "shift_price": 250_000,
        "discount_percent": 0,
    }
    promo = {"discount_percent": 10, "start_date": None, "end_date": None}
    enriched = camera_with_effective_discount(cam, promo, 1)
    assert enriched["discount_percent"] == 10
    assert compute_camera_rental_total(enriched, 1) == 450_000


def test_redact_price_amounts_from_history():
    assert "[giá cũ" in _redact_price_amounts("XT3 1 ngày 450k nhé ạ.")
    history = [
        {"role": "user", "content": "giá xt3"},
        {"role": "assistant", "content": "XT3 1 ngày 450k nhé ạ."},
    ]
    redacted = _history_for_llm(history, "giá xt3 1 ngày lại đi")
    assert "450k" not in redacted[1]["content"]
    assert "[giá cũ" in redacted[1]["content"]
