#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Zona Blue — Generador de tomas para carrusel de producto.

Toma una foto de producto (camisa, buzo, gorra, etc.) y genera 3 o 4
imágenes 4:5 listas para el carrusel del modal: producto-1.jpg,
producto-2.jpg, producto-3.jpg (y producto-4.jpg opcional).

Las tomas se obtienen de la MISMA foto con encuadres distintos:
  1. Plano completo (cover centrado)
  2. Detalle medio (zoom al centro)
  3. Vista espejo / lado opuesto (flip horizontal + zoom)
  4. Primer plano (zoom fuerte + inclinación leve)

Uso:
  py -3 scripts/product_shots.py <imagen-o-carpeta> [-o SALIDA] [-n producto] [-v 4]

Ejemplos:
  py -3 scripts/product_shots.py foto-camisa.jpg
  py -3 scripts/product_shots.py assets/products/canva/p6-1.jpg -o assets/products/variantes
  py -3 scripts/product_shots.py fotos-nuevas/ -o assets/products/variantes -v 3

Salida:
  - Si la entrada es UNA sola imagen  -> SALIDA/producto-1.jpg ... producto-N.jpg
  - Si la entrada es una CARPETA       -> SALIDA/<nombre-de-cada-foto>/producto-1.jpg ...

Requiere: Pillow  (py -3 -m pip install Pillow)
"""

from __future__ import annotations

import argparse
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageOps

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}

# Relaciones de encuadre de cada toma: (zoom, foco_x, foco_y, espejo, rotación)
# foco 0.0 = borde superior/izquierdo, 1.0 = borde inferior/derecho.
VIEWS = {
    1: (1.00, 0.50, 0.50, False, 0.0),   # plano completo
    2: (1.45, 0.50, 0.45, False, 0.0),   # detalle medio
    3: (1.15, 0.50, 0.50, True, 0.0),    # lado opuesto (espejo)
    4: (2.00, 0.50, 0.40, False, -4.0),  # primer plano inclinado
}


def iter_images(source: Path) -> list[Path]:
    """Devuelve las imágenes válidas de un archivo o carpeta."""
    if source.is_file():
        return [source] if source.suffix.lower() in EXTENSIONS else []
    if source.is_dir():
        return sorted(
            p for p in source.iterdir()
            if p.is_file() and p.suffix.lower() in EXTENSIONS
        )
    return []


def cover_crop(
    img: Image.Image,
    ratio: float,
    zoom: float,
    focus: tuple[float, float],
) -> Image.Image:
    """Recorta con la relación pedida, aplicando zoom y punto de foco."""
    w, h = img.size
    if w / h > ratio:
        crop_h = h
        crop_w = h * ratio
    else:
        crop_w = w
        crop_h = w / ratio

    crop_w /= zoom
    crop_h /= zoom

    left = (w - crop_w) * focus[0]
    top = (h - crop_h) * focus[1]
    box = (
        round(left),
        round(top),
        round(left + crop_w),
        round(top + crop_h),
    )
    return img.crop(box)


def corner_color(img: Image.Image) -> tuple[int, int, int]:
    """Color de la esquina para rellenar la rotación."""
    px = img.convert("RGB").getpixel((0, 0))
    return px if isinstance(px, tuple) else (px, px, px)


def to_rgb(img: Image.Image) -> Image.Image:
    """Corrige orientación EXIF y compone transparencias sobre el fondo del sitio."""
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        img = img.convert("RGBA")
        bg = Image.new("RGBA", img.size, (10, 10, 16, 255))  # --bg del sitio (#0a0a10)
        img = Image.alpha_composite(bg, img)
    return img.convert("RGB")


def build_views(
    src: Path,
    out_dir: Path,
    name: str,
    views: int,
    size: tuple[int, int],
    quality: int,
) -> list[Path]:
    """Genera las N tomas de una imagen y devuelve las rutas escritas."""
    with Image.open(src) as im:
        base = to_rgb(im)

    ratio = size[0] / size[1]
    written: list[Path] = []

    for idx in range(1, views + 1):
        zoom, fx, fy, mirror, rotate = VIEWS[idx]

        working = base
        if rotate:
            working = working.rotate(
                rotate,
                resample=Image.Resampling.BICUBIC,
                expand=False,
                fillcolor=corner_color(base),
            )
        if mirror:
            working = ImageOps.mirror(working)

        frame = cover_crop(working, ratio, zoom, (fx, fy))
        frame = frame.resize(size, Image.Resampling.LANCZOS)

        out_file = out_dir / f"{name}-{idx}.jpg"
        frame.save(
            out_file,
            "JPEG",
            quality=quality,
            optimize=True,
            subsampling="4:2:0",
            progressive=True,
        )
        written.append(out_file)

    return written


def process_one(
    src: Path,
    out_root: Path,
    name: str,
    views: int,
    size: tuple[int, int],
    quality: int,
    multi: bool,
) -> tuple[Path, int]:
    """Procesa una imagen. Devuelve (archivo, nº de tomas)."""
    out_dir = out_root / src.stem if multi else out_root
    out_dir.mkdir(parents=True, exist_ok=True)
    written = build_views(src, out_dir, name, views, size, quality)
    return src, len(written)


def parse_size(value: str) -> tuple[int, int]:
    try:
        w, h = value.lower().replace("×", "x").split("x")
        return int(w), int(h)
    except Exception as exc:  # pragma: no cover
        raise argparse.ArgumentTypeError("Formato de tamaño inválido. Usa 800x1000") from exc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Genera 3-4 tomas 4:5 para el carrusel de un producto."
    )
    parser.add_argument("source", help="Imagen o carpeta de imágenes")
    parser.add_argument("-o", "--out", default=None, help="Carpeta de salida (default: <source>/variantes)")
    parser.add_argument("-n", "--name", default="producto", help="Prefijo de salida (default: producto)")
    parser.add_argument("-v", "--views", type=int, choices=(3, 4), default=4, help="Nº de tomas (3 o 4)")
    parser.add_argument("-s", "--size", type=parse_size, default=(800, 1000), help="Salida WxH (default 800x1000)")
    parser.add_argument("-q", "--quality", type=int, default=82, help="Calidad JPEG (default 82)")
    parser.add_argument("-j", "--jobs", type=int, default=4, help="Procesos simultáneos (default 4)")
    args = parser.parse_args()

    source = Path(args.source).expanduser().resolve()
    images = iter_images(source)
    if not images:
        print(f"[X] No se encontraron imágenes en: {source}", file=sys.stderr)
        return 1

    multi = source.is_dir() and len(images) > 1
    out_root = (
        Path(args.out).expanduser().resolve()
        if args.out
        else (source if source.is_dir() else source.parent) / "variantes"
    )
    out_root.mkdir(parents=True, exist_ok=True)

    start = time.perf_counter()
    total = 0

    if multi:
        with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
            futures = [
                pool.submit(
                    process_one,
                    img, out_root, args.name, args.views, args.size, args.quality, True,
                )
                for img in images
            ]
            for future in futures:
                src, count = future.result()
                total += count
                print(f"  [ok] {src.name} -> {src.stem}/{count} tomas")
    else:
        src, count = process_one(
            images[0], out_root, args.name, args.views, args.size, args.quality, False,
        )
        total += count
        print(f"  [ok] {src.name} -> {count} tomas en {out_root}")

    elapsed = time.perf_counter() - start
    print(
        f"\n[OK] {len(images)} imagen(es) -> {total} tomas en {elapsed:.2f}s "
        f"({total / max(elapsed, 1e-6):.0f} tomas/s)"
    )
    if elapsed > 2:
        print("     Aviso: más de 2s en total (normal con muchas fotos de golpe).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
