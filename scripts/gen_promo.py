#!/usr/bin/env python3
"""Generate Chrome Web Store promo tiles (Pillow only, no external images)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "store"

BG = "#1a2332"
BG_LIGHT = "#243044"
ACCENT = "#ffd34e"
ACCENT_DARK = "#c9a227"
TEXT = "#e8e8e8"
MUTED = "#9aa8bc"


def _hex(color: str) -> tuple[int, int, int]:
    c = color.lstrip("#")
    return tuple(int(c[i : i + 2], 16) for i in (0, 2, 4))


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates: list[tuple[str, int]] = [
        ("/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", 0 if bold else 1),
        ("/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc", 0),
        ("/System/Library/Fonts/Hiragino Sans GB.ttc", 0),
        ("/Library/Fonts/Arial Unicode.ttf", 0),
        ("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", 0),
        ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 0),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 0),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 0),
    ]
    for path, index in candidates:
        if Path(path).is_file():
            try:
                return ImageFont.truetype(path, size, index=index)
            except OSError:
                continue
    return ImageFont.load_default()


def _draw_mark_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float) -> None:
    s = scale
    r = int(18 * s)
    draw.rounded_rectangle(
        (cx - r, cy - r, cx + r, cy + r),
        radius=int(8 * s),
        fill=_hex(BG_LIGHT),
        outline=_hex(ACCENT_DARK),
        width=max(1, int(2 * s)),
    )
    lw = int(36 * s)
    lh = max(2, int(5 * s))
    gap = max(2, int(6 * s))
    x0 = cx - lw // 2
    y0 = cy - int(14 * s)
    for i in range(3):
        y = y0 + i * (lh + gap)
        draw.rounded_rectangle((x0, y, x0 + lw - i * int(6 * s), y + lh), radius=2, fill=_hex(MUTED))
    mid = y0 + lh + gap + lh // 2
    band = [
        (x0 - 2, mid - int(8 * s)),
        (x0 + lw - 4, mid - int(10 * s)),
        (x0 + lw - 2, mid + int(8 * s)),
        (x0, mid + int(10 * s)),
    ]
    draw.polygon(band, fill=_hex(ACCENT))


def _gradient(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), _hex(BG))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(_hex(BG)[0] * (1 - t) + _hex(BG_LIGHT)[0] * t * 0.6)
        g = int(_hex(BG)[1] * (1 - t) + _hex(BG_LIGHT)[1] * t * 0.6)
        b = int(_hex(BG)[2] * (1 - t) + _hex(BG_LIGHT)[2] * t * 0.6)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    accent = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ad = ImageDraw.Draw(accent)
    ad.polygon([(w, 0), (w, int(h * 0.45)), (int(w * 0.55), 0)], fill=(255, 211, 78, 28))
    img.paste(accent, (0, 0), accent)
    return img


def promo_small() -> Image.Image:
    w, h = 440, 280
    img = _gradient(w, h)
    draw = ImageDraw.Draw(img)
    _draw_mark_icon(draw, 72, h // 2, 1.1)
    draw.text((130, h // 2 - 42), "Markwell", fill=ACCENT, font=_font(36, bold=True))
    draw.text((130, h // 2 + 2), "Web ハイライト & AI 合成", fill=TEXT, font=_font(18))
    draw.text((130, h // 2 + 32), "$5 買い切り", fill=MUTED, font=_font(15))
    draw.rounded_rectangle((24, h - 36, w - 24, h - 16), radius=6, fill=_hex(ACCENT))
    draw.text((36, h - 33), "蛍光ペン → 論考", fill="#1a1a1a", font=_font(13, bold=True))
    return img


def promo_marquee() -> Image.Image:
    w, h = 1400, 560
    img = _gradient(w, h)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((48, 48, w - 48, h - 48), radius=20, outline=_hex(ACCENT_DARK), width=2)
    _draw_mark_icon(draw, 160, h // 2, 2.2)
    draw.text((260, h // 2 - 72), "Markwell", fill=ACCENT, font=_font(72, bold=True))
    draw.text((260, h // 2 + 8), "Web のテキストをハイライトし、AI が論考にまとめる", fill=TEXT, font=_font(32))
    draw.text((260, h // 2 + 56), "Chrome 拡張 · ローカル保存 · BYO Gemini API · $5 買い切り Premium", fill=MUTED, font=_font(22))
    # Decorative highlight stripe
    stripe_y = h - 120
    draw.rounded_rectangle((260, stripe_y, w - 100, stripe_y + 28), radius=6, fill=_hex(ACCENT))
    draw.rounded_rectangle((280, stripe_y + 40, w - 200, stripe_y + 52), radius=4, fill=_hex(MUTED))
    draw.rounded_rectangle((280, stripe_y + 62, w - 140, stripe_y + 74), radius=4, fill=_hex(MUTED))
    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tiles = [
        ("promo-small-440x280.png", promo_small),
        ("promo-marquee-1400x560.png", promo_marquee),
    ]
    for name, fn in tiles:
        path = OUT_DIR / name
        fn().save(path, "PNG", optimize=True)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
