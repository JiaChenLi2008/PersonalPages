#!/usr/bin/env python3
"""校验放大档（public/media/original/）与 src/lib/originals.ts 的表一致。

门禁：timeout 60 python3 tools/verify-originals.py ；通过 rc=0，失败逐条打印原因并 rc=1。
纯 python3 + PIL，与 tools/verify-assets.py 同口径。

放大档是灯箱点开后加载的原图重编码（长边 ≤2560 的 WebP），不在 public/media 顶层，
故不受 verify-assets.py 的「清单集合==磁盘集合」约束 —— 那一层只认派生小图。本门禁
接住它让出的两件事：表里每一行都落得了盘、尺寸/字节上限属实、目录里没有表外的孤儿文件。
"""
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "public" / "media"
ORIGINAL_DIR = MEDIA / "original"
TABLE = ROOT / "src" / "lib" / "originals.ts"
MAX_LONG_EDGE = 2560
MAX_BYTES = 1024 * 1024  # 实测最大 922.2 KB（sport-wall-5 的 2560 宽原图），留一成余量

ROW = re.compile(
    r'"(?P<preview>media/[\w./-]+)"\s*:\s*\{\s*'
    r'src:\s*"(?P<src>media/original/[\w./-]+)"\s*,\s*'
    r"width:\s*(?P<width>\d+)\s*,\s*height:\s*(?P<height>\d+)"
)


def main():
    errs = []
    try:
        text = TABLE.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"FAIL 放大档表缺失: {TABLE}")
        return 1
    rows = [m.groupdict() for m in ROW.finditer(text)]
    if not rows:
        print(f"FAIL 未从 {TABLE.relative_to(ROOT)} 解析到任何一行（格式变了？）")
        return 1

    total = 0
    listed = set()
    for row in rows:
        preview = MEDIA / row["preview"].split("media/", 1)[1]
        src = ROOT / "public" / row["src"]
        name = src.relative_to(ORIGINAL_DIR).as_posix()
        listed.add(name)
        if not preview.is_file():
            errs.append(f"{row['preview']}: 预览图不在 public/media 下（表里的键打错，灯箱永远不会命中它）")
        if not src.is_file():
            errs.append(f"{row['src']}: 放大档文件缺失")
            continue
        size = src.stat().st_size
        total += size
        if size > MAX_BYTES:
            errs.append(f"{row['src']}: {size} 字节 > {MAX_BYTES // 1024} KB 上限")
        try:
            with Image.open(src) as im:
                fmt, (w, h) = im.format, im.size
        except Exception as exc:  # noqa: BLE001 - 门禁须逐条报因不崩
            errs.append(f"{row['src']}: PIL 打不开: {exc}")
            continue
        if fmt != "WEBP":
            errs.append(f"{row['src']}: 实际格式 {fmt} != WEBP")
        if (w, h) != (int(row["width"]), int(row["height"])):
            errs.append(
                f"{row['src']}: 表里写 {row['width']}x{row['height']}，实测 {w}x{h}"
                f"（灯箱的 --lightbox-ratio 就写错了，点开后盒子与照片比例不符）"
            )
        if max(w, h) > MAX_LONG_EDGE:
            errs.append(f"{row['src']}: 长边 {max(w, h)} > {MAX_LONG_EDGE}（超出的像素上不了屏，只拖慢点击）")
        if preview.is_file():
            with Image.open(preview) as im:
                pw, ph = im.size
            if w < pw or h < ph:
                errs.append(f"{row['src']}: {w}x{h} 比预览图 {pw}x{ph} 还小，不是放大档")

    on_disk = {p.name for p in ORIGINAL_DIR.glob("*") if p.is_file()} if ORIGINAL_DIR.is_dir() else set()
    for orphan in sorted(on_disk - listed):
        errs.append(f"media/original/{orphan}: 目录里有、表里没有（孤儿文件，灯箱不会用到）")

    for e in errs:
        print(f"FAIL {e}")
    if errs:
        print(f"FAIL 放大档 {len(errs)} 处不合口径")
        return 1
    print(
        f"PASS: 放大档 {len(rows)} 行（{len(on_disk)} 个文件，合计 {total / 1024:.1f} KB），"
        f"逐行验预览图存在、WebP 尺寸与表一致、长边 ≤{MAX_LONG_EDGE}、单文件 ≤{MAX_BYTES // 1024} KB，目录无孤儿"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
