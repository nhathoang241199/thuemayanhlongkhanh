from app.domain.pricing import multi_day_rental_multiplier, rental_amount_vnd


def test_multi_day_multiplier():
    assert multi_day_rental_multiplier(1) == 1
    assert multi_day_rental_multiplier(2) == 1.75
    assert multi_day_rental_multiplier(3) == 2.4


def test_rental_amount_vnd():
    assert rental_amount_vnd(1, 400_000, 220_000, "FULL_DAY") == 400_000
    assert rental_amount_vnd(2, 400_000, 220_000, "FULL_DAY") == 700_000
    assert rental_amount_vnd(1, 400_000, 220_000, "MORNING") == 220_000
