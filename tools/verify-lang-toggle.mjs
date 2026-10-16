#!/usr/bin/env node
/*
 * Language-toggle check (lane W6).
 *
 * Renders the whole page in the default mode through the same in-repo SSR path
 * tools/verify-ssr-dom.mjs uses (Vite JS API, virtual entry, `vite build --ssr`), writes
 * the markup to /tmp/lang-toggle-ssr.html, and asserts what only rendered markup can prove:
 *
 *   1. the page opens in en: lang.ts writes `<html lang>` (and the tab title taken
 *      from the dictionary) at import time, and index.html carries lang="en"
 *   2. Nav › Row › Right holds the toggle then Mail: two focusable button[aria-pressed],
 *      labelled verbatim from `nav.lang.zh` / `nav.lang.en`, with the 1×12 hairline between
 *      them and the pressed side on en
 *   3. in that default-mode markup the 13 frozen key pairs of the label/title layer coexist
 *      as ui.pen draws them and single-language purity allows: a single-node pair carries
 *      only its own language's side there (the design renders one variant; the other arrives
 *      by switching, which the browser section below drives item by item); a dual pair
 *      carries both sides, both written in the page's language, because the design shows
 *      both at once. No other language's text may appear (BLUEPRINT §6.4)
 *
 * Output: pairs_checked=13 single=<n> dual=<n> missing=<n>, then one line per missing pair.
 *
 * Usage: node tools/verify-lang-toggle.mjs   (exit 0 = pass, 1 = any failed assertion)
 *
 * Temporary output: /tmp/lang-toggle-ssr-out (rebuilt each run) + /tmp/lang-toggle-ssr.html.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "vite";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = "/tmp/lang-toggle-ssr-out";
const HTML_OUT = "/tmp/lang-toggle-ssr.html";
const ENTRY_ID = "\0virtual:lang-toggle-ssr-entry";
const APP = join(REPO, "src", "App.tsx");

const failures = [];
const fail = (message) => failures.push(message);

/* ---------- build + render ---------- */

const entrySource = `
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from ${JSON.stringify(APP)};

export function renderPage() {
  return renderToStaticMarkup(createElement(App));
}
`;

await build({
  root: REPO,
  logLevel: "warn",
  build: {
    ssr: true,
    outDir: OUT_DIR,
    emptyOutDir: true,
    copyPublicDir: false,
    rollupOptions: { input: ENTRY_ID, output: { entryFileNames: "entry.js" } },
  },
  ssr: { noExternal: true },
  plugins: [
    {
      name: "lang-toggle-ssr-entry",
      resolveId: (id) => (id === ENTRY_ID ? ENTRY_ID : null),
      load: (id) => (id === ENTRY_ID ? entrySource : null),
    },
  ],
});

globalThis.document = { documentElement: {} };
const { renderPage } = await import(pathToFileURL(join(OUT_DIR, "entry.js")).href);
const html = renderPage();
writeFileSync(HTML_OUT, html);

/** Markup text comparisons run on the decoded text: React escapes `&` as `&amp;` etc. */
const decoded = html
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#x27;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const DICT = {
  en: JSON.parse(readFileSync(join(REPO, "docs", "copy-en.json"), "utf8")),
  "zh-Hans": JSON.parse(readFileSync(join(REPO, "docs", "copy-zh.json"), "utf8")),
};
/** The mode the page opens in, i.e. the mode the SSR markup below renders (lang.ts). */
const DEFAULT_MODE = "en";
const OTHER_MODE = { en: "zh-Hans", "zh-Hans": "en" };
/** A key's text in a given page language. */
const text = (lang, key) => DICT[lang][key].text;
/** The tab title a page language shows: hero.h1 / hero.h1cn, newline folded to a space (§5). */
const TITLE = {
  en: text("en", "hero.h1").replace(/\s*\n\s*/g, " "),
  "zh-Hans": text("zh-Hans", "hero.h1cn").replace(/\s*\n\s*/g, " "),
};

