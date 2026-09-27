"""
icon.py
Generates skin_goddess.ico using only the Python standard library (tkinter).

The icon is a soft rose circle (#FFB0B6) with the initials "SG" in white.
Run this once to produce skin_goddess.ico, then commit the .ico file.

Usage:
    python icon.py
"""

import tkinter as tk
from PIL import Image, ImageDraw, ImageFont
import sys
import os

def make_ico_with_pillow():
    """
    Generate skin_goddess.ico using Pillow if available.
    Produces a proper multi-size .ico (16, 32, 48, 64, 256 px).
    """
    from PIL import Image, ImageDraw

    sizes = [16, 32, 48, 64, 256]
    brand = (255, 176, 182)   # #FFB0B6
    dark  = (212,  84,  93)   # #D4545D  — darker ring
    white = (255, 255, 255)

    frames = []
    for sz in sizes:
        img = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Outer circle (brand color)
        margin = max(1, sz // 16)
        draw.ellipse([margin, margin, sz - margin, sz - margin], fill=brand)

        # Inner ring hint (slightly darker, 1px)
        draw.ellipse([margin, margin, sz - margin, sz - margin], outline=dark, width=max(1, sz // 32))

        # "SG" text — only legible at ≥ 32 px
        if sz >= 32:
            font_size = sz // 3
            try:
                from PIL import ImageFont
                # Try to use a system font; fall back to default
                font = ImageFont.truetype("arial.ttf", font_size)
            except Exception:
                font = ImageFont.load_default()

            text = "SG"
            # Get text bounding box
            bbox = draw.textbbox((0, 0), text, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            x = (sz - tw) // 2 - bbox[0]
            y = (sz - th) // 2 - bbox[1]
            draw.text((x, y), text, fill=white, font=font)

        frames.append(img)

    out = os.path.join(os.path.dirname(__file__), "skin_goddess.ico")
    frames[0].save(out, format="ICO", sizes=[(s, s) for s in sizes], append_images=frames[1:])
    print(f"Icon saved: {out}")


def make_ico_tkinter_fallback():
    """
    Fallback: generate a minimal 32x32 .ico using raw BMP bytes via tkinter.
    Creates a simple rose circle. No Pillow required.
    """
    import struct
    import zlib

    # We'll write a minimal valid .ico containing a 32x32 RGBA PNG frame.
    # Build the image as raw RGBA bytes first.
    sz = 32
    brand_r, brand_g, brand_b = 255, 176, 182
    cx, cy, r = sz // 2, sz // 2, sz // 2 - 1

    pixels = []
    for y in range(sz):
        row = []
        for x in range(sz):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if dist <= r:
                row.extend([brand_r, brand_g, brand_b, 255])
            else:
                row.extend([0, 0, 0, 0])
        pixels.append(bytes(row))

    # Build PNG manually
    def png_chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack(">IIBBBBB", sz, sz, 8, 6, 0, 0, 0)  # 8-bit RGBA
    ihdr = png_chunk(b'IHDR', ihdr_data)

    raw = b''
    for row in pixels:
        raw += b'\x00' + row  # filter byte None
    idat = png_chunk(b'IDAT', zlib.compress(raw, 9))
    iend = png_chunk(b'IEND', b'')
    png_bytes = signature + ihdr + idat + iend

    # Build .ico: 1 image entry
    # ICO header
    ico_header = struct.pack("<HHH", 0, 1, 1)  # reserved, type=1 (ICO), count=1
    # Directory entry: width, height, colorCount, reserved, planes, bitCount, bytesInRes, imageOffset
    img_offset = 6 + 16  # after header + one directory entry
    dir_entry = struct.pack("<BBBBHHII", sz, sz, 0, 0, 1, 32, len(png_bytes), img_offset)

    out = os.path.join(os.path.dirname(__file__), "skin_goddess.ico")
    with open(out, "wb") as f:
        f.write(ico_header + dir_entry + png_bytes)
    print(f"Icon saved (fallback PNG-in-ICO): {out}")


if __name__ == "__main__":
    try:
        import PIL
        make_ico_with_pillow()
    except ImportError:
        print("Pillow not available — using built-in fallback icon generator.")
        make_ico_tkinter_fallback()
