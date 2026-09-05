from app.domain.formatters import format_messenger_reply


def test_strip_bold_markdown():
    raw = "- **CANON**: M50, R50\n- **FUJIFILM**: XS10"
    assert format_messenger_reply(raw) == "- CANON: M50, R50\n- FUJIFILM: XS10"


def test_strip_inline_code():
    assert format_messenger_reply("Máy `R50` còn nhé") == "Máy R50 còn nhé"


def test_plain_text_unchanged():
    assert format_messenger_reply("Dạ em còn máy nhé ạ.") == "Dạ em còn máy nhé ạ."