/* ---------- markup helpers ---------- */

/** Everything from `<section id="…">` to the next section start (all sections carry an id). */
function sectionOf(id) {
  const start = decoded.indexOf(`<section id="${id}"`);
  if (start < 0) {
    return "";
  }
  const next = decoded.indexOf('<section id="', start + 1);
  return decoded.slice(start, next < 0 ? decoded.length : next);
}

const header = decoded.slice(decoded.indexOf("<header id=\"nav\""), decoded.indexOf("</header>"));
const scope = {
  nav: header,
  hero: sectionOf("hero"),
  index: sectionOf("index"),
  scholarly: sectionOf("scholarly"),
  elder: sectionOf("elder"),
  music: sectionOf("music"),
  sport: sectionOf("sport"),
};

/** Attributes of every `<tag …>` in a markup fragment, as plain objects. */
function tagsOf(markup, name) {
  const attributes = [];
  for (const match of markup.matchAll(new RegExp(`<${name}\\b([^>]*)>`, "g"))) {
    const attrs = {};
    for (const attr of match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attrs[attr[1]] = attr[2];
    }
    attributes.push(attrs);
  }
  return attributes;
}

/* ---------- 1. the page opens in en ---------- */

if (document.documentElement.lang !== DEFAULT_MODE) {
  fail(`<html lang> is ${JSON.stringify(document.documentElement.lang)}, not "${DEFAULT_MODE}"`);
}
if (document.title !== TITLE[DEFAULT_MODE]) {
  fail(
    `document.title is ${JSON.stringify(document.title)}, not the en hero title ` +
      `${JSON.stringify(TITLE[DEFAULT_MODE])}`,
  );
}
const shell = readFileSync(join(REPO, "index.html"), "utf8");
if (!shell.includes(`<html lang="${DEFAULT_MODE}">`)) {
  fail(`index.html does not carry <html lang="${DEFAULT_MODE}"> for the pre-hydration shell`);
}

/* ---------- 2. the toggle in Nav › Row › Right ---------- */

const buttons = tagsOf(header, "button");
const toggle = buttons.filter((attrs) => "aria-pressed" in attrs);
if (toggle.length !== 2) {
  fail(`nav toggle button count ${toggle.length} != 2`);
}
const pressed = [...header.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)]
  .filter((match) => match[1].includes("aria-pressed"))
  .map((match) => ({ attrs: match[1], label: match[2] }));
const zhOption = pressed.find((button) => button.label === text(DEFAULT_MODE, "nav.lang.zh"));
const enOption = pressed.find((button) => button.label === text(DEFAULT_MODE, "nav.lang.en"));
if (pressed.length !== 2 || zhOption === undefined || enOption === undefined) {
  fail(
    `nav toggle labels ${JSON.stringify(pressed.map((button) => button.label))} are not ` +
      `${JSON.stringify([text(DEFAULT_MODE, "nav.lang.zh"), text(DEFAULT_MODE, "nav.lang.en")])}`,
  );
} else {
  if (!enOption.attrs.includes('aria-pressed="true"')) {
    fail("nav toggle: the en option is not the pressed one in the default mode");
  }
  if (!zhOption.attrs.includes('aria-pressed="false"')) {
    fail("nav toggle: the ZH option is not unpressed in the default mode");
  }
  if (!enOption.attrs.includes(`type="button"`)) {
    fail("nav toggle: the en option is not a button[type=button]");
  }
  /* BLUEPRINT §6.4: an element carries lang only when its text is not the page language,
     and both toggle labels are written in the default mode's own language. */
  for (const option of [zhOption, enOption]) {
    if (option.attrs.includes("lang=")) {
      fail(`nav toggle: the ${JSON.stringify(option.label)} label carries lang although it is the page language`);
    }
  }
  const zhAt = header.indexOf(`>${text(DEFAULT_MODE, "nav.lang.zh")}</button>`);
  const divisionAt = header.indexOf("nav__lang-div");
  const enAt = header.indexOf(`>${text(DEFAULT_MODE, "nav.lang.en")}</button>`);
  if (!(zhAt < divisionAt && divisionAt < enAt)) {
    fail("nav toggle: the hairline does not sit between 中 and EN");
  }
  const division = tagsOf(header, "span").find((attrs) => attrs.class === "nav__lang-div");
  if (division === undefined || division["aria-hidden"] !== "true") {
    fail("nav toggle: the hairline is not a decorative (aria-hidden) span");
  }
}

