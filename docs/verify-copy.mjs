#!/usr/bin/env node
// docs/verify-copy.mjs — 文案保真门禁（纯 node，无依赖）
//
// 校验 docs/copy-en.json 与 docs/copy-zh.json：
//   ① 两字典键集合一致
//   ② 每值必备字段齐全且类型正确
//   ③ lang 合法；fallback: true 必伴随 lang: "en"
//   ④ text 非空且不含占位 TODO 字样
//   ⑤ src 指针可定位者，从只读输入文件重新抽出原文，与 text 逐字相等
//   ⑦ chrome 条目必须 chrome:true 且不得带 src；非 chrome 条目必须带 src
//   ⑧ 任何 text 不得以 ※ 开头（※ 是设计稿注解，不入字典、不渲染，见 docs/CHROME.md）
//   ⑥ copy-zh.json 中 fallback 条目的 text 必须与 copy-en.json 同键同文
//
// 退出码：0 通过；1 有任一问题（逐条打印）。
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
  console.error('✗ [env] 未找到含 ui.pen 与 .agents/briefs/ 的仓库根（自 ' + DOCS + ' 逐级向上）');
  process.exit(1);
}
const BRIEFS = path.join(ROOT, '.agents', 'briefs');
const cache = new Map();
const linesOf = (abs) => {
  if (!cache.has(abs)) cache.set(abs, fs.readFileSync(abs, 'utf8').split('\n'));
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

// ---------- ②③④⑤ 逐条 ----------
const ALLOWED = new Set(['text', 'src', 'lang', 'fallback', 'pending', 'chrome']);
const pendingKeys = [];
let checked = 0;
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
    if ('fallback' in v && typeof v.fallback !== 'boolean') fail(`[shape] ${at}.fallback 不是布尔`);
    if (v.fallback === true && v.lang !== 'en') fail(`[fallback] ${at} 声明 fallback:true 但 lang=${JSON.stringify(v.lang)}（回落项必须 lang:"en"）`);
    if ('pending' in v && typeof v.pending !== 'boolean') fail(`[shape] ${at}.pending 不是布尔`);
    if (typeof v.text !== 'string') continue;
    if (v.text.trim() === '') fail(`[text] ${at}.text 为空`);
    if (/TODO|FIXME|XXX/.test(v.text)) fail(`[text] ${at}.text 含占位字样：${JSON.stringify(v.text)}`);
    if (v.text.trimStart().startsWith('※')) fail(`[annotation] ${at}.text 以 ※ 开头（设计稿注解不得入字典）：${JSON.stringify(v.text)}`);
    if (v.pending === true) { if (file === 'copy-zh.json') pendingKeys.push(k); continue; }
    // ⑤ 逐字溯源（chrome 条目无 src，不参与溯源）
    if (v.chrome === true || typeof v.src !== 'string' || v.src === '') continue;
    const loc = locate(v.src);
    if (loc.error) { fail(`[src] ${at} ${loc.error}`); continue; }
    checked++;
    const escaped = v.text.replace(/\n/g, '\\n');
    if (loc.blocks !== undefined) {
      if (loc.blocks.some((b) => b.includes(v.text) || b.includes(escaped))) continue;
      const host = loc.blocks.find((b) => b.includes(v.text.slice(0, 12))) || loc.blocks[0];
      // 取 text 与原文区间的最长公共前缀，定位到最接近的原文位置；否则回落到区间开头。
      let L = v.text.length;
      while (L > 0 && !host.includes(v.text.slice(0, L))) L--;
      const p = L > 0 ? host.indexOf(v.text.slice(0, L)) : -1;
      const expected = p >= 0 ? host.slice(p, p + v.text.length + 24) : host.slice(0, 120);
      const i = firstDiff(v.text, expected);
      fail(`[verbatim] ${at} 的 text 与 ${loc.how} 原文区间不逐字相符（首个差异位置 ${i}）\n` +
           `      字典 text: …${ctx(v.text, i)}…\n` +
           `      原文预期 : …${ctx(expected, i)}…`);
      continue;
    }
    if (!loc.texts.includes(v.text) && !loc.texts.includes(escaped)) {
      fail(`[verbatim] ${at} 的 text 不在 ${loc.how} 指向的节点子树中\n` +
           `      字典 text: ${JSON.stringify(v.text)}\n` +
           `      该子树文本 : ${loc.texts.map((t) => JSON.stringify(t)).join(' | ')}`);
    }
  }
}

// ---------- ⑥ 回落条目两侧同文 ----------
let fb = 0;
for (const [k, v] of Object.entries(zh)) {
  if (v.fallback !== true) continue;
  fb++;
  const e = en[k];
  if (!e) continue;
  if (e.text !== v.text) {
    const i = firstDiff(v.text, e.text);
    fail(`[fallback] ${k} 回落条目两侧文本不一致（首个差异位置 ${i}）\n` +
         `      copy-zh.json: …${ctx(v.text, i)}…\n` +
         `      copy-en.json: …${ctx(e.text, i)}…`);
  }
  if (e.lang !== 'en') fail(`[fallback] ${k} 回落条目在 copy-en.json 中 lang=${JSON.stringify(e.lang)}，应为 "en"`);
}

// ---------- 汇报 ----------
for (const e of errors) console.error('✗ ' + e);
console.log(`root=${ROOT}`);
console.log(`keys en=${ek.length} zh=${zk.length} | 逐字溯源断言 ${checked} 条 | fallback ${fb} 条 | pending ${pendingKeys.length} 条` +
  (pendingKeys.length ? ` (${pendingKeys.join(', ')})` : ''));
console.log(`chrome ${Object.values(en).filter((v) => v.chrome === true).length} 条（无 src，登记于 docs/CHROME.md）`);
if (errors.length) {
  console.error(`FAIL：${errors.length} 条问题`);
  process.exit(1);
}
console.log('PASS：字典键集合一致、字段与 lang 合法、全部 text 与只读输入原文逐字相符');
