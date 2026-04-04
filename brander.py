#!/usr/bin/env python3
"""Batch image branding utility.

Usage examples:
  python brander.py --input ./images --output ./out --text "MyBrand"
  python brander.py --input photo.jpg --output ./out --logo logo.png --position top-right
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable, Tuple

from PIL import Image, ImageDraw, ImageFont

VALID_POSITIONS = {
    "bottom-left",
    "bottom-center",
    "bottom-right",
    "top-left",
    "top-center",
    "top-right",
    "center",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Add text or logo branding to one image or all images in a folder. "
            "Default position is bottom-center."
        )
    )
    parser.add_argument("--input", required=True, help="Input image path or folder path")
    parser.add_argument("--output", required=True, help="Output folder path")

    parser.add_argument("--text", help="Brand text to overlay")
    parser.add_argument("--logo", help="Logo image path (PNG with transparency recommended)")

    parser.add_argument("--position", default="bottom-center", choices=sorted(VALID_POSITIONS))
    parser.add_argument("--margin", type=int, default=24, help="Margin in pixels from image edge")
    parser.add_argument("--opacity", type=int, default=180, help="Brand opacity 0-255")

    parser.add_argument("--font", help="Path to a .ttf/.otf font for text branding")
    parser.add_argument("--font-size", type=int, default=48, help="Text size for branding")
    parser.add_argument(
        "--text-color",
        default="255,255,255",
        help="Text RGB color as r,g,b (default: 255,255,255)",
    )

    parser.add_argument(
        "--logo-scale",
        type=float,
        default=0.16,
        help="Max logo width as % of image width (e.g., 0.16 = 16%%)",
    )
    return parser.parse_args()


def iter_images(path: Path) -> Iterable[Path]:
    if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
        yield path
        return

    if path.is_dir():
        for p in sorted(path.iterdir()):
            if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
                yield p


def text_size(font: ImageFont.FreeTypeFont | ImageFont.ImageFont, text: str) -> Tuple[int, int]:
    left, top, right, bottom = font.getbbox(text)
    return right - left, bottom - top


def parse_rgb(value: str) -> Tuple[int, int, int]:
    parts = value.split(",")
    if len(parts) != 3:
        raise ValueError("text-color must be r,g,b")
    rgb = tuple(int(p.strip()) for p in parts)
    if any(c < 0 or c > 255 for c in rgb):
        raise ValueError("text-color values must be in 0-255")
    return rgb  # type: ignore[return-value]


def compute_position(
    base_w: int,
    base_h: int,
    overlay_w: int,
    overlay_h: int,
    position: str,
    margin: int,
) -> Tuple[int, int]:
    if "left" in position:
        x = margin
    elif "right" in position:
        x = base_w - overlay_w - margin
    else:
        x = (base_w - overlay_w) // 2

    if "top" in position:
        y = margin
    elif "bottom" in position:
        y = base_h - overlay_h - margin
    else:
        y = (base_h - overlay_h) // 2

    return max(0, x), max(0, y)


def add_text_brand(
    img: Image.Image,
    text: str,
    position: str,
    margin: int,
    opacity: int,
    font_path: str | None,
    font_size: int,
    text_color: Tuple[int, int, int],
) -> Image.Image:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))

    if font_path:
        font = ImageFont.truetype(font_path, font_size)
    else:
        try:
            font = ImageFont.truetype("DejaVuSans.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()

    draw = ImageDraw.Draw(overlay)
    tw, th = text_size(font, text)
    x, y = compute_position(img.width, img.height, tw, th, position, margin)

    draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, min(255, opacity)))
    draw.text((x, y), text, font=font, fill=(*text_color, opacity))

    return Image.alpha_composite(img.convert("RGBA"), overlay)


def add_logo_brand(
    img: Image.Image,
    logo: Image.Image,
    position: str,
    margin: int,
    opacity: int,
    logo_scale: float,
) -> Image.Image:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))

    max_logo_w = max(1, int(img.width * logo_scale))
    ratio = max_logo_w / logo.width
    new_size = (max_logo_w, max(1, int(logo.height * ratio)))
    logo_resized = logo.resize(new_size, Image.Resampling.LANCZOS).convert("RGBA")

    if opacity < 255:
        alpha = logo_resized.getchannel("A").point(lambda p: int(p * (opacity / 255)))
        logo_resized.putalpha(alpha)

    x, y = compute_position(img.width, img.height, logo_resized.width, logo_resized.height, position, margin)
    overlay.paste(logo_resized, (x, y), logo_resized)

    return Image.alpha_composite(img.convert("RGBA"), overlay)


def main() -> None:
    args = parse_args()

    if not args.text and not args.logo:
        raise SystemExit("Provide at least one branding source: --text or --logo")

    input_path = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    rgb = parse_rgb(args.text_color)
    logo_img = Image.open(args.logo).convert("RGBA") if args.logo else None

    files = list(iter_images(input_path))
    if not files:
        raise SystemExit("No supported images found in input")

    for src in files:
        with Image.open(src) as im:
            out = im.convert("RGBA")
            if args.logo and logo_img is not None:
                out = add_logo_brand(out, logo_img, args.position, args.margin, args.opacity, args.logo_scale)
            if args.text:
                out = add_text_brand(
                    out,
                    args.text,
                    args.position,
                    args.margin,
                    args.opacity,
                    args.font,
                    args.font_size,
                    rgb,
                )

            target = output_dir / src.name
            if target.suffix.lower() in {".jpg", ".jpeg"}:
                out.convert("RGB").save(target, quality=95)
            else:
                out.save(target)
            print(f"Saved: {target}")


if __name__ == "__main__":
    main()
