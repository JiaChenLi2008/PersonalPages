#!/usr/bin/env node
/*
 * Real-render gate: measures the built site in a real browser instead of in markup.
 *
 * There is no local browser in this container, so the check drives the host Chrome
 * over CDP (http://127.0.0.1:9222) through a tab it opens and closes itself. The page
 * is served by a throwaway static server over http (never file://), because the app
 * resolves assets against a document base.
 *
 * Asserted, on a full matrix of viewport widths × languages:
 *
 *   1. document-level horizontal overflow ≤ 1px (scrollWidth vs clientWidth)
 *   2. the eleven design blocks (nav … footer) all exist and have a non-zero height
 *   3. no element inside the page overflows its own box (scrollWidth > clientWidth)
 *   4. every nav anchor lands its target heading below the sticky bar: after the click
 *      settles, elementFromPoint at the heading's own top-left corner hits the heading
 *      (itself or a descendant), never the bar — the bar wraps on narrow screens, so a
 *      fixed scroll-padding-top leaves the heading under it
 *   5. the Music/Sport placeholder boxes stay out of the accessibility tree
 *      (aria-hidden="true", no role="img") — BLUEPRINT §6.3
 *   6. every `.motion-clip` slot is open once the page has been scrolled through: it has
 *      `is-in` and its computed clip-path no longer holds `100%` — a slot held at
 *      `inset(0 100% 0 0)` has zero area, so the observer feeding it never fires
 *   7. every `<img>`, `loading="lazy"` included, has loaded (naturalWidth > 0) after that
 *      same scroll, an image the fast pass outran being brought into view once — a lazy
 *      image inside a closed slot is never requested at all
 *
 * at 1440 only, the two interactive pieces are exercised for real:
 *
 *   8. the board reveal flips aria-expanded true → false over two clicks and the
 *      panel it controls gains height while open
 *   9. the language toggle rewrites <html lang> and the tab title, persists ?lang=,
 *      and a second click restores the previous language
 *
 * Output: matrix=<w>×<langs> cells_checked=<n> overflow_cells=0 missing_blocks=0
 * offenders=0 clips_checked=<n> clips_closed=0 images_checked=<n> images_unloaded=0,
 * then one line per failed assertion.
 *
 * Usage: node tools/verify-render.mjs      (CDP=http://… to point at another host)
 *
 * Exit: 0 = pass, 1 = an assertion failed, 2 = environment unavailable (no CDP
 * endpoint or the site would not build) — never a silent pass.
 */

import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(REPO, "dist");
const CDP_HTTP = process.env.CDP || "http://127.0.0.1:9222";

const WIDTHS = [320, 375, 600, 900, 901, 1200, 1440];
const LANG_QUERIES = ["", "?lang=en"];
const BLOCK_IDS = ["nav", "hero", "photoband", "index", "scholarly", "elder", "music", "sport", "method", "values", "footer"];

/* Expected probe scale, per cell. The ten `.motion-clip` slots are photo-band's photo (1),
   scholarly's six figure slots (3 JHU puzzles + 2 iGEM + 1 HIR) and elder/music/sport's
   three section figures (3); the fourteen `<img>` are the ten photos inside those slots plus
   Index's four thumbnails. Both are asserted before the per-element loops: over an empty
   probe result those loops pass vacuously, so a probe that measured nothing must fail here. */
const EXPECTED_CLIPS = 10;
const MIN_IMAGES_PER_CELL = 14;

