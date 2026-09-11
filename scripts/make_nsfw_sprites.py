#!/usr/bin/env python3
"""Topless chest overlay. Original clothed PNGs are never overwritten."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "assets"
OUT = SRC / "nsfw"

SKIN_HI = np.array([255.0, 228.0, 220.0], dtype=np.float32)
SKIN_MID = np.array([252.0, 200.0, 192.0], dtype=np.float32)
SKIN_LO = np.array([214.0, 146.0, 142.0], dtype=np.float32)
SKIN_FLUSH = np.array([255.0, 154.0, 156.0], dtype=np.float32)
AREOLA = np.array([220.0, 114.0, 120.0], dtype=np.float32)
NIPPLE = np.array([182.0, 72.0, 86.0], dtype=np.float32)

# Fitted to the sweater's chest mass (1376x768), clear of hanging hair.
BREASTS = (
    (712, 376, 74, 66),
    (798, 394, 90, 78),
)
CHEST_CONNECTOR = (754, 352, 82, 50)


def ellipse_mask(h: int, w: int, cx: float, cy: float, rx: float, ry: float) -> np.ndarray:
    yy, xx = np.ogrid[:h, :w]
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0


def clothing_mask(arr: np.ndarray) -> np.ndarray:
    rgb = arr[..., :3].astype(np.int16)
    a = arr[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = mx - mn
    val = mx
    muted = (a > 140) & (sat < 55) & (val > 58) & (val < 215)
    grayish = (np.abs(r - g) < 48) & (np.abs(g - b) < 48)
    mask = muted & grayish
    img = Image.fromarray(mask.astype(np.uint8) * 255, mode="L")
    img = img.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    return np.array(img) > 128


def keep_original_mask(arr: np.ndarray) -> np.ndarray:
    """Hair, face, pillow, hands — never paint over these."""
    rgb = arr[..., :3].astype(np.int16)
    a = arr[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    h, w = a.shape
    yy, xx = np.ogrid[:h, :w]
    head = ((xx - 365) / 195) ** 2 + ((yy - 228) / 188) ** 2 <= 1.0
    head &= xx < 520
    blonde = (r > 190) & (g > 170) & (b > 148) & (xx < 560) & (yy < 340)
    pillow = (r > 216) & (g > 214) & (b > 204) & (sat < 24) & (yy > 450)
    hands = (xx > 400) & (xx < 575) & (yy > 425) & (yy < 545)
    return head | blonde | pillow | hands | (a < 40)


def chest_weight(arr: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    clothes = clothing_mask(arr)
    keep = keep_original_mask(arr)
    shape = ellipse_mask(h, w, *CHEST_CONNECTOR)
    for cx, cy, rx, ry in BREASTS:
        shape |= ellipse_mask(h, w, cx, cy, rx * 1.12, ry * 1.12)
    yy, xx = np.ogrid[:h, :w]
    raw = clothes & ~keep & shape & (xx > 648)
    img = Image.fromarray(raw.astype(np.uint8) * 255, mode="L")
    img = img.filter(ImageFilter.GaussianBlur(radius=1.8))
    return np.array(img).astype(np.float32) / 255.0


def stamp(rgb, cx, cy, rx, ry, color, strength, light=(-0.4, -0.75), power=1.1, weight=None) -> None:
    h, w = rgb.shape[:2]
    yy, xx = np.ogrid[:h, :w]
    nx = (xx - cx) / max(rx, 1.0)
    ny = (yy - cy) / max(ry, 1.0)
    r2 = nx * nx + ny * ny
    inside = r2 <= 1.0
    if weight is not None:
        inside = inside & (weight > 0.08)
    if not np.any(inside):
        return
    fall = np.clip(1.0 - np.power(np.clip(r2, 0, 1), power), 0.0, 1.0)
    shade = np.clip(0.38 + 0.62 * (light[0] * nx + light[1] * ny), 0.16, 1.08)
    alpha = fall * shade * strength
    if weight is not None:
        alpha = alpha * np.clip(weight, 0, 1)
    alpha = alpha * inside
    rgb += (color[None, None, :] - rgb) * alpha[..., None]


def process_file(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    arr = np.array(im).astype(np.float32)
    weight = chest_weight(np.array(im))

    blurred = np.array(im.filter(ImageFilter.GaussianBlur(radius=8))).astype(np.float32)
    lum = (0.299 * blurred[..., 0] + 0.587 * blurred[..., 1] + 0.114 * blurred[..., 2]) / 255.0
    t = np.clip((lum - 0.32) / 0.46, 0.0, 1.0)
    skin = SKIN_LO[None, None, :] * (1.0 - t)[..., None] + SKIN_HI[None, None, :] * t[..., None]
    arr[..., :3] = arr[..., :3] * (1.0 - weight[..., None]) + skin * weight[..., None]

    # Neckline / pulled-sweater crease along the overlay edge.
    edge = np.clip(weight * (1.0 - weight) * 4.5, 0, 1)
    arr[..., :3] += (np.array([118.0, 88.0, 90.0]) - arr[..., :3]) * (edge * 0.42)[..., None]

    for cx, cy, rx, ry in BREASTS:
        stamp(arr[..., :3], cx, cy, rx, ry, SKIN_MID, 1.0, power=0.9, weight=weight)
        stamp(arr[..., :3], cx + 10, cy + ry * 0.4, rx * 0.88, ry * 0.58, SKIN_LO, 0.82, light=(0.2, 0.95), power=1.2, weight=weight)
        stamp(arr[..., :3], cx - rx * 0.24, cy + 6, rx * 0.5, ry * 0.66, np.array([196, 124, 128], dtype=np.float32), 0.45, light=(0.7, 0.1), power=1.35, weight=weight)
        stamp(arr[..., :3], cx - rx * 0.2, cy - ry * 0.28, rx * 0.42, ry * 0.32, SKIN_HI, 0.8, light=(-0.15, -0.95), power=1.7, weight=weight)
        stamp(arr[..., :3], cx + 4, cy + 8, rx * 0.68, ry * 0.6, SKIN_FLUSH, 0.32, power=1.15, weight=weight)
        ax, ay = cx + 8, cy + ry * 0.18
        stamp(arr[..., :3], ax, ay, 22, 18, AREOLA, 1.0, power=1.25, weight=weight)
        stamp(arr[..., :3], ax + 1, ay + 3, 11, 10, NIPPLE, 1.0, power=1.35, weight=weight)
        stamp(arr[..., :3], ax - 3, ay - 4, 5, 4, SKIN_HI, 0.75, power=2.0, weight=weight)
    stamp(arr[..., :3], 754, 380, 12, 40, np.array([176, 102, 108], dtype=np.float32), 0.5, light=(0.0, 0.25), power=1.2, weight=weight)

    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGBA")
    outline = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(outline)
    for cx, cy, rx, ry in BREASTS:
        od.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=(148, 94, 100, 230), width=3)
        ax, ay = cx + 8, cy + int(ry * 0.18)
        od.ellipse((ax - 13, ay - 11, ax + 13, ay + 11), outline=(172, 86, 96, 220), width=2)
        od.ellipse((ax - 6, ay - 5, ax + 6, ay + 5), fill=(182, 72, 86, 240))
    clip = Image.fromarray((np.clip(weight, 0, 1) * 255).astype(np.uint8), mode="L")
    oa = np.array(outline.split()[-1])
    outline.putalpha(Image.fromarray(np.minimum(oa, np.array(clip)), mode="L"))
    img = Image.alpha_composite(img, outline)
    img.save(dst, optimize=True)
    print(f"[nsfw] wrote {dst.name} chest_px={int((weight > 0.35).sum())}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in ("pet_idle.png", "pet_squint.png", "pet_sleep.png"):
        process_file(SRC / name, OUT / name)
    idle = Image.open(OUT / "pet_idle.png")
    idle.resize((688, 384), Image.Resampling.LANCZOS).save(ROOT / "scratch_nsfw_preview.png")
    idle.resize((190, 106), Image.Resampling.LANCZOS).save(ROOT / "scratch_nsfw_petsize.png")
    print("[nsfw] previews written")


if __name__ == "__main__":
    main()
