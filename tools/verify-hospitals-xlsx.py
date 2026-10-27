#!/usr/bin/env python3
"""校验 public/media/shanghai-hospitals.xlsx：结构可解析、sheet 名与顺序、表头等于生成器字面量、
12 行 × 5 列逐字等于字典、行列数无多余或缺失、且与生成器重算逐字节一致。纯标准库。

门禁：timeout 300 python3 tools/verify-hospitals-xlsx.py ；rc=0 通过，rc=1 失败（逐条打印
sheet / 行 / 列 / 字典键）。页面链接与样式版式不在本门禁的判据内（前者归 Elder 的 DOM 门禁）。
"""
import importlib.util
import re
import sys
import zipfile
from pathlib import Path

from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parent.parent
WORKBOOK = ROOT / "public" / "media" / "shanghai-hospitals.xlsx"
GENERATOR_PATH = ROOT / "tools" / "build-hospitals-xlsx.py"

MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
PKG_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"
OFFICE_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
CELL_REF = re.compile(r"([A-Z]+)([0-9]+)$")
COLUMNS = "ABCDE"


def load_generator():
    """生成器文件名带连字符，不能直接 import，故按路径加载以复用同一份行/字节口径。"""
    sys.dont_write_bytecode = True  # 不在 tools/ 里留 __pycache__
    spec = importlib.util.spec_from_file_location("build_hospitals_xlsx", GENERATOR_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def resolve_sheets(archive):
    """[(sheet 名, zip 内路径)]，顺序按 workbook.xml，路径经 workbook.xml.rels 解析。"""
    workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
    rels = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {rel.get("Id"): rel.get("Target") for rel in rels.findall(f"{PKG_REL}Relationship")}
    sheets = []
    for sheet in workbook.find(f"{MAIN}sheets").findall(f"{MAIN}sheet"):
        target = targets.get(sheet.get(f"{OFFICE_REL}id"))
        if target is None:
            sheets.append((sheet.get("name"), None))
        # OPC 的相对 Target 相对源部件所在目录（workbook.xml 在 xl/ 下）。
        elif target.startswith("/"):
            sheets.append((sheet.get("name"), target.lstrip("/")))
        else:
            sheets.append((sheet.get("name"), f"xl/{target}"))
    return sheets


def read_shared_strings(archive):
    """sharedStrings 与 inlineStr 两种存法都支持：前者按 <si> 收所有 <t>，后者逐个读 <is>。"""
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    return ["".join(node.text or "" for node in item.iter(f"{MAIN}t")) for item in root.findall(f"{MAIN}si")]


def cell_text(cell, shared):
    if cell.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(f"{MAIN}t"))
    value = cell.find(f"{MAIN}v")
    raw = "" if value is None else (value.text or "")
    if cell.get("t") == "s":
        return shared[int(raw)]
    return raw


def read_grid(archive, sheet_path, shared, errs, sheet_name):
    """{行号: {列字母: 文本}}；行列号取自单元格 ref，故错位不会被行序掩盖。"""
    grid = {}
    for row in ElementTree.fromstring(archive.read(sheet_path)).iter(f"{MAIN}row"):
        for cell in row.findall(f"{MAIN}c"):
            matched = CELL_REF.match(cell.get("r") or "")
            if matched is None:
                errs.append(f"{sheet_name}: 单元格 ref={cell.get('r')!r} 不可解析")
                continue
            col, row_index = matched.group(1), int(matched.group(2))
            grid.setdefault(row_index, {})[col] = cell_text(cell, shared)
    return grid


def expected_grid(locale):
    """({行号: {列字母: 文本}}, 同形状的标签)；行标签点名字典键，表头标签点名字面量出处。"""
    header, rows = GENERATOR.sheet_table(locale)
    grid = {1: dict(zip(COLUMNS, header))}
    labels = {
        1: dict(
            zip(
                COLUMNS,
                ["序号列表头（字面量）"]
                + [f"表头 {suffix}（{GENERATOR_PATH.name} 字面量）" for suffix, _ in GENERATOR.COLUMNS],
            )
        )
    }
    for offset, row_id in enumerate(GENERATOR.ROW_IDS, start=1):
        row_index = offset + 1
        grid[row_index] = dict(zip(COLUMNS, [str(offset)] + list(rows[offset - 1][1:])))
        labels[row_index] = dict(
            zip(COLUMNS, [f"序号 {offset}"] + [f"elder.guide.{row_id}.{suffix}" for suffix, _ in GENERATOR.COLUMNS])
        )
    return grid, labels