/* ---------- 3. the 13 key pairs of the label/title layer ---------- */

/** single = ui.pen draws one variant, so the other arrives by switching; dual = both drawn. */
const PAIRS = [
  { pair: "nav.item1", kind: "single", where: "nav", zh: "nav.item1.zh", en: "nav.item1.en" },
  { pair: "nav.item2", kind: "single", where: "nav", zh: "nav.item2.zh", en: "nav.item2.en" },
  { pair: "nav.item3", kind: "single", where: "nav", zh: "nav.item3.zh", en: "nav.item3.en" },
  { pair: "nav.item4", kind: "single", where: "nav", zh: "nav.item4.zh", en: "nav.item4.en" },
  { pair: "hero.h1", kind: "dual", where: "hero", zh: "hero.h1cn", en: "hero.h1" },
  { pair: "index.row1.title", kind: "dual", where: "index", zh: "index.row1.title", en: "index.row1.titleEn" },
  { pair: "index.row2.title", kind: "dual", where: "index", zh: "index.row2.title", en: "index.row2.titleEn" },
  { pair: "index.row3.title", kind: "dual", where: "index", zh: "index.row3.title", en: "index.row3.titleEn" },
  { pair: "scholarly.title", kind: "dual", where: "scholarly", zh: "scholarly.title.zh", en: "scholarly.title.en" },
  { pair: "elder.title", kind: "dual", where: "elder", zh: "elder.title.zh", en: "elder.title.en" },
  { pair: "music.title", kind: "dual", where: "music", zh: "music.title", en: "music.titleEn" },
  { pair: "sport.title", kind: "dual", where: "sport", zh: "sport.title", en: "sport.titleEn" },
  {
    pair: "scholarly-igem.cta",
    kind: "dual",
    where: "scholarly",
    zh: "scholarly-igem.cta.zh",
    en: "scholarly-igem.cta.en",
  },
];

let single = 0;
let dual = 0;
let missing = 0;

for (const { pair, kind, where, zh, en } of PAIRS) {
  const markup = scope[where];
  if (kind === "single") {
    single += 1;
  } else {
    dual += 1;
  }
  /* A single pair draws one variant — the page language's own side; a dual pair draws both
     of its sides in the page language (the design shows both, not both languages). */
  const ownKeys = kind === "single" ? [en] : [zh, en];
  const foreignKeys = kind === "single" ? [zh] : [zh, en];
  const own = ownKeys.map((key) => text(DEFAULT_MODE, key));
  const foreign = foreignKeys.map((key) => text(OTHER_MODE[DEFAULT_MODE], key));
  const hasOwn = own.map((value) => markup.includes(value));
  const hasForeign = foreign.map((value) => markup.includes(value));
  if (hasOwn.includes(false) || hasForeign.includes(true)) {
    missing += 1;
    fail(
      `${pair} (${kind}): ${where} markup has own=${JSON.stringify(hasOwn)} foreign=${JSON.stringify(hasForeign)} — ` +
        `expected ${kind === "single" ? "only its own side" : "both sides"} in ${DEFAULT_MODE} ` +
        `and no ${OTHER_MODE[DEFAULT_MODE]} text\n` +
        `      own (${DEFAULT_MODE}): ${JSON.stringify(own)}\n` +
        `      foreign (${OTHER_MODE[DEFAULT_MODE]}): ${JSON.stringify(foreign)}`,
    );
  }
}

