#!/usr/bin/env python3
"""Generate Markwell Chrome extension icons (Pillow only, no external images)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "icons"
SIZES = (16, 32, 48, 128)

BG = "#1a2332"
TEXT_LINE = "#5c6b7f"
PEN_BODY = "#3d4f63"
PEN_CAP = "#8fa3b8"
HIGHLIGHT = "#ffd34e"
HIGHLIGHT_EDGE = "#e6b800"
UNDERLINE = "#ffd34e"


def _hex(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[i : i + 2], 16) for i in (0, 2, 4))


def _scale(size: int, value: float) -> int:
    return max(1, round(size * value))


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    corner = _scale(size, 0.2)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=corner, fill=_hex(BG))

    pad_x = _scale(size, 0.18)
    pad_y = _scale(size, 0.22)
    inner_w = size - pad_x * 2
    line_h = max(1, _scale(size, 0.07))
    gap = max(1, _scale(size, 0.09))
    x0 = pad_x
    x1 = pad_x + inner_w

    # Three text lines (geometry only)
    y_lines = [pad_y + i * (line_h + gap) for i in range(3)]
    for y in y_lines:
        draw.rounded_rectangle(
            (x0, y, x1, y + line_h),
            radius=max(1, line_h // 2),
            fill=_hex(TEXT_LINE),
        )

    # Fluorescent highlight band across the middle line
    mid_y = y_lines[1] + line_h // 2
    band_h = max(2, _scale(size, 0.14))
    tilt = _scale(size, 0.04)
    band = [
        (x0 - _scale(size, 0.02), mid_y - band_h // 2 + tilt),
        (x1 + _scale(size, 0.02), mid_y - band_h // 2 - tilt),
        (x1 + _scale(size, 0.02), mid_y + band_h // 2 - tilt),
        (x0 - _scale(size, 0.02), mid_y + band_h // 2 + tilt),
    ]
    draw.polygon(band, fill=_hex(HIGHLIGHT))
    draw.line(
        [(band[0][0], band[0][1]), (band[1][0], band[1][1])],
        fill=_hex(HIGHLIGHT_EDGE),
        width=max(1, _scale(size, 0.02)),
    )

    # Highlighter pen (body + cap) to the right of center
    if size >= 24:
        pen_cx = _scale(size, 0.72)
        pen_cy = _scale(size, 0.62)
        body_len = _scale(size, 0.28)
        body_w = max(2, _scale(size, 0.09))
        angle_dx = _scale(size, 0.12)
        angle_dy = _scale(size, 0.18)

        body = [
            (pen_cx - body_w, pen_cy - body_len // 2),
            (pen_cx + body_w, pen_cy - body_len // 2 + angle_dy),
            (pen_cx + body_w + angle_dx, pen_cy + body_len // 2 + angle_dy),
            (pen_cx - body_w + angle_dx, pen_cy + body_len // 2),
        ]
        draw.polygon(body, fill=_hex(PEN_BODY))

        cap_h = max(2, _scale(size, 0.08))
        cap = [
            (body[0][0], body[0][1] - cap_h),
            (body[1][0], body[1][1] - cap_h),
            (body[1][0], body[1][1]),
            (body[0][0], body[0][1]),
        ]
        draw.polygon(cap, fill=_hex(PEN_CAP))

        nib = [
            (body[2][0], body[2][1]),
            (body[3][0], body[3][1]),
            (body[3][0] + _scale(size, 0.06), body[3][1] + _scale(size, 0.05)),
            (body[2][0] + _scale(size, 0.05), body[2][1] + _scale(size, 0.04)),
        ]
        draw.polygon(nib, fill=_hex(HIGHLIGHT))
    elif size >= 16:
        # Minimal pen mark at 16px
        px = _scale(size, 0.7)
        py = _scale(size, 0.55)
        draw.rectangle(
            (px, py, px + _scale(size, 0.12), py + _scale(size, 0.22)),
            fill=_hex(PEN_BODY),
        )
        draw.rectangle(
            (px, py - 1, px + _scale(size, 0.12), py + 1),
            fill=_hex(PEN_CAP),
        )

    # Underline emphasizing the bottom line
    ul_y = y_lines[2] + line_h + max(1, _scale(size, 0.03))
    ul_w = max(2, int(inner_w * 0.85))
    ul_x0 = x0 + (inner_w - ul_w) // 2
    draw.rounded_rectangle(
        (ul_x0, ul_y, ul_x0 + ul_w, ul_y + max(1, _scale(size, 0.05))),
        radius=max(1, _scale(size, 0.02)),
        fill=_hex(UNDERLINE),
    )

    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = OUT_DIR / f"icon-{size}.png"
        draw_icon(size).save(path, format="PNG", optimize=True)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
