#!/usr/bin/env node
/*
 * Actual-font gate: asserts which family the browser really painted a text node
 * with, instead of trusting the declared CSS stack. Chrome reports this over CDP
 * (CSS.getPlatformFontsForNode) as familyName + isCustomFont, where isCustomFont is
 * true only when the glyphs came from a downloaded webfont — here the self-hosted
 * files in public/fonts/.
 *
 * There is no local browser in this container, so the check drives the host Chrome
 * over CDP (http://127.0.0.1:9222) through a tab it opens and closes itself. The
 * built dist/ is served over http (never file://) because the app resolves assets
 * against a document base.
 *
 * Asserted, at 1440px in the default language:
 *
 *   1. every node whose declared stack starts with a Latin design family
 *      (.hero__title-en, .footer [data-role="T"] for Inter; .scholarly__onum
 *      for IBM Plex Mono) is painted by that family with
 *      isCustomFont true — i.e. the woff2 really was fetched and used, not a fallback
 *   2. the CJK nodes (.hero__title-cn, .scholarly__qtext) are painted by a system CJK
 *      family with isCustomFont false, never by Inter or IBM Plex Mono
 *   3. with Emulation.setScriptExecutionDisabled the page still shows the <noscript>
 *      notice, and with scripting on that notice is not rendered
 *
 * Proves: the family the browser actually selected per listed node, that the
 * self-hosted files loaded, and that the no-JS fallback text is visible without JS.
 * Does not prove: that the glyph shapes or the rasterised weight match the design,
 * italics, hinting, that the woff2 bytes equal upstream, or anything about a real
 * device, another browser, or the copy served from Pages. The faces are the Latin
 * subset, so non-Latin characters (arrows, CJK) inside a Latin-family node legitimately
 * fall back to a system font; only the nodes listed above are judged.
 *
 * Usage: node tools/verify-fonts.mjs      (CDP=http://… to point at another host)
 *
 * Output: one line per asserted selector with declared stack / actual familyName /
 * isCustomFont, then a checked/… summary; failures print their raw values.
 *
 * Exit: 0 = pass, 1 = an assertion failed, 2 = environment unavailable (no CDP
 * endpoint at $CDP, or the site would not build) — never a silent pass.
 */

import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(REPO, "dist");
const CDP_HTTP = process.env.CDP || "http://127.0.0.1:9222";

/** Latin nodes: the family the design declares first, and the selectors gated on it. */
const LATIN_NODES = [
  { family: "Inter", selectors: [".hero__title-en", '.footer [data-role="T"]'] },
  /** `.hero__eyebrow` 由 docx-1027 删除，抽样随之退役（docx-1028 收官）。 */
  { family: "IBM Plex Mono", selectors: [".scholarly__onum"] },
];
/** CJK nodes: must stay on a system CJK face, never on the two Latin families. */
const CJK_SELECTORS = [".scholarly__qtext"];
/** Zh-only nodes: single-side rendering keeps these out of the en DOM, so they need their
    own tab at `?lang=zh-Hans`. Probing them on the en page always reported `no such element`. */
const CJK_SELECTORS_ZH = [".hero__title-cn"];
const CJK_FAMILY = /CJK|Han|PingFang|Hiragino|Heiti|Songti|YaHei|SimSun|WenQuanYi|Droid Sans Fallback/i;
/** The <noscript> notice in index.html, asserted in both languages it is written in. */
const NOSCRIPT_TEXT = ["此站点需要启用 JavaScript", "requires JavaScript"];

const failures = [];
const fail = (message) => failures.push(message);
const die = (message) => {
  console.error(`UNAVAILABLE: ${message}`);
  process.exit(2);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Static instances carry their weight in the family name (Inter Black = Inter 900). */
const belongsTo = (reported, family) => reported === family || reported.startsWith(family + " ");

/* ---------- serve the build (waiting happens here, not in the shell) ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".pdf": "application/pdf",
};

async function serveDist() {
  const server = createServer(async (req, res) => {
    const rel = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^\/+/, "");
    const file = join(DIST, rel === "" ? "index.html" : rel);
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return server;
}

/* ---------- build ---------- */
const build = spawnSync("npm", ["run", "build"], { cwd: REPO, stdio: ["ignore", "pipe", "inherit"] });
if (build.status !== 0) die(`the site did not build (npm run build exit ${build.status}); no fonts to check`);

const server = await serveDist();
const ORIGIN = `http://127.0.0.1:${server.address().port}/`;

/* ---------- CDP ---------- */
let version;
try {
  const res = await fetch(CDP_HTTP + "/json/version");
  version = await res.json();
} catch (err) {
  server.close();
  die(`no CDP endpoint at ${CDP_HTTP} (host browser not running): ${err.message}`);
}

const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = () => rej(new Error("CDP websocket refused"));
}).catch((err) => die(err.message));