console.log(
  `pairs_checked=${PAIRS.length} single=${single} dual=${dual} missing=${missing}`,
);

/* ---------- 4. browser interaction assertions (CDP) ---------- */

/* The toggle's state machine only exists in a browser, so these two scenarios drive the
 * real page through the host Chrome's CDP endpoint (`CDP` env, default 127.0.0.1:9222;
 * WSL reaches it directly and node >= 22 supplies the WebSocket — no dependency is added).
 * The page is served by an in-process Vite dev server rooted at this tree, so the run
 * exercises these sources rather than a stale `dist`. Every checkpoint prints the raw
 * values it read, so the same script before and after a fix compares line by line:
 *
 *   scenario 1 (Back/Forward): ?lang=zh-Hans -> Nav anchor (new history entry) -> EN
 *     (replaceState on the current entry) -> Back: <html lang>, document.title, every one of
 *     the four nav labels (ordinal and §6.4 `lang` marks included), the toggle's aria-pressed,
 *     the two dual head pairs and the head's own copy (description / og:title / og:description)
 *     must all follow the URL's lang=zh-Hans; Forward must put the
 *     whole set back on lang=en. Each checkpoint compares the whole set, so a label pinned to
 *     one mode (say an item that ignores the switch) is reported by name.
 *   scenario 2 (same-value click): storage zh-Hans + ?lang=en -> clicking the already
 *     pressed EN must persist `en`; a later query-less `/` must then render en.
 *
 * An unreachable CDP endpoint is an environment problem, never a silent pass: the script
 * says so and exits 2. */

const CDP_HTTP = process.env.CDP ?? "http://127.0.0.1:9222";
const DEV_PORT = 8807;
const failuresBeforeBrowser = failures.length;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** What the four surfaces must say, per language, taken from the dictionaries. */
/** The static head's language-dependent copy: the switch must carry it (BLUEPRINT §6.4). */
const HEAD_COPY = {
  en: { title: TITLE.en, summary: text("en", "hero.summary") },
  "zh-Hans": { title: TITLE["zh-Hans"], summary: text("zh-Hans", "hero.summary") },
};

const WANT = {
  title: TITLE,
  navFirst: { "zh-Hans": text("zh-Hans", "nav.item1.zh"), en: text("en", "nav.item1.en") },
  toggle: {
    "zh-Hans": `${text("zh-Hans", "nav.lang.zh")}:true ${text("zh-Hans", "nav.lang.en")}:false`,
    en: `${text("en", "nav.lang.zh")}:false ${text("en", "nav.lang.en")}:true`,
  },
};

/** The nav's four links, in the design's order; the zh/en pair of each is in PAIRS above. */
const NAV_LINKS = [
  { id: "scholarly", no: "nav.item1.no", zh: "nav.item1.zh", en: "nav.item1.en" },
  { id: "elder", no: "nav.item2.no", zh: "nav.item2.zh", en: "nav.item2.en" },
  { id: "music", no: "nav.item3.no", zh: "nav.item3.zh", en: "nav.item3.en" },
  { id: "sport", no: "nav.item4.no", zh: "nav.item4.zh", en: "nav.item4.en" },
];

/**
 * The two dual head pairs the browser section drives as well. Their zh side has no element
 * of its own: the design's `Section/Head` draws L (the zh kicker, a chrome key) beside R
 * (the English title) and no Chinese title variant — which is exactly why
 * scholarly.title.zh and elder.title.zh are the dead keys docs/CHROME.md §4 registers.
 */
const HEAD_PAIRS = [
  {
    pair: "scholarly.title",
    zh: "scholarly.title.zh",
    en: "scholarly.title.en",
    kicker: "#scholarly .scholarly__kicker",
    title: "#scholarly .scholarly__title",
  },
  {
    pair: "elder.title",
    zh: "elder.title.zh",
    en: "elder.title.en",
    kicker: "#elder .elder__kicker",
    title: "#elder .elder__title-en",
  },
];

