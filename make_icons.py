#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成 小王的工作台 PWA 图标：薰衣草紫渐变 + 太阳 + 王"""
from PIL import Image, ImageDraw, ImageFont
import math, os

OUT = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(OUT, exist_ok=True)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

C1 = (139, 111, 216)   # #8B6FD8 薰衣草紫
C2 = (108, 79, 196)    # #6C4FC4 深紫
SUN = (255, 241, 214)  # 暖阳色
SUN_EDGE = (255, 214, 130)

def find_font(size):
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc",      # 微软雅黑粗体
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def draw_icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 圆角矩形背景（渐变）
    r = size * 0.22
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    grad = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / size
        col = lerp(C1, C2, t)
        gd.line([(0, y), (size, y)], fill=col + (255,))
    img = Image.composite(grad, img, mask)

    # 安全区（maskable 需要收缩内容）
    safe = size * (0.24 if maskable else 0.10)

    # 太阳：中心圆形 + 光线
    cx, cy = size * 0.5, size * 0.46
    sr = size * 0.20
    # 光线
    for i in range(12):
        ang = math.pi * 2 * i / 12
        x1 = cx + math.cos(ang) * sr * 1.15
        y1 = cy + math.sin(ang) * sr * 1.15
        x2 = cx + math.cos(ang) * sr * 1.55
        y2 = cy + math.sin(ang) * sr * 1.55
        d.line([(x1, y1), (x2, y2)], fill=SUN_EDGE + (255,), width=max(3, int(size * 0.035)))
    # 圆形
    d.ellipse([cx - sr, cy - sr, cx + sr, cy + sr], fill=SUN + (255,))

    # 字母 S（白色，带柔和阴影感）
    font = find_font(int(size * 0.26))
    letter = "王"
    bb = d.textbbox((0, 0), letter, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    tx, ty = cx - tw / 2 - bb[0], cy - th / 2 - bb[1]
    # 阴影
    d.text((tx, ty + size * 0.012), letter, font=font, fill=(108, 79, 196, 90))
    d.text((tx, ty), letter, font=font, fill=(255, 255, 255, 255))

    # 底部小字「工作台」（可选装饰）
    font2 = find_font(int(size * 0.075))
    txt = "工作台"
    bb2 = d.textbbox((0, 0), txt, font=font2)
    tx2 = (size - (bb2[2] - bb2[0])) / 2 - bb2[0]
    ty2 = size * 0.80 - bb2[1]
    d.text((tx2, ty2), txt, font=font2, fill=(255, 255, 255, 235))

    return img

for s in (192, 512):
    draw_icon(s, maskable=False).save(os.path.join(OUT, f"icon-{s}.png"))
    draw_icon(s, maskable=True).save(os.path.join(OUT, f"icon-maskable-{s}.png"))
    print("saved", s)

# iOS apple-touch-icon 180
draw_icon(180, maskable=False).save(os.path.join(OUT, "apple-touch-icon.png"))
print("saved apple-touch-icon")