const failures = [];
const fail = (message) => failures.push(message);
const die = (message) => {
  console.error("ENV: " + message);
  process.exit(2);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
if (build.status !== 0) die(`the site did not build (npm run build exit ${build.status}); no render to measure`);

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

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S("Page.enable");
await S("Runtime.enable");

const evalJs = async (expression) => {
  const r = await S("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("evaluate threw: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};

async function load(width, height, query) {
  await S("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: ORIGIN + query });
  const t0 = Date.now();
  for (;;) {
    // The served origin — not the previous document, which is already `complete`.
    const state = await evalJs(`location.origin === ${JSON.stringify(ORIGIN.slice(0, -1))} ? document.readyState : "pending"`).catch(() => "");
    if (state === "complete") break;
    if (Date.now() - t0 > 30000) die(`${ORIGIN + query} never finished loading at width ${width}`);
    await sleep(200);
  }
  await evalJs("document.fonts.ready.then(() => 1)").catch(() => 0);
  await sleep(400);
  if (await evalJs("!!document.querySelector('#nav')").catch(() => false)) return;
  die(`the served build did not render (#nav absent at ${ORIGIN}) — check dist/`);
}

const ANCHOR_IDS = ["scholarly", "elder", "music", "sport"];

/* Anchor landing and placeholder probe (BLUEPRINT §6.2/§6.3). Each nav anchor is clicked
   for real, the smooth scroll is given time to settle, and the target heading's own
   top-left corner is hit-tested: a heading the sticky bar covers is reported as the hit
   element, not as a number. The two placeholder boxes are read the way the accessibility
   tree sees them — attributes only, so the visible placeholder text may stay. */
const A11Y_PROBE = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nav = document.getElementById("nav");
  const describe = (el) =>
    el === null ? "none" : el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className ? "." + String(el.className).split(" ")[0] : "");
  const anchors = [];
  for (const id of ${JSON.stringify(ANCHOR_IDS)}) {
    const link = document.querySelector("#nav a[href='#" + id + "']");
    const section = document.getElementById(id);
    const title = section && (document.getElementById(id + "-title") || section.querySelector("h1, h2, h3"));
    if (!link || !title) {
      anchors.push({ id, error: !link ? "has no nav anchor" : "has no heading to land on" });
      continue;
    }
    link.click();
    /* The smooth scroll does not necessarily start in the first frames after the click, so
       stillness only counts once the page has actually begun to move — otherwise the probe
       samples the pre-click position and reports a heading that is simply off-screen. */
    const startY = window.scrollY;
    let previous = null;
    let moved = false;
    let still = 0;
    for (let i = 0; i < 80 && still < 3; i++) {
      await sleep(50);
      const scrollY = Math.round(window.scrollY);
      moved = moved || scrollY !== startY;
      const now = scrollY + ":" + Math.round(title.getBoundingClientRect().top);
      still = moved && now === previous ? still + 1 : 0;
      previous = now;
    }
    const rect = title.getBoundingClientRect();
    const x = Math.round(rect.left) + 5;
    const y = Math.round(rect.top) + 5;
    const hit = document.elementFromPoint(x, y);
    anchors.push({
      id,
      navH: Math.round(nav.getBoundingClientRect().height),
      padTop: getComputedStyle(document.documentElement).scrollPaddingTop,
      title: describe(title),
      x,
      y,
      hit: describe(hit),
      landed: !!hit && (hit === title || title.contains(hit)) && !nav.contains(hit),
    });
  }
  const placeholders = [];
  for (const selector of ["music__media", "sport__media"]) {
    const box = document.querySelector("." + selector);
    placeholders.push(
      box === null
        ? { selector, error: "is not in the rendered page" }
        : { selector, ariaHidden: box.getAttribute("aria-hidden"), role: box.getAttribute("role"), ariaLabel: box.getAttribute("aria-label") },
    );
  }
  return { anchors, placeholders };
})()`;

/* Mask and lazy-image probe (motion.css devices ①/②). A `.motion-clip` slot is clipped to
   zero area and a `loading="lazy"` image inside it has no visible geometry to be scheduled
   from, so both readings are only meaningful after the page has really been scrolled
   through. A slot that never opens is reported by name, with its clip-path at the time of
   the read — that pair is the whole defect this probe exists for. */
const MOTION_PROBE = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const describe = (el) =>
    el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className ? "." + String(el.className).trim().split(/\\s+/).join(".") : "");
  const clips = [...document.querySelectorAll(".motion-clip")];
  const images = [...document.querySelectorAll("img")];
  const step = Math.round(window.innerHeight * 0.75);
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await sleep(120);
  }
  window.scrollTo(0, document.documentElement.scrollHeight);
  /* Settle inside 1s: the mask sweep is --dur-slow (600ms) and the observer fires a frame or
     two after the scroll stops, so poll rather than sleep the whole budget every cell. */
  const opened = () => clips.every((el) => el.classList.contains("is-in") && !/100%/.test(getComputedStyle(el).clipPath));
  for (let i = 0; i < 10 && !opened(); i++) await sleep(100);
  /* A pass this fast can outrun the browser's lazy-load scheduler, so every image still at
     naturalWidth 0 gets its own chance: centred in the viewport, then read. What is left
     after that cannot load at all — a closed mask slot gives its photo no visible area to
     be scheduled from. */
  for (const img of images) {
    if (img.naturalWidth > 0) continue;
    img.scrollIntoView({ block: "center" });
    await sleep(250);
  }
  const loaded = () => images.every((img) => img.naturalWidth > 0);
  for (let i = 0; i < 20 && !loaded(); i++) await sleep(100);
  return {
    clips: clips.map((el) => ({ sel: describe(el), isIn: el.classList.contains("is-in"), clipPath: getComputedStyle(el).clipPath })),
    images: images.map((img) => ({
      file: (img.currentSrc || img.getAttribute("src") || "").split("/").pop(),
      naturalWidth: img.naturalWidth,
      loading: img.getAttribute("loading"),
    })),
  };
})()`;