/** The `heads` field of PROBE, built from the very selectors HEAD_PAIRS asserts against. */
const HEAD_PROBE = `{${HEAD_PAIRS.map(
  ({ pair, kicker, title }) =>
    `${JSON.stringify(pair)}: { kicker: label(document.querySelector(${JSON.stringify(kicker)})), ` +
    `title: label(document.querySelector(${JSON.stringify(title)})) }`,
).join(", ")}}`;

/** Raw values of every surface the two scenarios compare, read in one round trip. */
const PROBE = `(() => {
  const label = (el) => (el === null ? null : el.textContent.trim());
  const langOf = (el) => (el === null ? null : el.getAttribute("lang"));
  const option = (button) => label(button) + ":" + button.getAttribute("aria-pressed");
  const navLink = (link) => ({
    id: (link.getAttribute("href") ?? "").replace(/^#/, ""),
    no: label(link.querySelector(".nav__no")),
    noLang: langOf(link.querySelector(".nav__no")),
    label: label(link.querySelector(".nav__label")),
    labelLang: langOf(link.querySelector(".nav__label")),
  });
  let stored = null;
  try { stored = localStorage.getItem("jc-lang"); } catch (error) { stored = "unavailable"; }
  return {
    url: location.href,
    query: new URLSearchParams(location.search).get("lang"),
    htmlLang: document.documentElement.lang,
    title: document.title,
    navFirst: label(document.querySelector(".nav__links .nav__label")),
    navLinks: [...document.querySelectorAll(".nav__links .nav__link")].map(navLink),
    heads: ${HEAD_PROBE},
    meta: {
      description: langOf(null) === null
        ? (document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null)
        : null,
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? null,
      ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? null,
    },
    options: [...document.querySelectorAll(".nav__lang-btn")].map(option).join(" "),
    stored,
    historyLength: history.length,
  };
})()`;

const snapshot = (tab) => tab.evaluate(PROBE);

function environmentUnavailable(detail) {
  console.error(`环境不可用 (environment unavailable): ${detail}`);
  console.error("Run the host Chrome with --remote-debugging-port=9222 (or set CDP=<url>) and retry.");
  process.exit(2);
}

/** One CDP connection: `send(method, params, sessionId)` for any method on any session. */
async function openCdp(endpoint) {
  let version;
  try {
    const response = await fetch(`${endpoint}/json/version`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    version = await response.json();
  } catch (error) {
    environmentUnavailable(`no CDP endpoint at ${endpoint} (${error.message})`);
  }
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  const opened = await new Promise((resolve) => {
    socket.onopen = () => resolve(true);
    socket.onerror = () => resolve(false);
  });
  if (!opened) {
    environmentUnavailable(`websocket handshake failed at ${version.webSocketDebuggerUrl}`);
  }
  const pending = new Map();
  let sequence = 0;
  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    const waiter = pending.get(data.id);
    if (waiter === undefined) {
      return;
    }
    pending.delete(data.id);
    clearTimeout(waiter.timer);
    if (data.error === undefined) {
      waiter.resolve(data.result);
    } else {
      waiter.reject(new Error(JSON.stringify(data.error)));
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 45000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  return { send, close: () => socket.close() };
}

/** A fresh tab per scenario: no inherited history, no inherited scroll position. */
async function openTab(send) {
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call("Page.enable");
  await call("Runtime.enable");
  const evaluate = async (expression) => {
    const answer = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (answer.exceptionDetails !== undefined) {
      throw new Error(answer.exceptionDetails.exception?.description ?? answer.exceptionDetails.text);
    }
    return answer.result.value;
  };
  return { call, evaluate, close: () => send("Target.closeTarget", { targetId }) };
}

/** Bounded wait for an in-page condition; a context destroyed by a navigation retries. */
async function settle(tab, condition, what) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if ((await tab.evaluate(condition).catch(() => false)) === true) {
      await sleep(150);
      return;
    }
    await sleep(150);
  }
  fail(`${what}: timed out waiting for the page`);
}

