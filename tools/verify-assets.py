#!/usr/bin/env python3
"""校验 public/media/ 的图片资产与 MANIFEST.json 一致。

门禁：timeout 90 python3 tools/verify-assets.py ；通过 rc=0，失败逐条打印原因并 rc=1。
纯 python3 + PIL，无第三方依赖。
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "public" / "media"
MANIFEST = MEDIA / "MANIFEST.json"
EXT_FORMAT = {"webp": "WEBP", "jpg": "JPEG"}
FIELD_TYPES = {
    "src": str, "w": int, "h": int, "bytes": int, "format": str,
    "aspect": (int, float), "crop": (str, type(None)), "quality": int,
}
# ui.pen 图位派生图：base -> (nodeId, 目标宽, 目标高)。
# crop 标签按设计框实测比例命名（T0FU1 框 1344x420=16:5、FvW5q 框 1440x560=18:7）；
# 二者节点名虽写 21:9，实际宽高比不是 21:9，故不落在 ⑦ 的 21x9 比例判据上。
DERIVED = {
    "igem-fig1-720": ("u2okj", 720, 540),
    "igem-fig2-720": ("I2wlYa", 720, 540),
    "hir-fig-2688": ("T0FU1", 2688, 840),
    "music-fig-720": ("vVdM9", 720, 540),
    "sport-fig-720": ("rWg3m", 720, 540),
    "elder-fig-720": ("Uh3XX", 720, 540),
    "index-elder-296": ("kIPsy", 296, 296),
    "index-music-296": ("XywbR", 296, 296),
    "index-sport-296": ("B8NpB", 296, 296),
    "photoband-2880": ("FvW5q", 2880, 1120),
}
DERIVED_MAX_BYTES = 250 * 1024
BLANK_STDDEV_SUM = 5  # RGB 三通道标准差之和 <= 此值即为空白/占位图
SOURCE_ORIGINALS = {"image1.jpeg", "image2.jpeg", "image3.jpeg"}
NON_DERIVED = {"hir-essay.pdf"}  # 原样搬运的附件（非派生位图），不参与位图清单：无像素尺寸，且由 ScholarlyHir 直接 href 使用


def main():
    errs = []
    try:
        raw = MANIFEST.read_text(encoding="utf-8")
        m = json.loads(raw)
    except FileNotFoundError:
        print(f"FAIL 清单缺失: {MANIFEST}")
        return 1
    except json.JSONDecodeError as e:
        print(f"FAIL 清单不可解析: {e}")
        return 1

    # ① 可解析 + 字段类型
    if not isinstance(m, dict):
        print("FAIL 清单顶层须为对象")
        return 1
    srcs = m.get("_sources")
    if not isinstance(srcs, dict) or not SOURCE_ORIGINALS <= set(srcs):
        print(f"FAIL _sources 缺失既有 3 张源图 {sorted(SOURCE_ORIGINALS)}: {srcs!r}")
        return 1
    for name, s in srcs.items():
        if not isinstance(s, dict) or not {"w", "h", "bytes", "format"} <= set(s):
            print(f"FAIL _sources[{name}] 字段不全: {s!r}")
            return 1
        if not all(isinstance(s[k], int) and s[k] > 0 for k in ("w", "h", "bytes")):
            print(f"FAIL _sources[{name}] w/h/bytes 须为正整数: {s!r}")
            return 1

    entries = {k: v for k, v in m.items() if k != "_sources"}
    if not entries:
        print("FAIL 清单无资产条目")
        return 1

    for key, e in sorted(entries.items()):
        if "/" in key or "\\" in key:
            errs.append(f"{key}: 清单键须为不含目录的文件名")
            continue
        if not isinstance(e, dict):
            errs.append(f"{key}: 条目须为对象")
            continue
        bad = False
        for f, t in FIELD_TYPES.items():
            if f not in e:
                errs.append(f"{key}: 缺字段 {f}")
                bad = True
            elif not isinstance(e[f], t) or isinstance(e[f], bool):
                errs.append(f"{key}: 字段 {f} 类型错误 ({e[f]!r})")
                bad = True
        if bad:
            continue
        if e["src"] not in srcs:
            errs.append(f"{key}: src={e['src']!r} 不在 _sources 中")
            continue

        # ② 存在 + 字节一致
        path = MEDIA / key
        if not path.is_file():
            errs.append(f"{key}: 文件缺失 ({path})")
            continue
        if path.stat().st_size != e["bytes"]:
            errs.append(f"{key}: 字节数不符 实测 {path.stat().st_size} != 清单 {e['bytes']}")
            continue

        # ③ PIL 实测宽高一致；⑤ 扩展名与格式一致
        ext = key.rsplit(".", 1)[-1].lower()
        if ext not in EXT_FORMAT:
            errs.append(f"{key}: 扩展名 {ext!r} 不在 {sorted(EXT_FORMAT)}")
            continue
        if e["format"] != ext:
            errs.append(f"{key}: 清单 format={e['format']!r} 与扩展名 {ext!r} 不一致")
        try:
            with Image.open(path) as im:
                got_fmt, got = im.format, im.size
        except Exception as ex:  # noqa: BLE001 - 门禁须逐条报因不崩
            errs.append(f"{key}: PIL 打不开: {ex}")
            continue
        if got != (e["w"], e["h"]):
            errs.append(f"{key}: 宽高与清单不符 实测 {got[0]}x{got[1]} != 清单 {e['w']}x{e['h']}")
        if got_fmt != EXT_FORMAT[ext]:
            errs.append(f"{key}: 实际格式 {got_fmt} != 期望 {EXT_FORMAT[ext]}（扩展名 {ext}）")

        # ④ 禁放大：任一边长不得超过其 src 的对应边长
        s = srcs[e["src"]]
        if e["w"] > s["w"] or e["h"] > s["h"]:
            errs.append(f"{key}: 放大违约 {e['w']}x{e['h']} > src {s['w']}x{s['h']}")

    # ⑧ 图位派生图：存在、像素尺寸精确匹配、单文件 <=250KB、webp/jpg 成对、非空白
    derived_before = len(errs)
    for base, (node, dw, dh) in sorted(DERIVED.items()):
        for ext in ("webp", "jpg"):
            name = f"{base}.{ext}"
            path = MEDIA / name
            if not path.is_file():
                errs.append(f"{name}: 派生图缺失（nodeId {node}）")
                continue
            if name not in entries:
                errs.append(f"{name}: 未登记进清单（nodeId {node}）")
            elif entries[name].get("nodeId") != node:
                errs.append(f"{name}: 清单 nodeId={entries[name].get('nodeId')!r} != {node!r}")
            if path.stat().st_size > DERIVED_MAX_BYTES:
                errs.append(f"{name}: {path.stat().st_size} 字节 > 250 KB 上限")
            try:
                with Image.open(path) as im:
                    got, spread = im.size, sum(ImageStat.Stat(im.convert("RGB")).stddev)
            except Exception as ex:  # noqa: BLE001 - 门禁须逐条报因不崩
                errs.append(f"{name}: PIL 打不开: {ex}")
                continue
            if got != (dw, dh):
                errs.append(f"{name}: 尺寸 {got[0]}x{got[1]} != 目标 {dw}x{dh}（nodeId {node}）")
            if spread <= BLANK_STDDEV_SUM:
                errs.append(f"{name}: 标准差和 {spread:.2f} <= {BLANK_STDDEV_SUM}（空白图）")
    derived_failed = len(errs) - derived_before

    # 文件数须与清单条目数一致（无孤儿文件、无漏登记）；NON_DERIVED 为显式豁免的非位图附件，其存在单独校验
    for name in sorted(NON_DERIVED):
        if not (MEDIA / name).is_file():
            errs.append(f"{name}: 非派生附件缺失")
    on_disk = sorted(
        p.name for p in MEDIA.iterdir()
        if p.is_file() and p.name != MANIFEST.name and p.name not in NON_DERIVED
    )
    if len(on_disk) != len(entries):
        errs.append(f"文件数与清单条目数不一致 磁盘 {len(on_disk)} != 清单 {len(entries)}")
        for n in set(on_disk) - set(entries):
            errs.append(f"  {n}: 磁盘存在但清单未登记")
        for n in set(entries) - set(on_disk):
            errs.append(f"  {n}: 清单登记但磁盘缺失")

    total = sum(e["bytes"] for e in entries.values() if isinstance(e.get("bytes"), int))
    src_total = sum(s["bytes"] for s in srcs.values())
    for e in errs:
        print(f"FAIL {e}")
    # ⑥ 确为优化而非搬运：全站资产总字节须小于源图总字节
    if total >= src_total:
        errs.append(f"总字节未减少 资产 {total} >= 源图 {src_total}")
        print(f"FAIL {errs[-1]}")
    # ⑦ 清单内 21:9 裁切比例（21/9=2.3333）误差 <= 0.02
    for key, e in entries.items():
        if e.get("crop") == "21x9":
            err = abs(e["w"] / e["h"] - 21 / 9)
            if err > 0.02:
                errs.append(f"{key}: 21x9 比例误差 {err:.4f} > 0.02")
                print(f"FAIL {errs[-1]}")

    print(f"files={len(entries)} total_bytes={total}")
    print(f"sources_bytes={src_total} saved_bytes={src_total - total} "
          f"({(src_total - total) / src_total * 100:.1f}% 缩减)")
    if derived_failed:
        print(f"新增 {len(DERIVED)} 组图位：{derived_failed} 项不合格")
    else:
        print(f"新增 {len(DERIVED)} 组图位通过：存在 / 尺寸精确匹配 / 单文件 <=250KB / webp+jpg 成对 / 非空白")
    if errs:
        print(f"FAIL 共 {len(errs)} 条")
        return 1
    print("OK 全部校验通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