let seq = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (!msg.id) return;
  const entry = pending.get(msg.id);
  if (!entry) return;
  pending.delete(msg.id);
  clearTimeout(entry.timer);
  msg.error ? entry.rej(new Error(JSON.stringify(msg.error))) : entry.res(msg.result);
};
function send(method, params = {}, sessionId) {
  const id = ++seq;
  return new Promise((res, rej) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      rej(new Error("CDP timeout: " + method));
    }, 45000);
    pending.set(id, { res, rej, timer });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

/** Open a tab, optionally without script execution, and return its session helpers. */
async function openTab(scriptsEnabled, query = "") {
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  await S("Page.enable");
  await S("Runtime.enable");
  await S("DOM.enable");
  await S("CSS.enable");
  await S("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  if (!scriptsEnabled) await S("Emulation.setScriptExecutionDisabled", { value: true });
  const evalJs = async (expression) => {
    const r = await S("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("evaluate threw: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  await S("Page.navigate", { url: ORIGIN + query });
  for (;;) {
    const state = await evalJs("document.readyState").catch(() => "");
    if (state === "complete") break;
    if (state === "") die("the page could not be evaluated over CDP");
    await sleep(200);
  }
  return { targetId, S, evalJs, close: () => send("Target.closeTarget", { targetId }).catch(() => {}) };
}

/* ---------- 1 + 2: actual family per node ---------- */
const page = await openTab(true);
console.log(`served ${ORIGIN} (chrome ${version.Browser})`);

// A rendered app means the JS actually ran; without it the notes below are meaningless.
if (!(await page.evalJs("!!document.querySelector('#nav')").catch(() => false))) {
  await page.close();
  server.close();
  ws.close();
  die(`the served build did not render (#nav absent at ${ORIGIN}) — check dist/`);
}
await page.evalJs("document.fonts.ready.then(() => 1)").catch(() => 0);
await sleep(400);

const probed = [
  ...LATIN_NODES.flatMap(({ family, selectors }) => selectors.map((selector) => ({ selector, wantFamily: family, tab: "en" }))),
  ...CJK_SELECTORS.map((selector) => ({ selector, wantFamily: null, tab: "en" })),
  ...CJK_SELECTORS_ZH.map((selector) => ({ selector, wantFamily: null, tab: "zh" })),
];
/** Same probe, run against whichever tab owns the selector's mode. */
const probeStyles = (tab, selectors) =>
  tab.evalJs(`(() => {
  const out = {};
  for (const s of ${JSON.stringify(selectors)}) {
    const el = document.querySelector(s);
    out[s] = el ? { stack: getComputedStyle(el).fontFamily, weight: getComputedStyle(el).fontWeight } : null;
  }
  return out;
})()`);
const zhPage = CJK_SELECTORS_ZH.length ? await openTab(true, "?lang=zh-Hans") : null;
if (zhPage) {
  await zhPage.evalJs("document.fonts.ready.then(() => 1)").catch(() => 0);
  await sleep(400);
}
const declaredEn = await probeStyles(page, probed.filter((p) => p.tab === "en").map((p) => p.selector));
const declaredZh = zhPage ? await probeStyles(zhPage, probed.filter((p) => p.tab === "zh").map((p) => p.selector)) : {};
const declared = { ...declaredEn, ...declaredZh };
/** Which tab owns a selector decides where its DOM root and platform-font query go. */
const tabOf = (selector) => (probed.find((p) => p.selector === selector)?.tab === "zh" ? zhPage : page);
const roots = new Map();
const rootOf = async (tab) => {
  if (!roots.has(tab)) roots.set(tab, (await tab.S("DOM.getDocument", { depth: -1 })).root);
  return roots.get(tab);
};

let latinOk = 0;
let cjkOk = 0;
for (const { selector, wantFamily } of probed) {
  const style = declared[selector];
  const raw = `${selector} | declared=${style ? style.stack : "(no such element)"} | weight=${style ? style.weight : "-"}`;
  if (!style) {
    fail(`${raw} | actual=-`);
    continue;
  }
  const tab = tabOf(selector);
  const root = await rootOf(tab);
  const { nodeId } = await tab.S("DOM.querySelector", { nodeId: root.nodeId, selector }).catch(() => ({ nodeId: 0 }));
  if (!nodeId) {
    fail(`${raw} | actual=- (node not found in the DOM tree)`);
    continue;
  }
  const { fonts } = await tab.S("CSS.getPlatformFontsForNode", { nodeId }).catch((err) => {
    fail(`${raw} | actual=<CSS.getPlatformFontsForNode failed: ${err.message}>`);
    return { fonts: null };
  });
  if (!fonts) continue;
  const actual = fonts.map((f) => `${f.familyName}(isCustomFont=${f.isCustomFont} glyphs=${f.glyphCount})`).join(", ") || "(none reported)";
  console.log(`${raw} | actual=${actual}`);

  if (wantFamily) {
    const painter = fonts.find((f) => belongsTo(f.familyName, wantFamily));
    if (!painter) fail(`${selector}: no ${wantFamily} face painted this node (declared "${style.stack}") — the self-hosted font did not load`);
    else if (painter.isCustomFont !== true) fail(`${selector}: ${painter.familyName} painted it but isCustomFont=${painter.isCustomFont} — fell back to an installed font instead of the self-hosted file`);
    else latinOk++;
  } else {
    const latin = fonts.find((f) => f.isCustomFont === true && (belongsTo(f.familyName, "Inter") || belongsTo(f.familyName, "IBM Plex Mono")));
    const cjk = fonts.find((f) => f.isCustomFont === false && CJK_FAMILY.test(f.familyName));
    if (latin) fail(`${selector}: a Latin design face painted CJK text (${latin.familyName}, declared "${style.stack}")`);
    else if (!cjk) fail(`${selector}: no system CJK face among [${fonts.map((f) => f.familyName).join(", ")}] (declared "${style.stack}")`);
    else cjkOk++;
  }
}

/* ---------- 3: the no-JS fallback ---------- */
const withJs = await page.evalJs(
  "JSON.stringify({ text: document.body.innerText, rootKids: document.getElementById('root').children.length })",
);
const noJsTab = await openTab(false);
let noJs;
try {
  noJs = await noJsTab.evalJs(
    "JSON.stringify({ text: document.body.innerText, rootKids: document.getElementById('root').children.length })",
  );
} catch (err) {
  await noJsTab.close();
  server.close();
  ws.close();
  die(`could not read the no-JS document over CDP: ${err.message}`);
}
await noJsTab.close();
const withJsBody = JSON.parse(withJs);
const noJsBody = JSON.parse(noJs);
console.log(`scripting on  | root_children=${withJsBody.rootKids} | innerText_has_notice=${NOSCRIPT_TEXT.map((t) => withJsBody.text.includes(t))}`);
console.log(`scripting off | root_children=${noJsBody.rootKids} | innerText=${JSON.stringify(noJsBody.text.trim().slice(0, 160))}`);
if (noJsBody.rootKids !== 0) fail(`scripting off: #root still has ${noJsBody.rootKids} children — scripts were not disabled, the no-JS state was not measured`);
for (const text of NOSCRIPT_TEXT) {
  if (!noJsBody.text.includes(text)) fail(`scripting off: body text does not contain ${JSON.stringify(text)} — the <noscript> notice is missing or hidden`);
  if (withJsBody.text.includes(text)) fail(`scripting on: body text still contains ${JSON.stringify(text)} — the <noscript> notice renders with JS too`);
}

/* ---------- report + teardown ---------- */
await page.close();
if (zhPage) await zhPage.close();
ws.close();
server.close();

console.log(
  `checked=${probed.length} latin_custom_ok=${latinOk} cjk_system_ok=${cjkOk} failures=${failures.length}`,
);
for (const f of failures) console.log(" - " + f);
process.exit(failures.length ? 1 : 0);