/** Full navigation: `__w7nav` proves the document is new, the href proves where it went. */
async function gotoUrl(tab, url) {
  await tab.evaluate("window.__w7nav = true").catch(() => undefined);
  await tab.call("Page.navigate", { url });
  await settle(
    tab,
    `window.__w7nav !== true && location.href === ${JSON.stringify(url)} ` +
      `&& document.readyState === "complete" && !!document.querySelector(".nav__lang-btn")`,
    `navigate ${url}`,
  );
}

async function clickSelector(tab, selector) {
  const clicked = await tab.evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)});` +
      ` if (el === null) return false; el.click(); return true; })()`,
  );
  if (clicked !== true) {
    fail(`element not found: ${selector}`);
  }
}

/** history.back()/forward() plus a bounded wait for the popstate it should fire. */
async function walk(tab, direction) {
  const outcome = await tab.evaluate(`(() => new Promise((resolve) => {
    let settled = false;
    const done = (how) => { if (!settled) { settled = true; resolve(how); } };
    addEventListener("popstate", () => setTimeout(() => done("popstate"), 200), { once: true });
    history.${direction}();
    setTimeout(() => done("timeout"), 4000);
  }))()`);
  if (outcome !== "popstate") {
    fail(`history.${direction}() did not fire popstate (${outcome})`);
  }
  await sleep(200);
}

/** One line of raw values, then one assertion per surface against the expected language. */
function report(label, probe) {
  const navRaw = (probe.navLinks ?? [])
    .map((link) => {
      const mark = (value, lang) => `${value ?? "null"}${lang === null ? "" : `@${lang}`}`;
      return `${link.id}=${mark(link.no, link.noLang)}/${mark(link.label, link.labelLang)}`;
    })
    .join(" ");
  const headsRaw = HEAD_PAIRS.map(
    (pair) => `${pair.pair}=${probe.heads?.[pair.pair]?.title ?? "null"}`,
  ).join(" ");
  console.log(
    `${label}: url=${probe.url} query=${JSON.stringify(probe.query)} html.lang=${probe.htmlLang} ` +
      `title=${JSON.stringify(probe.title)} navFirst=${JSON.stringify(probe.navFirst)} ` +
      `toggle=[${probe.options}] stored=${JSON.stringify(probe.stored)} ` +
      `history.length=${probe.historyLength} nav=[${navRaw}] heads=[${headsRaw}] ` +
      `head=[${JSON.stringify(probe.meta?.description)} / ${JSON.stringify(probe.meta?.ogTitle)}]`,
  );
}

function expectEqual(label, actual, wanted) {
  if (actual !== wanted) {
    fail(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(wanted)}`);
  }
}

/**
 * One text surface must show `key`'s text, and must carry `lang` only when the key's own
 * language differs from the page's (BLUEPRINT §6.4). The label names the surface it read.
 */
function expectSurface(label, actual, key, pageLang) {
  expectEqual(`${label} = ${key}`, actual.text, text(pageLang, key));
  const own = DICT[pageLang][key].lang;
  expectEqual(`${label} lang (${key})`, actual.lang, own === pageLang ? null : own);
}

/** Every nav link: its mode's own label key, the ordinal, and both `lang` marks (BLUEPRINT §6.4). */
function expectNavLinks(label, probe, lang) {
  const found = new Map((probe.navLinks ?? []).map((link) => [link.id, link]));
  expectEqual(`${label}: nav link count`, found.size, NAV_LINKS.length);
  for (const item of NAV_LINKS) {
    const link = found.get(item.id);
    if (link === undefined) {
      fail(`${label}: nav link ${item.id} is missing from the page`);
      continue;
    }
    expectSurface(`${label}: nav ${item.id} no`, { text: link.no, lang: link.noLang }, item.no, lang);
    expectSurface(
      `${label}: nav ${item.id} label`,
      { text: link.label, lang: link.labelLang },
      lang === "zh-Hans" ? item.zh : item.en,
      lang,
    );
  }
}