const PROBE = `(() => {
  const de = document.documentElement;
  const blocks = {};
  for (const id of ${JSON.stringify(BLOCK_IDS)}) {
    const el = document.getElementById(id);
    blocks[id] = el ? Math.round(el.getBoundingClientRect().height) : null;
  }
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const ovf = el.scrollWidth - el.clientWidth;
    if (ovf > 1 && el.clientWidth > 0) {
      offenders.push({ tag: el.tagName, cls: String(el.className || "").slice(0, 40), ovf, w: Math.round(el.clientWidth), x: Math.round(el.getBoundingClientRect().x), text: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40) });
      if (offenders.length >= 8) break;
    }
  }
  return { lang: de.lang, scrollW: de.scrollWidth, clientW: de.clientWidth, blocks, offenders };
})()`;

const cells = [];
for (const width of WIDTHS) {
  for (const query of LANG_QUERIES) {
    await load(width, 900, query);
    cells.push({ width, query, ...(await evalJs(PROBE)), a11y: await evalJs(A11Y_PROBE), motion: await evalJs(MOTION_PROBE) });
  }
}

let overflowCells = 0;
let missingBlocks = 0;
let offenders = 0;
let anchorsChecked = 0;
let anchorMisses = 0;
let placeholdersChecked = 0;
let placeholderFailures = 0;
let clipsChecked = 0;
let clipsClosed = 0;
let imagesChecked = 0;
let imagesUnloaded = 0;
for (const cell of cells) {
  const label = `width=${cell.width} lang=${cell.query || "default"}`;
  const overflow = cell.scrollW - cell.clientW;
  if (overflow > 1) {
    overflowCells++;
    fail(`${label}: horizontal overflow ${overflow}px (scrollWidth=${cell.scrollW} clientWidth=${cell.clientW})`);
  }
  for (const id of BLOCK_IDS) {
    const h = cell.blocks[id];
    if (h === null || h <= 0) {
      missingBlocks++;
      fail(`${label}: block #${id} ${h === null ? "missing" : `has height ${h}`}`);
    }
  }
  if (cell.offenders.length) {
    offenders += cell.offenders.length;
    for (const o of cell.offenders) fail(`${label}: ${o.tag}.${o.cls} overflows its box by ${o.ovf}px (w=${o.w} x=${o.x} text=${JSON.stringify(o.text)})`);
  }
  for (const anchor of cell.a11y.anchors) {
    if (anchor.error) {
      anchorMisses++;
      fail(`${label}: anchor #${anchor.id} ${anchor.error}`);
      continue;
    }
    anchorsChecked++;
    if (!anchor.landed) {
      anchorMisses++;
      fail(
        `${label}: anchor #${anchor.id} leaves ${anchor.title} at y=${anchor.y - 5} under the bar ` +
          `(bar ${anchor.navH}px, scroll-padding-top ${anchor.padTop}); elementFromPoint(${anchor.x}, ${anchor.y}) hit ${anchor.hit}`,
      );
    }
  }
  for (const box of cell.a11y.placeholders) {
    if (box.error) {
      placeholderFailures++;
      fail(`${label}: .${box.selector} ${box.error}`);
      continue;
    }
    placeholdersChecked++;
    if (box.ariaHidden !== "true" || box.role !== null || box.ariaLabel !== null) {
      placeholderFailures++;
      fail(
        `${label}: .${box.selector} must stay out of the accessibility tree (BLUEPRINT §6.3): ` +
          `aria-hidden=${JSON.stringify(box.ariaHidden)} role=${JSON.stringify(box.role)} aria-label=${JSON.stringify(box.ariaLabel)}`,
      );
    }
  }
  const probeClips = cell.motion.clips;
  const probeImages = cell.motion.images;
  if (probeClips.length !== EXPECTED_CLIPS) {
    fail(
      `${label}: probe found ${probeClips.length} .motion-clip slots, expected ${EXPECTED_CLIPS} ` +
        "(photo-band 1 + scholarly 6 + elder/music/sport 3)",
    );
  }
  if (probeImages.length < MIN_IMAGES_PER_CELL) {
    fail(
      `${label}: probe found ${probeImages.length} <img>, expected at least ${MIN_IMAGES_PER_CELL} ` +
        "(the ten clip photos + Index's four thumbnails)",
    );
  }
  for (const [slot, least] of [
    ["photo-band__media", 1],
    ["scholarly__clip", 6],
  ]) {
    const named = probeClips.filter((clip) => clip.sel.includes(slot)).length;
    if (named < least) {
      fail(`${label}: probe found ${named} .${slot} slot(s), expected at least ${least}`);
    }
  }
  for (const clip of cell.motion.clips) {
    clipsChecked++;
    if (clip.isIn && !/100%/.test(clip.clipPath)) continue;
    clipsClosed++;
    fail(`${label}: ${clip.sel} never opened after the scroll (is-in=${clip.isIn}, clip-path=${clip.clipPath})`);
  }
  for (const image of cell.motion.images) {
    imagesChecked++;
    if (image.naturalWidth > 0) continue;
    imagesUnloaded++;
    fail(`${label}: <img> ${image.file} did not load (naturalWidth=0, loading=${image.loading})`);
  }
}

