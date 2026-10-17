#!/usr/bin/env node
// docs/verify-copy.mjs — 文案保真门禁（纯 node，无依赖）
//
// 校验 docs/copy-en.json 与 docs/copy-zh.json：
//   ① 两字典键集合一致
//   ② 每值必备字段齐全且类型正确
//   ③ lang 合法（"en" / "zh-Hans"）
//   ④ text 非空且不含占位 TODO 字样
//   ⑤ 溯源：src 指针必须可定位；材料语言那一侧的 text 必须与原文区间逐字相等
//   ⑥ 译文侧（材料语言 ≠ 该侧语言）：同一 src 槽位 + 原文侧逐字相符 + 两侧文本互异
//      —— 单语纯度下每个显示槽位两侧都要有本语言文本（BLUEPRINT §6.4 / lang-purity-ruling.md），
//      所以「照抄原文」与「只写一侧」一样是缺陷；译文语义由翻译方针的人工抽检负责，机器只查结构。
//   ⑥' 材料原文本身中英混排/全半角标点混用的槽位（下 MIXED_MATERIAL 逐条登记）：两侧按译文方针
//      §3/§5 各写本语言文本后都不可能逐字等于原文，改用「覆盖率」作下限——每侧 text 按标点折叠后
//      从左到右贪心取 ≥8 字的最长命中片段，两侧覆盖率之和须 ≥0.75（且最长片段 ≥8 字）。
//   ⑦ chrome 条目必须 chrome:true 且不得带 src；非 chrome 条目必须带 src
//   ⑧ 任何 text 不得以 ※ 开头（※ 是设计稿注解，不入字典、不渲染，见 docs/CHROME.md）
//
// 退出码：0 通过；1 有任一问题（逐条打印）；2 缺仓外只读输入（单行 UNAVAILABLE，非断言失败）。
//
// src 指针文法（见 docs/BLUEPRINT.md §2.10）：
//   content-brief.md#段[N] / layout-brief.md#段[N]   → 段区间原文
//   design-system.md#<Anchor>                        → 该小节标题至下一标题之间
//   hir-essay.md#pN                                  → 第 N 页区间（p0 = 文首导言区）
//   uirpen#<A.B.C>                                   → ui.pen 中按节点名逐段定位的子树文本
//
// 换行：设计稿原文中的两行标题在字典中记为真实换行，在 brief 中记为字面 \n，两种写法均接受。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCS = path.dirname(fileURLToPath(import.meta.url));
const errors = [];
const fail = (msg) => errors.push(msg);

