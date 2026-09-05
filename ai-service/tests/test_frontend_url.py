from app.domain.formatters import public_book_url, resolve_public_frontend_url


def test_resolve_public_frontend_url_ignores_localhost_context():
    url = resolve_public_frontend_url(
        "http://localhost:3001",
        "https://thuemayanhlongkhanh.com",
    )
    assert url == "https://thuemayanhlongkhanh.com"


def test_resolve_public_frontend_url_keeps_localhost_for_local_dev():
    url = resolve_public_frontend_url(
        "http://localhost:3001",
        "http://localhost:3001",
    )
    assert url == "http://localhost:3001"


def test_public_book_url():
    assert public_book_url("https://thuemayanhlongkhanh.com") == (
        "https://thuemayanhlongkhanh.com/book"
    )