/**
 * The two dual head pairs: the zh side sits inside the L kicker (it has no element of its
 * own — docs/CHROME.md §4), the English title in R; both stay put in both modes.
 */
function expectHeadPairs(label, probe, pageLang) {
  /* The head's L kicker carries the section title too, set in caps by the board, so that
     one comparison folds case and whitespace (docs/CHROME.md comparison rule); the h2
     title in R is compared verbatim. */
  const fold = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();
  for (const pair of HEAD_PAIRS) {
    const head = probe.heads?.[pair.pair];
    if (head === undefined) {
      fail(`${label}: ${pair.pair} head is missing from the page`);
      continue;
    }
    expectEqual(
      `${label}: ${pair.pair} kicker carries ${pair.zh}`,
      fold(head.kicker ?? "").includes(fold(text(pageLang, pair.zh))),
      true,
    );
    expectEqual(`${label}: ${pair.pair} title = ${pair.en}`, head.title, text(pageLang, pair.en));
  }
}

/** Switching must move every nav label; one that does not is a pair frozen to a single mode. */
function expectLabelsMoved(label, before, after) {
  const previous = new Map((before.navLinks ?? []).map((link) => [link.id, link.label]));
  for (const item of NAV_LINKS) {
    const from = previous.get(item.id);
    const to = (after.navLinks ?? []).find((link) => link.id === item.id)?.label;
    if (from === undefined || to === undefined || from === to) {
      fail(
        `${label}: nav ${item.id} label reads ${JSON.stringify(to)} in both modes; ` +
          `expected ${item.zh} to change into ${item.en}`,
      );
    }
  }
}

function expectSurfaces(label, probe, lang) {
  expectEqual(`${label}: html.lang`, probe.htmlLang, lang);
  expectEqual(`${label}: document.title`, probe.title, WANT.title[lang]);
  expectEqual(`${label}: first nav label`, probe.navFirst, WANT.navFirst[lang]);
  expectEqual(`${label}: toggle label+aria-pressed`, probe.options, WANT.toggle[lang]);
  expectNavLinks(label, probe, lang);
  expectHeadPairs(label, probe, lang);
  /* The static head is the default mode's; every language-dependent part must follow. */
  expectEqual(`${label}: meta description`, probe.meta?.description, HEAD_COPY[lang].summary);
  expectEqual(`${label}: og:title`, probe.meta?.ogTitle, HEAD_COPY[lang].title);
  expectEqual(`${label}: og:description`, probe.meta?.ogDescription, HEAD_COPY[lang].summary);
}

