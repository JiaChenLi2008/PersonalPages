#!/usr/bin/env python3
"""从 docs/copy-{zh,en}.json 生成 public/media/shanghai-hospitals.xlsx（纯标准库）。

两份 sheet：中文（序号 | 医院 | 签到方式 | 其他检查 | 避坑提示）与 English（No. | Hospital |
Check-in | Other tests | Tips），各 12 行，行值取字典 text，表头与序号是本文件的字面量（页内
表格已撤，表头不再是字典键），不在本文件里手抄行值。

用法：python3 tools/build-hospitals-xlsx.py [--write|--check]
  --write（默认）重算并落盘；--check 重算后与磁盘文件逐字节比较，不等 rc=1 并打印首个
  差异字节位置。ZIP 内各 entry 的时间戳、顺序、压缩级别、宿主字段全部固定，同一字典两次
  生成字节相同；不读环境变量、不读时钟。
"""
import io
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
OUTPUT = ROOT / "public" / "media" / "shanghai-hospitals.xlsx"

# (sheet 名, 字典侧, 序号列表头)。序号与四个表头都不是字典键（docx-1027 第 4 条撤掉页内
# 表格后，elder.guide.head.* 已从字典删除），故这些字面量由本文件持有；行值仍逐字取字典。
SHEETS = (("中文", "zh", "序号"), ("English", "en", "No."))
ROW_IDS = tuple(f"r{index:02d}" for index in range(1, 13))
# {字典侧: (医院, 签到方式, 其他检查, 避坑提示)}。
HEADERS = {
    "zh": ("医院", "签到方式", "其他检查", "避坑提示"),
    "en": ("Hospital", "Check-in", "Other tests", "Tips"),
}
# (行键后缀, 列宽)。
COLUMNS = (
    ("name", 26),
    ("checkin", 52),
    ("tests", 30),
    ("tips", 56),
)
SERIAL_WIDTH = 6
SHEET_NAME_OF = {locale: name for name, locale, _ in SHEETS}

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
# 固定 ZIP 头：跨平台、跨次运行生成同一份字节。
ZIP_EPOCH = (1980, 1, 1, 0, 0, 0)
COMPRESS_LEVEL = 9
STYLE_HEADER, STYLE_BODY = 1, 2


def load_copy(locale):
    path = DOCS / f"copy-{locale}.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"FAIL 字典缺失: {path}")


def sheet_table(locale):
    """(表头 5 列, 12 行 × 5 列)；序号与表头是本文件的字面量，四个行值逐字取字典 text。"""
    copy = load_copy(locale)
    serial_header = next(head for _, loc, head in SHEETS if loc == locale)
    header = [serial_header, *HEADERS[locale]]
    rows = [
        [str(index)] + [copy[f"elder.guide.{row_id}.{suffix}"]["text"] for suffix, _ in COLUMNS]
        for index, row_id in enumerate(ROW_IDS, start=1)
    ]
    return header, rows


