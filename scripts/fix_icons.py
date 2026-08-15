#!/usr/bin/env python3
"""Generate crisp transparent icons for DeepSeek Harness GUI."""

from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICONS_DIR = ROOT / "src-tauri" / "icons"

def make_transparent_icon(src_path: Path) -> Image.Image:
    # Load base image
    base = Image.open(src_path).convert("RGBA")
    w, h = base.size
    
    # Create high-res rounded mask (using 4x supersampling for ultra-smooth anti-aliased corners)
    scale = 4
    mask_size = (w * scale, h * scale)
    mask = Image.new("L", mask_size, 0)
    draw = ImageDraw.Draw(mask)
    
    # Radius is 25% of size (standard squircle radius)
    radius = int(w * scale * 0.22)
    draw.rounded_rectangle([(0, 0), (w * scale - 1, h * scale - 1)], radius=radius, fill=255)
    
    # Downsample mask with high-quality Lanczos filter
    smooth_mask = mask.resize((w, h), Image.Resampling.LANCZOS)
    
    # Apply mask
    result = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    result.paste(base, (0, 0), smooth_mask)
    return result

def main():
    icon_512 = make_transparent_icon(ICONS_DIR / "icon.png")
    
    # Save master icon.png
    icon_512.save(ICONS_DIR / "icon.png", format="PNG")
    print("Updated icon.png (corner (0,0):", icon_512.getpixel((0,0)), ")")
    
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
    print("Generated icon.ico with transparent corners across all sizes!")

if __name__ == "__main__":
    main()
