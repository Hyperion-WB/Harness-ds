#!/usr/bin/env python3
"""Generate a cute DeepSeek Whale icon without any white borders or clipping artifacts."""

import math
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICONS_DIR = ROOT / "src-tauri" / "icons"

def create_cute_whale_icon(size: int = 1024) -> Image.Image:
    # High-resolution supersampling canvas
    scale = 2
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Outer rounded container with margins to prevent any desktop edge clipping
    pad = int(canvas_size * 0.06)
    box = [pad, pad, canvas_size - pad, canvas_size - pad]
    radius = int(canvas_size * 0.22)

    # Gradient background: Deep Obsidian to vibrant DeepSeek Blue (#070b19 to #0284c7)
    # We create a gradient mask
    bg = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    
    for y in range(pad, canvas_size - pad):
        factor = (y - pad) / (canvas_size - 2 * pad)
        # Deep navy/obsidian #0a0f1d to rich DeepSeek blue #1e40af
        r = int(10 + factor * 20)
        g = int(18 + factor * 50)
        b = int(38 + factor * 140)
        bg_draw.line([(pad, y), (canvas_size - pad, y)], fill=(r, g, b, 255))

    # Mask for rounded container
    mask = Image.new("L", (canvas_size, canvas_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(box, radius=radius, fill=255)

    # Inner subtle border highlight
    container = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    container.paste(bg, (0, 0), mask)

    # Draw sleek specular inner ring
    c_draw = ImageDraw.Draw(container)
    c_draw.rounded_rectangle(box, radius=radius, outline=(255, 255, 255, 36), width=int(scale * 3))

    # 2. Draw Cute DeepSeek Whale Character
    cx = canvas_size // 2
    cy = int(canvas_size * 0.53)

    # Whale Body (Cute, Chubby, Rounded Silhouette)
    whale = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    w_draw = ImageDraw.Draw(whale)

    # Whale Main Body
    wb_x0 = int(canvas_size * 0.20)
    wb_y0 = int(canvas_size * 0.32)
    wb_x1 = int(canvas_size * 0.80)
    wb_y1 = int(canvas_size * 0.72)
    
    # Body Ellipse
    w_draw.ellipse([wb_x0, wb_y0, wb_x1, wb_y1], fill=(255, 255, 255, 255))
    
    # Whale Head Roundness (Left side)
    head_box = [int(canvas_size * 0.16), int(canvas_size * 0.36), int(canvas_size * 0.50), int(canvas_size * 0.70)]
    w_draw.ellipse(head_box, fill=(255, 255, 255, 255))

    # Whale Tail (Cute curved upward fluke on right)
    tail_pts = [
        (int(canvas_size * 0.72), int(canvas_size * 0.52)),
        (int(canvas_size * 0.86), int(canvas_size * 0.38)),
        (int(canvas_size * 0.88), int(canvas_size * 0.28)),
        (int(canvas_size * 0.82), int(canvas_size * 0.32)),
        (int(canvas_size * 0.80), int(canvas_size * 0.40)),
        (int(canvas_size * 0.76), int(canvas_size * 0.34)),
        (int(canvas_size * 0.70), int(canvas_size * 0.30)),
        (int(canvas_size * 0.74), int(canvas_size * 0.44)),
        (int(canvas_size * 0.68), int(canvas_size * 0.58)),
    ]
    w_draw.polygon(tail_pts, fill=(255, 255, 255, 255))

    # Whale Belly (Light soft cyan tint #e0f2fe)
    belly_box = [int(canvas_size * 0.24), int(canvas_size * 0.50), int(canvas_size * 0.68), int(canvas_size * 0.72)]
    w_draw.ellipse(belly_box, fill=(224, 242, 254, 255))

    # Whale Flipper / Fin (Cute little flipper)
    fin_pts = [
        (int(canvas_size * 0.42), int(canvas_size * 0.54)),
        (int(canvas_size * 0.52), int(canvas_size * 0.66)),
        (int(canvas_size * 0.44), int(canvas_size * 0.68)),
        (int(canvas_size * 0.36), int(canvas_size * 0.58)),
    ]
    w_draw.polygon(fin_pts, fill=(200, 230, 255, 255))

    # Cute Big Shiny Eye (Happy sparkling anime style eye)
    eye_cx = int(canvas_size * 0.33)
    eye_cy = int(canvas_size * 0.45)
    eye_r = int(canvas_size * 0.048)
    
    # Outer dark eye
    w_draw.ellipse([eye_cx - eye_r, eye_cy - eye_r, eye_cx + eye_r, eye_cy + eye_r], fill=(15, 23, 42, 255))
    
    # Big sparkling highlight (top right)
    hl1_cx = eye_cx - int(eye_r * 0.3)
    hl1_cy = eye_cy - int(eye_r * 0.3)
    hl1_r = int(eye_r * 0.45)
    w_draw.ellipse([hl1_cx - hl1_r, hl1_cy - hl1_r, hl1_cx + hl1_r, hl1_cy + hl1_r], fill=(255, 255, 255, 255))
    
    # Little secondary twinkle highlight (bottom left)
    hl2_cx = eye_cx + int(eye_r * 0.35)
    hl2_cy = eye_cy + int(eye_r * 0.35)
    hl2_r = int(eye_r * 0.22)
    w_draw.ellipse([hl2_cx - hl2_r, hl2_cy - hl2_r, hl2_cx + hl2_r, hl2_cy + hl2_r], fill=(255, 255, 255, 255))

    # Cute Little Smile Mouth
    mouth_box = [int(canvas_size * 0.20), int(canvas_size * 0.48), int(canvas_size * 0.28), int(canvas_size * 0.56)]
    w_draw.arc(mouth_box, start=10, end=150, fill=(15, 23, 42, 255), width=int(scale * 3.5))

    # Cute Blush Cheeks (Rosy soft pink/cyan glow)
    blush_box = [int(canvas_size * 0.24), int(canvas_size * 0.50), int(canvas_size * 0.32), int(canvas_size * 0.56)]
    w_draw.ellipse(blush_box, fill=(244, 114, 182, 140))

    # Water Spout / Magical Sparkles on top of whale
    spout_cx = int(canvas_size * 0.42)
    spout_cy = int(canvas_size * 0.26)
    
    # Center water droplet
    w_draw.ellipse([spout_cx - int(scale * 10), spout_cy - int(scale * 18), spout_cx + int(scale * 10), spout_cy], fill=(56, 189, 248, 240))
    # Left water drop
    w_draw.ellipse([spout_cx - int(scale * 28), spout_cy - int(scale * 10), spout_cx - int(scale * 14), spout_cy + int(scale * 2)], fill=(125, 211, 252, 220))
    # Right water drop
    w_draw.ellipse([spout_cx + int(scale * 14), spout_cy - int(scale * 12), spout_cx + int(scale * 28), spout_cy], fill=(125, 211, 252, 220))

    # Composite whale into container
    container.alpha_composite(whale)

    # Downsample with high-fidelity Lanczos to requested output size
    final_img = container.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    icon_512 = create_cute_whale_icon(512)
    
    # Save master 512x512 icon
    icon_512.save(ICONS_DIR / "icon.png", format="PNG")
    print("Generated cute master icon.png with 100% transparent corners!")

    # Multi-size PNG icons for Tauri / Windows / Mac
    sizes = {
        "32x32.png": (32, 32),
        "64x64.png": (64, 64),
        "128x128.png": (128, 128),
        "128x128@2x.png": (256, 256),
        "Square30x30Logo.png": (30, 30),
        "Square44x44Logo.png": (44, 44),
        "Square71x71Logo.png": (71, 71),
        "Square89x89Logo.png": (89, 89),
        "Square107x107Logo.png": (107, 107),
        "Square142x142Logo.png": (142, 142),
        "Square150x150Logo.png": (150, 150),
        "Square284x284Logo.png": (284, 284),
        "Square310x310Logo.png": (310, 310),
        "StoreLogo.png": (50, 50),
    }

    for filename, (sw, sh) in sizes.items():
        resized = icon_512.resize((sw, sh), Image.Resampling.LANCZOS)
        resized.save(ICONS_DIR / filename, format="PNG")

    # Generate multi-size icon.ico with true transparency
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    icon_512.save(ICONS_DIR / "icon.ico", format="ICO", sizes=ico_sizes)
    print("Generated multi-resolution icon.ico with transparent alpha background!")

    # Also update public/ web favicon so taskbar / webview use the EXACT same cute whale icon
    public_dir = ROOT / "public"
    if public_dir.is_dir():
        icon_64 = icon_512.resize((64, 64), Image.Resampling.LANCZOS)
        icon_64.save(public_dir / "favicon.png", format="PNG")
        icon_512.save(public_dir / "icon.png", format="PNG")
        print("Updated public/ favicon assets for perfect taskbar/window icon consistency!")

if __name__ == "__main__":
    main()