def escape(text):
    """XML 文本节点转义，并剔掉 XML 1.0 不允许的控制字符。"""
    cleaned = "".join(
        ch for ch in text if ch in "\t\n\r" or "\x20" <= ch <= "\ud7ff" or ch >= "\xe000"
    )
    return (
        cleaned.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def text_cell(ref, text, style):
    space = ' xml:space="preserve"' if text != text.strip() else ""
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t{space}>{escape(text)}</t></is></c>'


def number_cell(ref, number, style):
    return f'<c r="{ref}" s="{style}"><v>{number}</v></c>'


def row_xml(row_index, values, style):
    cells = [number_cell(f"A{row_index}", values[0], style)]
    cells += [text_cell(f"{col}{row_index}", text, style) for col, text in zip("BCDE", values[1:])]
    return f'<row r="{row_index}">' + "".join(cells) + "</row>"


def sheet_xml(locale):
    header, rows = sheet_table(locale)
    widths = [SERIAL_WIDTH] + [width for _, width in COLUMNS]
    cols = "".join(
        f'<col min="{index}" max="{index}" width="{width}" customWidth="1"/>'
        for index, width in enumerate(widths, start=1)
    )
    lines = [
        XML_DECL,
        f'<worksheet xmlns="{MAIN_NS}">',
        f'<dimension ref="A1:E{len(rows) + 1}"/>',
        '<sheetViews><sheetView workbookViewId="0">'
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
        "</sheetView></sheetViews>",
        '<sheetFormatPr defaultRowHeight="15"/>',
        f"<cols>{cols}</cols>",
        "<sheetData>",
        f'<row r="1">'
        + text_cell("A1", header[0], STYLE_HEADER)
        + "".join(text_cell(f"{col}1", text, STYLE_HEADER) for col, text in zip("BCDE", header[1:]))
        + "</row>",
    ]
    for row_index, values in enumerate(rows, start=2):
        lines.append(row_xml(row_index, values, STYLE_BODY))
    lines += ["</sheetData>", "</worksheet>", ""]
    return "\n".join(lines)


def styles_xml():
    return "\n".join([
        XML_DECL,
        f'<styleSheet xmlns="{MAIN_NS}">',
        '<fonts count="2">',
        '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>',
        '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>',
        "</fonts>",
        '<fills count="3">',
        '<fill><patternFill patternType="none"/></fill>',
        '<fill><patternFill patternType="gray125"/></fill>',
        '<fill><patternFill patternType="solid">'
        '<fgColor rgb="FF1B4BC4"/><bgColor indexed="64"/></patternFill></fill>',
        "</fills>",
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>',
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
        '<cellXfs count="3">',
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"'
        ' applyFont="1" applyFill="1" applyAlignment="1">'
        '<alignment vertical="top" wrapText="1"/></xf>',
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">'
        '<alignment vertical="top" wrapText="1"/></xf>',
        "</cellXfs>",
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
        "</styleSheet>",
        "",
    ])


def workbook_xml():
    entries = "".join(
        f'<sheet name="{escape(name)}" sheetId="{index}" r:id="rId{index}"/>'
        for index, (name, _, _) in enumerate(SHEETS, start=1)
    )
    return "\n".join([
        XML_DECL,
        f'<workbook xmlns="{MAIN_NS}" xmlns:r="{REL_NS}"><sheets>{entries}</sheets></workbook>',
        "",
    ])


def workbook_rels_xml():
    rels = "".join(
        f'<Relationship Id="rId{index}" Type="{REL_NS}/worksheet"'
        f' Target="worksheets/sheet{index}.xml"/>'
        for index in range(1, len(SHEETS) + 1)
    )
    rels += (
        f'<Relationship Id="rId{len(SHEETS) + 1}" Type="{REL_NS}/styles" Target="styles.xml"/>'
    )
    return "\n".join([XML_DECL, f'<Relationships xmlns="{PKG_REL_NS}">{rels}</Relationships>', ""])


def package_rels_xml():
    return "\n".join([
        XML_DECL,
        f'<Relationships xmlns="{PKG_REL_NS}"><Relationship Id="rId1"'
        f' Type="{REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        "",
    ])


def content_types_xml():
    overrides = "".join(
        '<Override PartName="/xl/worksheets/sheet{0}.xml" ContentType="application/'
        'vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'.format(index)
        for index in range(1, len(SHEETS) + 1)
    )
    return "\n".join([
        XML_DECL,
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/'
        'vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        overrides,
        '<Override PartName="/xl/styles.xml" ContentType="application/'
        'vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
        "</Types>",
        "",
    ])


def package_parts():
    """ZIP entry 顺序固定，先写 OPC 骨架，再按 sheet 顺序写表。"""
    parts = [
        ("[Content_Types].xml", content_types_xml()),
        ("_rels/.rels", package_rels_xml()),
        ("xl/workbook.xml", workbook_xml()),
        ("xl/_rels/workbook.xml.rels", workbook_rels_xml()),
        ("xl/styles.xml", styles_xml()),
    ]
    parts += [
        (f"xl/worksheets/sheet{index}.xml", sheet_xml(locale))
        for index, (_, locale, _) in enumerate(SHEETS, start=1)
    ]
    return [(name, text.encode("utf-8")) for name, text in parts]


def build_workbook_bytes():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED, compresslevel=COMPRESS_LEVEL) as archive:
        for name, data in package_parts():
            info = zipfile.ZipInfo(name, date_time=ZIP_EPOCH)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 0  # 宿主字段固定，Windows/Unix 生成同一份字节
            info.external_attr = 0
            archive.writestr(info, data)
    return buffer.getvalue()


def first_difference(current, rebuilt):
    for offset in range(min(len(current), len(rebuilt))):
        if current[offset] != rebuilt[offset]:
            return offset
    return min(len(current), len(rebuilt))


def main(argv):
    mode = argv[1] if len(argv) > 1 else "--write"
    if mode not in ("--write", "--check"):
        print(f"用法: {Path(__file__).name} [--write|--check]")
        return 2
    rebuilt = build_workbook_bytes()
    if mode == "--check":
        if not OUTPUT.is_file():
            print(f"FAIL 文件缺失: {OUTPUT.relative_to(ROOT)}")
            return 1
        current = OUTPUT.read_bytes()
        if current == rebuilt:
            print(f"OK {OUTPUT.relative_to(ROOT)} 与字典重算逐字节一致（{len(rebuilt)} B）")
            return 0
        offset = first_difference(current, rebuilt)
        print(
            f"FAIL {OUTPUT.relative_to(ROOT)} 与重算不一致：首个差异字节 {offset}"
            f"（磁盘 {len(current)} B / 重算 {len(rebuilt)} B）"
        )
        return 1
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(rebuilt)
    print(f"OK 写入 {OUTPUT.relative_to(ROOT)} {len(rebuilt)} B，{len(SHEETS)} 个 sheet × {len(ROW_IDS)} 行")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
