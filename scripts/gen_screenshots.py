#!/usr/bin/env python3
"""Generate Chrome Web Store screenshots (Pillow only, no external images)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "store"
W, H = 1280, 800

BG_TOP = "#121820"
BG_BOTTOM = "#1a2332"
ACCENT = "#ffd34e"
ACCENT_DIM = "#c9a227"
PANEL_BG = "#1a1a1a"
PANEL_BORDER = "#333333"
PAGE_BG = "#f4f1ea"
PAGE_TEXT = "#2c2c2c"
PAGE_MUTED = "#8a8478"
TOOLBAR = "#2e3440"
TOOLBAR_BAR = "#4a5568"
HIGHLIGHT_YELLOW = (255, 211, 78, 140)
HIGHLIGHT_GREEN = (125, 216, 125, 120)
HIGHLIGHT_PINK = (255, 138, 194, 110)


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


def _gradient_bg() -> Image.Image:
    img = Image.new("RGB", (W, H), _hex(BG_TOP))
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / max(H - 1, 1)
        r = int(_hex(BG_TOP)[0] * (1 - t) + _hex(BG_BOTTOM)[0] * t)
        g = int(_hex(BG_TOP)[1] * (1 - t) + _hex(BG_BOTTOM)[1] * t)
        b = int(_hex(BG_TOP)[2] * (1 - t) + _hex(BG_BOTTOM)[2] * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    return img


def _draw_catch(draw: ImageDraw.ImageDraw, lines: list[str], y: int) -> None:
    title_f = _font(44, bold=True)
    sub_f = _font(28)
    for i, line in enumerate(lines):
        f = title_f if i == 0 else sub_f
        fill = ACCENT if i == 0 else "#e8e8e8"
        bbox = draw.textbbox((0, 0), line, font=f)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, y), line, fill=fill, font=f)
        y += (bbox[3] - bbox[1]) + (12 if i == 0 else 8)


def _browser_chrome(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    *,
    side_panel_w: int = 0,
) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=14, fill=_hex(PANEL_BG), outline=_hex(PANEL_BORDER), width=2)
    tb_h = 44
    draw.rectangle((x0 + 1, y0 + 1, x1 - 1, y0 + tb_h), fill=_hex(TOOLBAR))
    # Window controls (circles, not Chrome branding)
    for i, col in enumerate(["#e85d5d", "#e6c04e", "#7dd87d"]):
        cx = x0 + 22 + i * 22
        cy = y0 + tb_h // 2
        draw.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=col)
    bar_x0 = x0 + 100
    bar_x1 = x1 - 24 - (side_panel_w if side_panel_w else 0)
    draw.rounded_rectangle(
        (bar_x0, y0 + 10, bar_x1, y0 + tb_h - 10),
        radius=8,
        fill=_hex(TOOLBAR_BAR),
    )
    content = (x0 + 8, y0 + tb_h + 4, x1 - 8 - side_panel_w, y1 - 8)
    return content


def screenshot_1() -> Image.Image:
    img = _gradient_bg()
    draw = ImageDraw.Draw(img)
    frame = (80, 100, W - 80, H - 140)
    content = _browser_chrome(draw, frame)
    x0, y0, x1, y1 = content
    draw.rectangle(content, fill=_hex(PAGE_BG))
    mx, my = x0 + 48, y0 + 36
    width = x1 - x0 - 96
    y = my
    draw.rounded_rectangle((mx, y, mx + 480, y + 26), radius=6, fill=_hex(PAGE_TEXT))
    y += 48
    for w in (width, width - 60):
        draw.rounded_rectangle((mx, y, mx + w, y + 10), radius=4, fill=_hex(PAGE_MUTED))
        y += 22
    para_y = y + 8
    line_h, gap = 13, 9
    for i in range(5):
        ly = para_y + i * (line_h + gap)
        draw.rounded_rectangle((mx, ly, mx + width - i * 35, ly + line_h), radius=4, fill=_hex(PAGE_MUTED))
    overlay = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle(
        (mx - x0 - 6, para_y + line_h + gap - 4, mx - x0 + width - 100, para_y + 2 * (line_h + gap) + line_h + 4),
        radius=5,
        fill=HIGHLIGHT_YELLOW,
    )
    od.rounded_rectangle(
        (mx - x0 + 40, para_y + 3 * (line_h + gap) - 2, mx - x0 + width - 30, para_y + 4 * (line_h + gap) + line_h),
        radius=5,
        fill=HIGHLIGHT_PINK,
    )
    img.paste(overlay, (x0, y0), overlay)
    draw = ImageDraw.Draw(img)
    # Mini toolbar mock
    tb_x, tb_y = mx + 120, para_y + line_h + gap - 28
    draw.rounded_rectangle((tb_x, tb_y, tb_x + 168, tb_y + 34), radius=10, fill=_hex(PANEL_BG), outline=_hex(PANEL_BORDER))
    for i, c in enumerate([ACCENT, "#7dd87d", "#ff8ac2", "#7eb6ff"]):
        draw.ellipse((tb_x + 12 + i * 22, tb_y + 10, tb_x + 26 + i * 22, tb_y + 24), fill=c)
    draw.rounded_rectangle((tb_x + 100, tb_y + 8, tb_x + 156, tb_y + 26), radius=6, fill=_hex("#3a3a3a"))
    _draw_catch(draw, ["Web のあらゆるテキストを蛍光ペンで", "Markwell"], 24)
    return img


def _side_panel(draw: ImageDraw.ImageDraw, x0: int, y0: int, x1: int, y1: int) -> None:
    draw.rectangle((x0, y0, x1, y1), fill=_hex(PANEL_BG))
    draw.line([(x0, y0), (x0, y1)], fill=_hex(PANEL_BORDER), width=2)
    pad = 20
    draw.text((x0 + pad, y0 + 16), "合成", fill=ACCENT, font=_font(22, bold=True))
    draw.rounded_rectangle(
        (x0 + pad, y0 + 52, x1 - pad, y0 + 120),
        radius=8,
        outline=_hex(PANEL_BORDER),
        fill=_hex("#242424"),
    )
    draw.text(
        (x0 + pad + 10, y0 + 68),
        "ハイライトを論考としてまとめる…",
        fill="#888",
        font=_font(14),
    )
    draw.rounded_rectangle(
        (x0 + pad, y0 + 132, x0 + pad + 120, y0 + 164),
        radius=8,
        fill=_hex(ACCENT),
    )
    draw.text((x0 + pad + 18, y0 + 140), "合成する", fill="#1a1a1a", font=_font(15, bold=True))
    ey = y0 + 190
    draw.text((x0 + pad, ey), "合成結果", fill="#ccc", font=_font(16, bold=True))
    ey += 36
    for i in range(8):
        w = (x1 - x0) - pad * 2 - (i % 3) * 30
        draw.rounded_rectangle((x0 + pad, ey, x0 + pad + w, ey + 10), radius=4, fill="#555" if i % 4 else "#666")
        ey += 18
    # Accent markdown heading line
    draw.rounded_rectangle((x0 + pad, y0 + 230, x0 + pad + 200, y0 + 248), radius=4, fill=ACCENT)
    ey = y0 + 260
    for i in range(10):
        w = (x1 - x0) - pad * 2 - (i % 4) * 25
        draw.rounded_rectangle((x0 + pad, ey, x0 + pad + w, ey + 9), radius=3, fill="#777")
        ey += 16


def screenshot_2() -> Image.Image:
    img = _gradient_bg()
    draw = ImageDraw.Draw(img)
    panel_w = 360
    frame = (60, 90, W - 60, H - 130)
    content = _browser_chrome(draw, frame, side_panel_w=panel_w)
    x0, y0, x1, y1 = content
    page_x1 = x1
    draw.rectangle((x0, y0, page_x1, y1), fill=_hex(PAGE_BG))
    mx = x0 + 32
    width = int((page_x1 - x0) * 0.85)
    y = y0 + 28
    draw.rounded_rectangle((mx, y, mx + 300, y + 20), radius=5, fill=_hex(PAGE_TEXT))
    y += 40
    for _ in range(6):
        draw.rounded_rectangle((mx, y, mx + width, y + 9), radius=3, fill=_hex(PAGE_MUTED))
        y += 16
    sp_x0 = x1
    sp_x1 = frame[2] - 8
    _side_panel(draw, sp_x0, y0, sp_x1, y1)
    _draw_catch(draw, ["AI があなたのハイライトを論考に変える", "Markwell — 合成サイドパネル"], 20)
    return img


def screenshot_3() -> Image.Image:
    img = _gradient_bg()
    draw = ImageDraw.Draw(img)
    card = (W // 2 - 340, 120, W // 2 + 340, H - 100)
    draw.rounded_rectangle(card, radius=16, fill=_hex(PANEL_BG), outline=_hex(ACCENT_DIM), width=2)
    cx0, cy0, cx1, cy1 = card
    draw.text((cx0 + 32, cy0 + 28), "Premium", fill=ACCENT, font=_font(40, bold=True))
    draw.rounded_rectangle(
        (cx1 - 200, cy0 + 24, cx1 - 32, cy0 + 72),
        radius=10,
        fill=_hex(ACCENT),
    )
    draw.text((cx1 - 188, cy0 + 34), "$5 USD", fill="#1a1a1a", font=_font(22, bold=True))
    features = [
        ("合成・Q&A・引用抽出", "無制限"),
        ("Markdown / Obsidian / Roam エクスポート", "Premium"),
        ("ファクトチェック・言い換え", "Premium"),
        ("ページ要約・関連ハイライト", "Premium"),
        ("ハイライト上限", "緩和"),
        ("7 日間トライアル", "無料"),
    ]
    fy = cy0 + 100
    for label, badge in features:
        draw.ellipse((cx0 + 36, fy + 4, cx0 + 48, fy + 16), fill=ACCENT)
        draw.text((cx0 + 56, fy), label, fill="#e0e0e0", font=_font(20))
        bb = draw.textbbox((0, 0), badge, font=_font(14, bold=True))
        bw = bb[2] - bb[0]
        draw.rounded_rectangle(
            (cx1 - 48 - bw, fy - 2, cx1 - 40, fy + 22),
            radius=6,
            fill="#3a3a3a",
        )
        draw.text((cx1 - 44 - bw, fy), badge, fill=ACCENT, font=_font(14, bold=True))
        fy += 44
    draw.line([(cx0 + 32, fy + 8), (cx1 - 32, fy + 8)], fill=_hex(PANEL_BORDER), width=1)
    draw.text(
        (cx0 + 32, fy + 24),
        "買い切り · サブスクリプションなし",
        fill="#aaa",
        font=_font(18),
    )
    _draw_catch(draw, ["$5 買い切り、サブスクなし", "一度の購入で Premium 機能を解放"], 28)
    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    shots = [
        ("screenshot-1.png", screenshot_1),
        ("screenshot-2.png", screenshot_2),
        ("screenshot-3.png", screenshot_3),
    ]
    for name, fn in shots:
        path = OUT_DIR / name
        fn().save(path, "PNG", optimize=True)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