const cdp = await openCdp(CDP_HTTP);
const { createServer } = await import("vite");
const devServer = await createServer({
  root: REPO,
  logLevel: "error",
  clearScreen: false,
  server: { host: "127.0.0.1", port: DEV_PORT, strictPort: false },
});
await devServer.listen();
const base = (devServer.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${DEV_PORT}/`).replace(
  /\/$/,
  "",
);
console.log(`browser interaction: ${base} (in-process vite dev server over this tree)`);

try {
  /* scenario 1: Back/Forward must re-resolve the language from the visited URL */
  const tab = await openTab(cdp.send);
  try {
    await gotoUrl(tab, `${base}/?lang=zh-Hans`);
    await tab.evaluate(`localStorage.removeItem("jc-lang")`); // deterministic start
    let probe = await snapshot(tab);
    report("  s1 open /?lang=zh-Hans", probe);
    expectSurfaces("s1 open", probe, "zh-Hans");
    const zhUrl = probe.url;
    const historyOpened = probe.historyLength;

    await clickSelector(tab, '.nav__links a[href="#scholarly"]');
    await settle(tab, `location.hash === "#scholarly"`, "nav anchor click");
    probe = await snapshot(tab);
    report("  s1 after Nav anchor", probe);
    const historyAfterAnchor = probe.historyLength;
    expectEqual("s1 Nav anchor pushed an entry", historyAfterAnchor, historyOpened + 1);
    const zhProbe = probe;

    await clickSelector(tab, ".nav__lang-btn--en");
    await settle(tab, `document.documentElement.lang === "en"`, "click EN");
    probe = await snapshot(tab);
    report("  s1 after clicking EN", probe);
    const enUrl = probe.url;
    expectSurfaces("s1 after EN", probe, "en");
    expectLabelsMoved("s1 after EN", zhProbe, probe);
    expectEqual("s1 after EN: URL carries lang", probe.query, "en");

    await walk(tab, "back");
    probe = await snapshot(tab);
    report("  s1 Back to /?lang=zh-Hans", probe);
    expectEqual("s1 Back: landed on the previous entry", probe.url, zhUrl);
    expectSurfaces("s1 Back", probe, "zh-Hans");
    expectEqual("s1 Back: history.length untouched", probe.historyLength, historyAfterAnchor);

    await walk(tab, "forward");
    probe = await snapshot(tab);
    report("  s1 Forward to /?lang=en", probe);
    expectEqual("s1 Forward: landed on the EN entry", probe.url, enUrl);
    expectSurfaces("s1 Forward", probe, "en");
    expectEqual("s1 Forward: history.length untouched", probe.historyLength, historyAfterAnchor);
  } finally {
    await tab.close();
  }

  /* scenario 2: clicking the already-pressed language still persists the explicit choice */
  const tab2 = await openTab(cdp.send);
  try {
    await gotoUrl(tab2, `${base}/?lang=zh-Hans`);
    await tab2.evaluate(`localStorage.setItem("jc-lang", "zh-Hans")`);
    await gotoUrl(tab2, `${base}/?lang=en`);
    let probe = await snapshot(tab2);
    report("  s2 /?lang=en with stored zh-Hans", probe);
    expectSurfaces("s2 open", probe, "en");
    expectEqual("s2 open: the query wins over storage", probe.stored, "zh-Hans");

    await clickSelector(tab2, ".nav__lang-btn--en");
    await sleep(300);
    probe = await snapshot(tab2);
    report("  s2 after clicking the pressed EN", probe);
    expectEqual("s2 same-value click: stored choice", probe.stored, "en");

    await gotoUrl(tab2, `${base}/`);
    probe = await snapshot(tab2);
    report("  s2 query-less /", probe);
    expectSurfaces("s2 query-less", probe, "en");
    expectEqual("s2 query-less: storage still holds the choice", probe.stored, "en");
  } finally {
    await tab2.close();
  }
} finally {
  await devServer.close();
  cdp.close();
}

const browserFailures = failures.length - failuresBeforeBrowser;
console.log(
  `browser interaction: scenario 1 (Back/Forward) + scenario 2 (same-value click): ` +
    `${browserFailures} failure(s)`,
);

/* ---------- report ---------- */

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} language-toggle problem(s); markup in ${HTML_OUT}`);
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `PASS: default mode ${DEFAULT_MODE} (${html.length} B, ${HTML_OUT}) — html lang=${DEFAULT_MODE}, ` +
    `title=${JSON.stringify(document.title)}, ${pressed.length} toggle buttons pressed on ${DEFAULT_MODE} ` +
    "with the 1×12 hairline between them; all 13 pairs hold their own language's text in that " +
    `default-mode markup, and the browser drove all ${NAV_LINKS.length} nav links plus both head ` +
    "pairs through both modes (label, ordinal and §6.4 lang per item)",
);
