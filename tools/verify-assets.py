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
# crop 标签按设计框实测比例命名（FvW5q 框 1440x560=18:7）；节点名虽写 21:9，实际宽高比不是 21:9，
# 故不落在 ⑦ 的 21x9 比例判据上。HIR（T0FU1）自 2026-10-28 用户裁定起取原幅 y275–675 全幅裁切，crop 记所得比例 4x1。
DERIVED = {
    "igem-fig1-720": ("u2okj", 720, 540),
    "igem-fig2-720": ("I2wlYa", 720, 540),
    "hir-fig-1600x400": ("T0FU1", 1600, 400),
    "music-fig-720": ("vVdM9", 720, 540),
    "sport-fig-720": ("rWg3m", 720, 540),
    "elder-fig-720": ("Uh3XX", 720, 540),
    "index-elder-296": ("kIPsy", 296, 296),
    "index-music-296": ("XywbR", 296, 296),
    "index-sport-296": ("B8NpB", 296, 296),
    "photoband-2880": ("FvW5q", 2880, 1120),
}
DERIVED_MAX_BYTES = 250 * 1024
# 全幅宽图（通栏、无左右留白，像素最密）单文件上限放宽到 320 KB，**只对下列白名单**生效；
# 其余图位一律仍判 250 KB。hir-fig-1600x400 按 2026-10-28 供图 1600×695 原幅裁切（下部留 20、上部裁 275）得 1600×400，q91 实测贴近 320 KB 上限；
# photoband-2880（另一张全幅宽图）同样上限，现文件远低于此值。
FULL_BLEED_MAX_BYTES = 320 * 1024
FULL_BLEED = {"hir-fig-1600x400", "photoband-2880"}
BLANK_STDDEV_SUM = 5  # RGB 三通道标准差之和 <= 此值即为空白/占位图
SOURCE_ORIGINALS = {"image1.jpeg", "image2.jpeg", "image3.jpeg"}
NON_DERIVED = {
    "hir-essay.pdf",  # 原样搬运的附件（非派生位图），不参与位图清单：无像素尺寸，且由 ScholarlyHir 直接 href 使用
    "cv.pdf",  # 简历 PDF 原件（docx-1027 第 7 条恢复 VIEW CV 钮），由 Hero 直接 href 使用
    "shanghai-hospitals.xlsx",  # 医院指南工作簿：zip 容器不是位图，由 tools/verify-hospitals-xlsx.py 单独校验
}


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

        # ④ 禁放大：派生图的长短边都不得超过 src 的长短边。
        # 90° 旋转派生图长短边互换，仍属 1:1 像素，不构成放大（docx-1023 第 2 条）
        s = srcs[e["src"]]
        short, long = sorted((e["w"], e["h"]))
        src_short, src_long = sorted((s["w"], s["h"]))
        if short > src_short or long > src_long:
            errs.append(f"{key}: 放大违约 {e['w']}x{e['h']} > src {s['w']}x{s['h']}")

    # ⑧ 图位派生图：存在、像素尺寸精确匹配、单文件 <=上限、webp/jpg 成对、非空白
    if not FULL_BLEED <= set(DERIVED):
        print(f"FAIL 全幅宽白名单含未知图位: {sorted(FULL_BLEED - set(DERIVED))}")
        return 1
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
            cap = FULL_BLEED_MAX_BYTES if base in FULL_BLEED else DERIVED_MAX_BYTES
            if path.stat().st_size > cap:
                errs.append(
                    f"{name}: {path.stat().st_size} 字节 > {cap // 1024} KB 上限"
                    f"（{'全幅宽白名单' if base in FULL_BLEED else '默认'}）"
                )
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
        print(f"新增 {len(DERIVED)} 组图位通过：存在 / 尺寸精确匹配 / 单文件 <=250KB"
              f"（全幅宽 {sorted(FULL_BLEED)} <=320KB）/ webp+jpg 成对 / 非空白")
    if errs:
        print(f"FAIL 共 {len(errs)} 条")
        return 1
    print("OK 全部校验通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