def verify_grid(sheet_name, locale, grid, errs):
    expected, labels = expected_grid(locale)
    for row_index in sorted(set(grid) - set(expected)):
        errs.append(f"{sheet_name} 第{row_index}行: 多余行（期望仅 {len(expected)} 行，含表头）")
    for row_index in sorted(set(expected) - set(grid)):
        errs.append(f"{sheet_name} 第{row_index}行: 缺行")
    for row_index in sorted(set(grid) & set(expected)):
        got = grid[row_index]
        for col in sorted(set(got) - set(COLUMNS)):
            errs.append(f"{sheet_name} 第{row_index}行 {col}列: 多余列")
        for col in COLUMNS:
            if col not in got:
                errs.append(f"{sheet_name} 第{row_index}行 {col}列 ({labels[row_index][col]}): 缺单元格")
            elif got[col] != expected[row_index][col]:
                errs.append(
                    f"{sheet_name} 第{row_index}行 {col}列 ({labels[row_index][col]}): "
                    f"表里 {got[col]!r} != 字典 {expected[row_index][col]!r}"
                )


GENERATOR = load_generator()


def main():
    errs = []
    # ① 文件存在、可解析
    if not WORKBOOK.is_file():
        print(f"FAIL 文件缺失: {WORKBOOK.relative_to(ROOT)}")
        return 1
    try:
        archive = zipfile.ZipFile(WORKBOOK)
    except zipfile.BadZipFile as exc:
        print(f"FAIL 不是可解析的 zip: {exc}")
        return 1

    rebuilt = GENERATOR.build_workbook_bytes()
    with archive:
        try:
            sheets = resolve_sheets(archive)
            shared = read_shared_strings(archive)
        except (KeyError, ElementTree.ParseError) as exc:
            print(f"FAIL OPC 骨架不可解析（workbook.xml / rels / sharedStrings）: {exc}")
            return 1

        # ② 两个 sheet 名与顺序
        expected_names = [name for name, _, _ in GENERATOR.SHEETS]
        got_names = [name for name, _ in sheets]
        if got_names != expected_names:
            print(f"FAIL sheet 名与顺序: 表里 {got_names} != 期望 {expected_names}")
            return 1

        # ③④⑤ 表头 + 逐格文本 + 行列数
        for (sheet_name, sheet_path), (_, locale, _) in zip(sheets, GENERATOR.SHEETS):
            if sheet_path is None or sheet_path not in archive.namelist():
                errs.append(f"{sheet_name}: rels 指向的工作表 {sheet_path!r} 不在包里")
                continue
            try:
                grid = read_grid(archive, sheet_path, shared, errs, sheet_name)
            except ElementTree.ParseError as exc:
                errs.append(f"{sheet_name}: 工作表 XML 不可解析: {exc}")
                continue
            verify_grid(sheet_name, locale, grid, errs)

    # ⑥ 与生成器重算逐字节一致（版式 / entry 顺序 / 时间戳一并锁住）
    on_disk = WORKBOOK.read_bytes()
    if on_disk != rebuilt:
        limit = min(len(on_disk), len(rebuilt))
        offset = next((i for i in range(limit) if on_disk[i] != rebuilt[i]), limit)
        errs.append(
            f"与生成器重算不一致: 首个差异字节 {offset}"
            f"（磁盘 {len(on_disk)} B / 重算 {len(rebuilt)} B）"
        )

    for message in errs:
        print(f"FAIL {message}")
    if errs:
        print(f"FAIL 共 {len(errs)} 条")
        return 1
    print(
        f"OK {WORKBOOK.relative_to(ROOT)}: sheet {got_names}，各 1 行表头 + "
        f"{len(GENERATOR.ROW_IDS)} 行 × {len(GENERATOR.COLUMNS) + 1} 列（行值逐字等于字典、表头等于生成器字面量），"
        f"与生成器重算一致（{len(rebuilt)} B）"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