// ---------- 输入定位：自 docs/ 向上找同时含 ui.pen 与 .agents/briefs/content-brief.md 的目录 ----------
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'ui.pen')) &&
        fs.existsSync(path.join(dir, '.agents', 'briefs', 'content-brief.md'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const ROOT = findRoot(DOCS);
if (!ROOT) {
  console.error('UNAVAILABLE: ui.pen + .agents/briefs — 未找到含二者的仓库根（自 ' + DOCS +
                ' 逐级向上）；该门禁需要仓库上级目录');
  process.exit(2);
}
const BRIEFS = path.join(ROOT, '.agents', 'briefs');
const cache = new Map();
const linesOf = (abs) => {
  if (!cache.has(abs)) {
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch (error) {
      console.error('UNAVAILABLE: ' + abs + ' — 仓外只读输入不可读（' + error.code +
                    '）；该门禁需要仓库上级目录的 .agents/briefs/**');
      process.exit(2);
    }
    cache.set(abs, text.split('\n'));
  }
  return cache.get(abs);
};

// ---------- 原文区间抽取 ----------
// 段[N] 的「原文区间」= 所有提到该段号的 markdown 块（空行分隔）之并集。
// 摘要类 brief 会在多处复述同一个段号（标题枚举、表格行、正文标记），故取并集；
// 断言为「该并集内的逐字子串」，任一字符改动即失败。
function paraBlocks(lines, n) {
  const marker = `段[${n}]`;
  const blocks = [];
  for (let i = 0; i < lines.length; ) {
    if (lines[i].trim() === '') { i++; continue; }
    let j = i;
    while (j < lines.length && lines[j].trim() !== '') j++;
    const block = lines.slice(i, j).join('\n');
    if (block.includes(marker)) blocks.push(block);
    i = j;
  }
  return blocks.length ? blocks : null;
}
function regionOf(lines, anchor) {
  const isHeading = (l) => /^#{2,4} /.test(l);
  const start = lines.findIndex((l) => isHeading(l) && l.includes(anchor));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (isHeading(lines[i])) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}
function pageRegion(lines, n) {
  if (n === 0) {
    const end = lines.findIndex((l) => /^### Page /.test(l));
    return lines.slice(0, end < 0 ? lines.length : end).join('\n');
  }
  const start = lines.findIndex((l) => new RegExp(`^### Page ${n}\\b`).test(l));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^### Page /.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}
function uiPenSubtreeTexts(pointer) {
  if (!uiPenSubtreeTexts.doc) {
    uiPenSubtreeTexts.doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui.pen'), 'utf8'));
  }
  const segs = pointer.split('.');
  // 按名字逐段下沉；无名中间层（pen.dev 的匿名 frame）自动跳过。
  const find = (node, i) => {
    if (i === segs.length) return node;
    for (const c of node.children || []) {
      if (c.name === segs[i]) {
        const hit = find(c, i + 1);
        if (hit) return hit;
      }
      const deep = find(c, i);
      if (deep) return deep;
    }
    return null;
  };
  let node = null;
  for (const root of uiPenSubtreeTexts.doc.children || []) {
    node = find(root, 0);
    if (node) break;
  }
  if (!node) return null;
  const out = [];
  const walk = (n) => {
    if (n.type === 'text') out.push(n.content);
    for (const c of n.children || []) walk(c);
  };
  walk(node);
  return out;
}

function locate(src) {
  const [file, frag = ''] = src.split('#');
  if (file === 'content-brief.md' || file === 'layout-brief.md') {
    const m = /^段\[(\d+)\]$/.exec(frag);
    if (!m) return { error: `src 片段不可解析：${src}` };
    const blocks = paraBlocks(linesOf(path.join(BRIEFS, file)), m[1]);
    return blocks ? { blocks, how: `${file}#段[${m[1]}]` } : { error: `src 段号在 ${file} 中不存在：${src}` };
  }
  if (file === 'design-system.md') {
    const region = regionOf(linesOf(path.join(BRIEFS, file)), frag);
    return region ? { blocks: [region], how: src } : { error: `src 小节在 design-system.md 中不存在：${src}` };
  }
  if (file === 'hir-essay.md') {
    const m = /^p(\d+)$/.exec(frag);
    if (!m) return { error: `src 片段不可解析：${src}` };
    const region = pageRegion(linesOf(path.join(BRIEFS, file)), Number(m[1]));
    return region ? { blocks: [region], how: src } : { error: `src 页号在 hir-essay.md 中不存在：${src}` };
  }
  if (file === 'uirpen') {
    const texts = uiPenSubtreeTexts(frag);
    return texts ? { texts, how: src } : { error: `src 节点路径在 ui.pen 中不可定位：${src}` };
  }
  return { error: `src 文件不在受支持的可定位列表内：${src}` };
}

const firstDiff = (a, b) => {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
};
const ctx = (s, i) => s.slice(Math.max(0, i - 24), i + 24).replace(/\n/g, '\\n');

/** 该原文区间（或 ui.pen 节点子树）是否逐字包含 text；字面 \\n 写法同样接受。 */
const regionCarries = (loc, text) => {
  const escaped = text.replace(/\n/g, '\\n');
  return loc.blocks !== undefined
    ? loc.blocks.some((b) => b.includes(text) || b.includes(escaped))
    : loc.texts.includes(text) || loc.texts.includes(escaped);
};

/** 逐字差异诊断：本侧 text 与该区间最接近的原文片段。 */
function verbatimDiff(loc, text) {
  const host = loc.blocks !== undefined
    ? (loc.blocks.find((b) => b.includes(text.slice(0, 12))) || loc.blocks[0])
    : loc.texts.join(' | ');
  // 取 text 与原文区间的最长公共前缀，定位到最接近的原文位置；否则回落到区间开头。
  let L = text.length;
  while (L > 0 && !host.includes(text.slice(0, L))) L--;
  const p = L > 0 ? host.indexOf(text.slice(0, L)) : -1;
  const expected = p >= 0 ? host.slice(p, p + text.length + 24) : host.slice(0, 120);
  const i = firstDiff(text, expected);
  return `（首个差异位置 ${i}）\n` +
    `      字典 text: …${ctx(text, i)}…\n` +
    `      原文预期 : …${ctx(expected, i)}…`;
}

// ---------- 读字典 ----------
const readJson = (f) => {
  const abs = path.join(DOCS, f);
  if (!fs.existsSync(abs)) { fail(`[file] 缺少文件 docs/${f}`); return null; }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    fail(`[json] docs/${f} 不是合法 JSON：${e.message}`);
    return null;
  }
};
const en = readJson('copy-en.json');
const zh = readJson('copy-zh.json');
if (!en || !zh) { errors.forEach((e) => console.error('✗ ' + e)); process.exit(1); }

// ---------- ① 键集合 ----------
const ek = Object.keys(en), zk = Object.keys(zh);
const onlyEn = ek.filter((k) => !(k in zh));
const onlyZh = zk.filter((k) => !(k in en));
if (onlyEn.length) fail(`[keys] copy-zh.json 缺少 ${onlyEn.length} 个键：${onlyEn.join(', ')}`);
if (onlyZh.length) fail(`[keys] copy-en.json 缺少 ${onlyZh.length} 个键：${onlyZh.join(', ')}`);

// ---------- ②③④⑤⑥ 逐条 ----------
const ALLOWED = new Set(['text', 'src', 'lang', 'chrome']);

/* 材料原文中英混排（或全半角标点混用）的槽位：原文自己就违反译文方针 §3「有通行译名一律译出」/
   §5「不得中英混排同句、标点随语言」，两侧各写本语言文本后都不可能逐字等于原文。逐条登记，
   并用「覆盖率」作为溯源下限；未登记的新槽位一律按逐字规则失败。 */
const MIXED_MATERIAL = new Set([
  'photoband.figcap',      // 原文：FIG. 01 — 实验台 / 21:9 plate
  'photoband.altnote',     // 原文：alt: 实验室研究场景 · WebP · lazy · 固定宽高比
  'scholarly-igem.title',  // 原文：iGEM Project；probotic therapy for Parkinson's treatment
  'scholarly-jhu.q1',      // 原文：Hello，I look like a three, guess what am I?
  'scholarly-jhu.q2',      // 原文：Hello, I may look like a bone-in lamp leg huh？…
  'scholarly-hir.title',   // 原文：HIR writing contest-哈佛国际评论学术写作竞赛
  'footer.legal',          // 原文：© 2026 林知远 · 占位\nBIOLOGY / MEDICINE / MUSIC / SPORT
]);

/** 混排槽位的溯源下限。原文区间按标点折叠后（全角标点折成 ASCII、标点周围空白去掉、换行统一写法），
    每侧 text 各自从左到右贪心扫描：每步取「在该侧当前位置起、能在折叠后的原文区间里命中」的最长片段
    （长度须 ≥ TRACE_RUN），累加命中字符数；该侧覆盖率 = 命中字符数 / 该侧字符数。两侧文本长度不同
    （译文通常更短），故槽位覆盖率 = 两侧覆盖率之和，要求 Σ ≥ COVERAGE_MIN 且最长单片段 ≥ TRACE_RUN 字。
    旧判据「任一侧含 TRACE_RUN 字连续原文片段」保留一小段即可改写其余全部，故换成覆盖率。 */
const TRACE_RUN = 8;
const COVERAGE_MIN = 0.75;

/** 全角标点 -> EN 模式要求的 ASCII 标点；两侧标点随各自语言，折叠后方可比较。 */
const WIDE_TO_ASCII = {
  '，': ',',
  '；': ';',
  '：': ':',
  '？': '?',
  '！': '!',
  '、': ',',
  '（': '(',
  '）': ')',
  '—': '-',
};

/** 原文区间与 text 的公共折叠写法：全角标点折成 ASCII、标点周围空白去掉、字面 \\n 与真实换行统一。 */
const foldPunctuation = (text) =>
  text
    .replace(/\n/g, '\\n')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[，；：？！、（）—]/g, (mark) => WIDE_TO_ASCII[mark])
    .replace(/\s*([,;:.?!])\s*/g, '$1');

/** 一侧 text 的覆盖率读数；longest = 该侧最长命中片段。 */
function traceCoverage(side, region) {
  let matched = 0;
  let longest = 0;
  for (let i = 0; i < side.length; ) {
    let run = 0;
    for (let length = side.length - i; length >= TRACE_RUN; length--) {
      if (region.includes(side.slice(i, i + length))) {
        run = length;
        break;
      }
    }
    if (run === 0) {
      i += 1;
      continue;
    }
    matched += run;
    longest = Math.max(longest, run);
    i += run;
  }
  return { coverage: side === '' ? 0 : matched / side.length, longest };
}

/** 混排槽位的判据读数：两侧覆盖率之和与最长单片段。 */
function mixedCoverage(loc, texts) {
  const region = foldPunctuation((loc.blocks !== undefined ? loc.blocks : loc.texts).join('\n'));
  const sides = texts.map((text) => traceCoverage(foldPunctuation(text), region));
  return {
    coverage: sides.reduce((sum, side) => sum + side.coverage, 0),
    longest: sides.reduce((max, side) => Math.max(max, side.longest), 0),
  };
}

/** checked = 本侧 text 就是 src 原文；translated = 原文侧逐字相符而本侧是其译文。 */
let checked = 0;
let translated = 0;
let mixed = 0;
/** k -> 覆盖率读数；汇报行里逐条贴出，便于复核七个登记槽位离阈值多远。 */
const mixedUsed = new Map();
for (const [file, dict] of [['copy-en.json', en], ['copy-zh.json', zh]]) {
  for (const [k, v] of Object.entries(dict)) {
    const at = `${file}:${k}`;
    if (v === null || typeof v !== 'object' || Array.isArray(v)) { fail(`[shape] ${at} 的值不是对象`); continue; }
    for (const key of Object.keys(v)) if (!ALLOWED.has(key)) fail(`[shape] ${at} 含未知字段 "${key}"`);
    if (typeof v.text !== 'string') fail(`[shape] ${at}.text 缺失或不是字符串`);
    if ('chrome' in v && typeof v.chrome !== 'boolean') fail(`[shape] ${at}.chrome 不是布尔`);
    if (v.chrome === true) {
      if ('src' in v) fail(`[chrome] ${at} 是 chrome 条目却带 src=${JSON.stringify(v.src)}（chrome 条目不得带 src）`);
    } else if (typeof v.src !== 'string' || v.src.trim() === '') fail(`[shape] ${at}.src 缺失或为空`);
    if (v.lang !== 'en' && v.lang !== 'zh-Hans') fail(`[lang] ${at}.lang 非法：${JSON.stringify(v.lang)}（只允许 "en" / "zh-Hans"）`);
    if (typeof v.text !== 'string') continue;
    if (v.text.trim() === '') fail(`[text] ${at}.text 为空`);
    if (/TODO|FIXME|XXX/.test(v.text)) fail(`[text] ${at}.text 含占位字样：${JSON.stringify(v.text)}`);
    if (v.text.trimStart().startsWith('※')) fail(`[annotation] ${at}.text 以 ※ 开头（设计稿注解不得入字典）：${JSON.stringify(v.text)}`);
    // ⑤⑥ 逐字溯源（chrome 条目无 src，不参与溯源）
    if (v.chrome === true || typeof v.src !== 'string' || v.src === '') continue;
    const loc = locate(v.src);
    if (loc.error) { fail(`[src] ${at} ${loc.error}`); continue; }
    if (regionCarries(loc, v.text)) { checked++; continue; }
    // 本侧不是该区间的原文 ⇒ 它是译文：核对同一槽位的原文侧。
    const other = file === 'copy-en.json' ? zh[k] : en[k];
    if (other === undefined) { fail(`[pair] ${at} 另一份字典无同名键，无法核对译文侧（见①）`); continue; }
    if (other.src !== v.src) {
      fail(`[pair] ${at} 与另一侧同键的 src 不同（${JSON.stringify(v.src)} vs ${JSON.stringify(other.src)}）：同一显示槽位两侧必须指向同一处原文`);
      continue;
    }
    if (!regionCarries(loc, other.text)) {
      const trace = mixedCoverage(loc, [v.text, other.text]);
      if (MIXED_MATERIAL.has(k) && trace.coverage >= COVERAGE_MIN && trace.longest >= TRACE_RUN) {
        mixed++;
        mixedUsed.set(k, trace.coverage);
        continue;
      }
      const otherFile = file === 'copy-en.json' ? 'copy-zh.json' : 'copy-en.json';
      fail(`[verbatim] ${at} 的 text 不在 ${loc.how} 原文区间中，且同键另一侧 ${otherFile} 的 text 也不是该区间原文：该槽位两侧都无原文依据` +
           (MIXED_MATERIAL.has(k)
             ? '（已登记为材料混排槽位：覆盖率 ' + trace.coverage.toFixed(3) + ' / 要求 ≥ ' + COVERAGE_MIN +
               '；最长单片段 ' + trace.longest + ' 字 / 要求 ≥ ' + TRACE_RUN + ' 字）'
             : '') + '\n' +
           `      本侧 text: ${JSON.stringify(v.text)}\n` +
           `      本侧差异: ${verbatimDiff(loc, v.text)}\n` +
           `      另一侧 text: ${JSON.stringify(other.text)}\n` +
           `      另一侧差异: ${verbatimDiff(loc, other.text)}`);
      continue;
    }
    if (other.text === v.text) {
      fail(`[pair] ${at} 与同键另一侧文本相同（该槽位未翻译）：单语纯度要求两侧各写本语言文本`);
      continue;
    }
    translated++;
  }
}

// ---------- 汇报 ----------
for (const e of errors) console.error('✗ ' + e);
console.log(`root=${ROOT}`);
console.log(`keys en=${ek.length} zh=${zk.length} | 原文逐字 ${checked} 条 | 译文侧（同一 src 槽位、两侧互异）${translated} 条 | 材料混排改写 ${mixed} 条（${[...mixedUsed].map(([k, c]) => `${k}=${c.toFixed(3)}`).join(', ')}）`);
console.log(`chrome ${Object.values(en).filter((v) => v.chrome === true).length} 条（无 src，登记于 docs/CHROME.md）`);
if (errors.length) {
  console.error(`FAIL：${errors.length} 条问题`);
  process.exit(1);
}
console.log('PASS：字典键集合一致、字段与 lang 合法、材料侧逐字溯源、译文侧与原文侧同槽位且互异');
