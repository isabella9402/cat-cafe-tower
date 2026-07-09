# -*- coding: utf-8 -*-
"""Chroma-key green-screen removal + autocrop + resize for Cat Cafe Tower assets."""
import os
from PIL import Image
import numpy as np

SRC = r"C:\Users\isabe\Downloads\Cat Cafe"
OUT = os.path.join(SRC, "assets")
os.makedirs(OUT, exist_ok=True)

# source filename -> (output key, mode)  mode: 'chroma' | 'bg'
MAP = {
    "Mèo mochi.png":                    ("cat_idle", "chroma"),
    "Mèo Mochi Jumping.png":            ("cat_jump", "chroma"),
    "Mèo Mochi Falling.png":            ("cat_fall", "chroma"),
    "Mèo Mochi Fire Mode.png":          ("cat_fire", "chroma"),
    "Mèo Game Over.png":                ("cat_over", "chroma"),

    "Pancake Vàng Bình Thường.png":     ("pancake", "chroma"),
    "Pancake Cháy Đỏ.jpg":              ("pancake_burnt", "chroma"),
    "Pancake Xanh Mint.jpg":            ("pancake_mint", "chroma"),
    "Pancake với Blueberry Topping.jpg":("pancake_blueberry", "chroma"),
    "Pancake với Chocolate Topping.jpg":("pancake_choco", "chroma"),
    "Pancake với Strawberry Topping.jpg":("pancake_strawberry", "chroma"),

    "Black cat.jpg":                    ("skin_black", "chroma"),
    "Calico.jpg":                       ("skin_calico", "chroma"),
    "Grey tabby.jpg":                   ("skin_grey", "chroma"),
    "Panda cat.jpg":                    ("skin_panda", "chroma"),
    "Strawberry cat.jpg":               ("skin_strawberry", "chroma"),

    "Game Logo.jpg":                    ("ui_logo", "chroma"),
    "E2a Play.jpg":                     ("ui_play", "chroma"),
    "Coin Icon.jpg":                    ("ui_coin", "chroma"),
    "Smoke Puff.jpg":                   ("vfx_smoke", "chroma"),
    "Confetti Celebration.jpg":         ("vfx_confetti", "chroma"),
    "Laser Eye Beam.jpg":               ("vfx_laser", "chroma"),
    "Fire Aura Ring.jpg":               ("vfx_fire_aura", "chroma"),
    "Sparkle Particle Set.jpg":         ("vfx_sparkle", "chroma"),

    "Sáng Sớm Café.jpg":                ("bg_morning", "bg"),
    "Hoàng Hôn.jpg":                    ("bg_sunset", "bg"),
    "Đêm Sao.jpg":                      ("bg_night", "bg"),
    "Bình Minh.jpg":                    ("bg_dawn", "bg"),
}

SPRITE_MAX = 512      # max dimension for sprites
BG_HEIGHT  = 1280     # background target height

def chroma(img):
    img = img.convert("RGB")
    a = np.asarray(img).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = np.maximum(r, b)
    eg = g - mx                      # excess green
    t0, t1 = 40, 100                 # feather thresholds
    alpha = np.clip((t1 - eg) * (255.0 / (t1 - t0)), 0, 255)
    # only treat bright-ish green as screen; low-green stays opaque
    alpha[g < 90] = 255
    alpha = alpha.astype(np.uint8)
    # spill suppression: clamp green toward max(r,b) where it exceeds it
    g2 = np.where(g > mx, mx, g)
    out = np.dstack([r, g2, b, alpha]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")

def autocrop(img, pad=8):
    a = np.asarray(img)
    mask = a[..., 3] > 12
    if not mask.any():
        return img
    ys, xs = np.where(mask)
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(img.width - 1, x1 + pad); y1 = min(img.height - 1, y1 + pad)
    return img.crop((x0, y0, x1 + 1, y1 + 1))

def resize_max(img, m):
    w, h = img.size
    if max(w, h) <= m:
        return img
    s = m / max(w, h)
    return img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)

results = []
for name, (key, mode) in MAP.items():
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        results.append((key, "MISSING " + name))
        continue
    img = Image.open(path)
    if mode == "chroma":
        img = chroma(img)
        img = autocrop(img)
        img = resize_max(img, SPRITE_MAX)
        outp = os.path.join(OUT, key + ".png")
        img.save(outp, optimize=True)
    else:  # bg
        img = img.convert("RGB")
        w, h = img.size
        s = BG_HEIGHT / h
        img = img.resize((round(w * s), BG_HEIGHT), Image.LANCZOS)
        outp = os.path.join(OUT, key + ".jpg")
        img.save(outp, quality=86)
    results.append((key, f"{img.size[0]}x{img.size[1]}  ({mode})"))

for k, v in results:
    print(f"{k:20s} {v}")
print("DONE ->", OUT)