/* ---------- the interactive pieces, at the desktop width only ---------- */
await load(1440, 1000, "");
const revealBefore = await evalJs(`(() => {
  const t = document.querySelector("[aria-expanded]");
  return t ? { txt: (t.textContent || "").trim().slice(0, 28), expanded: t.getAttribute("aria-expanded") } : null;
})()`);
if (!revealBefore) {
  fail("1440: no [aria-expanded] reveal trigger in the rendered page");
} else {
  const clickReveal = `(() => {
    const t = document.querySelector("[aria-expanded]");
    const panel = document.getElementById(t.getAttribute("aria-controls"));
    const before = panel.getBoundingClientRect().height;
    t.click();
    return new Promise((r) => setTimeout(() => r({ expanded: t.getAttribute("aria-expanded"), before: Math.round(before), after: Math.round(panel.getBoundingClientRect().height) }), 700));
  })()`;
  const open = await evalJs(clickReveal);
  const closed = await evalJs(clickReveal);
  if (!(revealBefore.expanded === "false" && open.expanded === "true" && closed.expanded === "false"))
    fail(`1440: reveal aria-expanded did not flip false→true→false (${revealBefore.expanded} / ${open.expanded} / ${closed.expanded})`);
  if (open.after <= open.before) fail(`1440: reveal panel did not grow on open (${open.before}px → ${open.after}px)`);
}

const toggles = await evalJs(`document.querySelectorAll("button[aria-pressed]").length`);
if (!toggles) {
  fail("1440: no button[aria-pressed] language toggle in the rendered page");
} else {
  const SNAP = `({ lang: document.documentElement.lang, title: document.title, nav1: (document.querySelector("#nav a") || {}).textContent, search: location.search })`;
  const before = await evalJs(SNAP);
  const clickOther = `(() => {
    const t = [...document.querySelectorAll("button[aria-pressed]")].find((b) => b.getAttribute("aria-pressed") === "false");
    if (!t) return { err: "no unpressed toggle button" };
    t.click();
    return new Promise((r) => setTimeout(() => r(${SNAP}), 700));
  })()`;
  const switched = await evalJs(clickOther);
  const restored = await evalJs(clickOther);
  if (switched.err) fail(`1440: ${switched.err}`);
  else {
    if (switched.lang === before.lang) fail(`1440: toggle click left <html lang> at ${before.lang}`);
    if (switched.title === before.title) fail("1440: toggle click left the tab title unchanged");
    if (!/lang=/.test(switched.search || "")) fail(`1440: toggle click did not persist ?lang= in the URL (search=${JSON.stringify(switched.search)})`);
    if (restored.lang !== before.lang || restored.nav1 !== before.nav1)
      fail(`1440: second toggle click did not restore ${before.lang}/${before.nav1} (got ${restored.lang}/${restored.nav1})`);
  }
}

/* ---------- report + teardown ---------- */
await send("Target.closeTarget", { targetId }).catch(() => {});
ws.close();
server.close();

console.log(`matrix=${WIDTHS.length}x${LANG_QUERIES.length} cells_checked=${cells.length} overflow_cells=${overflowCells} missing_blocks=${missingBlocks} offenders=${offenders} clips_checked=${clipsChecked} clips_closed=${clipsClosed} images_checked=${imagesChecked} images_unloaded=${imagesUnloaded}`);
console.log(`anchors_checked=${anchorsChecked} anchor_misses=${anchorMisses} placeholders_checked=${placeholdersChecked} placeholder_failures=${placeholderFailures}`);
for (const f of failures) console.log(" - " + f);
process.exit(failures.length ? 1 : 0);
