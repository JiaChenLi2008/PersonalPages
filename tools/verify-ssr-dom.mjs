#!/usr/bin/env node
/*
 * SSR DOM check for the `scholarly` section (lane S3).
 *
 * Builds an in-repo SSR entry with `vite build --ssr` (through Vite's JS API so the
 * entry can stay virtual and `vite` keeps owning module resolution from the project
 * root), renders the section with react-dom/server, writes the markup to
 * /tmp/scholarly-ssr.html, and asserts what only rendered markup can prove:
 *
 *   1. no h1 and exactly one h2 (the page's single h1 is Hero's, BLUEPRINT §6.1);
 *      h3 = the four sub-blocks, h4 = the two iGEM sections
 *   2. the reveal skeleton of src/lib/useRevealPanel.ts (motion spec §3): nine
 *      <button aria-expanded="false" aria-controls="…" data-state="closed">, each
 *      aria-controls naming a live panel that is a role="region" in the DOM, closed by
 *      `data-state` alone — no `hidden` attribute (it cannot carry the height
 *      transition), no `aria-hidden`, no inline style — labelled by its trigger, whose
 *      single child is the `.motion-reveal-clip` layer, and holding two `.motion-answer`
 *      blocks on the two answer tiers; plus the three `.motion-reveal-group` containers
 *      and the §4 devices that land in this section (`.motion-clip` on the six media
 *      slots, `.motion-slide` on the nine ordinals, `.motion-hover` on the nine triggers)
 *   3. the iGEM CTA is a real link to the project site, opened in a new tab with
 *      rel="noopener noreferrer"
 *   3b. the two docx-1021 additions render: the result block (`.scholarly__result`) between the
 *      lab paragraph and the Paris heading with both of its entries verbatim and each entry's
 *      own `lang`, and the 2x2 pillar matrix (`.scholarly__pillars`) under both columns with
 *      four titles and twelve bullets, in contract order, every one of the sixteen keys reaching
 *      the markup
 *   4. the HIR card links to the copied essay PDF
 *   5. the default product is the en page: the section carries its own language only —
 *      no CJK character, and every lang mark is "en" (BLUEPRINT §6.4: one language per
 *      page, element-level lang only for text in another language) — while the six real
 *      photos (three JHU puzzles, three wired figures) carry their alt plus
 *      loading/decoding/width/height (§6.3), and no `image pending` placeholder slot is
 *      left behind
 *   6. a paired key renders one side only: the iGEM CTA and the section title each
 *      appear exactly once in a page that carries their two dictionary keys
 *   7. no ※ design annotation and no hex colour reaches the markup
 *   8. every aria-label whose text is a dictionary entry declares that entry's own
 *      language: a screen reader must not read the English JHU riddles as Chinese
 *      (BLUEPRINT §6.4)
 *   9. the docx-1027 deletions stay deleted: the two iGEM captions and the HIR card's
 *      meta line are gone — no `.scholarly__cap` / `.scholarly__meta` shell in the
 *      markup, and their keys back in the dictionary fail the run through the same
 *      removal table the fidelity gates use (tools/fidelity-docx-removal.mjs)
 *
 * Usage: node tools/verify-ssr-dom.mjs   (exit 0 = pass, 1 = any failed assertion)
 *
 * Temporary output: /tmp/scholarly-ssr-out (rebuilt each run) + /tmp/scholarly-ssr.html.
 * The shared i18n module writes document.documentElement.lang at import time, so the
 * renderer provides that one property — it is not an implementation hook.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "vite";

import { judgeRemovedByDocx } from "./fidelity-docx-removal.mjs";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = "/tmp/scholarly-ssr-out";
const HTML_OUT = "/tmp/scholarly-ssr.html";
const ENTRY_ID = "\0virtual:scholarly-ssr-entry";
const SECTION = join(REPO, "src", "sections", "Scholarly", "Scholarly.tsx");
const I18N = join(REPO, "src", "i18n", "index.tsx");

const failures = [];
const fail = (message) => failures.push(message);

/* The shared i18n module writes the page language onto document.documentElement at import
   time, so the renderer provides that one property and keeps the object it writes to —
   it is not an implementation hook, and assertion 8 reads the language from it. */
const documentElement = {};

/* ---------- build + render ---------- */

const entrySource = `
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Scholarly } from ${JSON.stringify(SECTION)};
import { LocaleProvider } from ${JSON.stringify(I18N)};

export function renderScholarly() {
  return renderToStaticMarkup(createElement(LocaleProvider, null, createElement(Scholarly)));
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
      name: "scholarly-ssr-entry",
      resolveId: (id) => (id === ENTRY_ID ? ENTRY_ID : null),
      load: (id) => (id === ENTRY_ID ? entrySource : null),
    },
  ],
});

globalThis.document = { documentElement };
const { renderScholarly } = await import(pathToFileURL(join(OUT_DIR, "entry.js")).href);
const html = renderScholarly();
writeFileSync(HTML_OUT, html);

/* ---------- markup helpers ---------- */

/** Attributes of every `<tag …>` in the markup, as plain objects. */
function tagsOf(name) {
  const attributes = [];
  for (const match of html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, "g"))) {
    const attrs = {};
    for (const attr of match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attrs[attr[1]] = attr[2];
    }
    attributes.push(attrs);
  }
  return attributes;
}

const count = (name) => [...html.matchAll(new RegExp(`<${name}\\b`, "g"))].length;
/** Every element carrying one of the shared motion hooks (spec §4). */
const withHook = (hook) =>
  [...html.matchAll(new RegExp(`<([a-z]+)\\b[^>]*class="[^"]*\\b${hook}\\b[^"]*"[^>]*>`, "g"))].map(
    (match) => ({ tag: match[1], markup: match[0] }),
  );

const en = JSON.parse(readFileSync(join(REPO, "docs", "copy-en.json"), "utf8"));
const zh = JSON.parse(readFileSync(join(REPO, "docs", "copy-zh.json"), "utf8"));

/* docx-1027 第 3 条 removes the two iGEM figure captions and the HIR card's mono meta line. The
   frozen board still draws those slots, so this check stops asking for their copy and holds the
   deletion instead: the class shell must not come back, and the keys are judged by the same
   `{ keys, docx }` table the three fidelity gates use (tools/fidelity-docx-removal.mjs) — a key
   back in the dictionaries, or named again under src/, fails here and names the node to revoke,
   so the registration cannot become a permanent hole in the gate. */
const REMOVED_BY_DOCX = {
  I6zyH: { keys: ["scholarly.figcap2"], docx: "docx-1027 第 3 条", shell: "scholarly__cap" },
  m7Y31D: { keys: ["scholarly.figcap3"], docx: "docx-1027 第 3 条", shell: "scholarly__cap" },
  K5Gug: { keys: ["scholarly.meta"], docx: "docx-1027 第 3 条", shell: "scholarly__meta" },
};
const { active: removedNodes, stale: staleRegistrations } = judgeRemovedByDocx(REMOVED_BY_DOCX, REPO);
for (const message of staleRegistrations) {
  fail(`[docx] ${message}`);
}
for (const node of removedNodes) {
  const { docx, shell } = REMOVED_BY_DOCX[node];
  if (new RegExp(`\\b${shell}\\b`).test(html)) {
    fail(`[docx] ${docx} removed the .${shell} slot, but the markup still carries the class`);
  }
}

/* ---------- 1. heading ladder ---------- */

if (count("h1") !== 0) {
  fail(`h1 count ${count("h1")} != 0: the page's only h1 belongs to Hero (BLUEPRINT §6.1)`);
}
if (count("h2") !== 1) {
  fail(`h2 count ${count("h2")} != 1: the section heading is the only h2`);
}
if (count("h3") !== 4) {
  fail(`h3 count ${count("h3")} != 4: one per sub-block (01.1–01.4)`);
}
if (count("h4") !== 2) {
  fail(`h4 count ${count("h4")} != 2: Lab contribution / Paris Conference`);
}
const h2 = tagsOf("h2")[0] ?? {};
if (h2.id !== "scholarly-title") {
  fail(`h2 id ${JSON.stringify(h2.id)} != "scholarly-title" (aria-labelledby target)`);
}
if (h2.lang !== "en") {
  fail(`h2 lang ${JSON.stringify(h2.lang)} != "en" (the section title is written in the page's language)`);
}
/* docx-1023 item 8（用户裁决）：去右侧重复标题、kicker 14px/--c-blue。The head's one visible
   line is the kicker, and that line is the h2; the clean section name survives as its
   aria-label so the accessible name is still the title key rather than "01 / …". */
const h2Text = en["scholarly.kicker"].text;
if (!html.includes(`>${h2Text}</h2>`)) {
  fail(`the h2 does not render the kicker verbatim (${JSON.stringify(h2Text)})`);
}
const h2Title = en["scholarly.title.en"].text;
if (!html.includes(`aria-label="${h2Title}"`)) {
  fail(`the h2 aria-label is not the page's title key verbatim (${JSON.stringify(h2Title)})`);
}

/* ---------- 2. the reveal skeleton and the §4 devices ---------- */

const buttons = tagsOf("button");
const triggers = buttons.filter((attrs) => "aria-controls" in attrs);
if (triggers.length !== 9) {
  fail(`reveal trigger count ${triggers.length} != 9 (three per question block)`);
}
const panels = tagsOf("div").filter((attrs) => "data-reveal-panel" in attrs);
if (panels.length !== 9) {
  fail(`reveal panel count ${panels.length} != 9 (one per trigger)`);
}
const panelIds = new Set(panels.map((attrs) => attrs.id).filter(Boolean));
const triggerIds = new Set(triggers.map((attrs) => attrs.id));

for (const trigger of triggers) {
  const id = trigger.id;
  if (trigger["aria-expanded"] !== "false") {
    fail(`trigger ${id}: aria-expanded=${JSON.stringify(trigger["aria-expanded"])} != "false" initially`);
  }
  if (trigger["data-state"] !== "closed") {
    fail(`trigger ${id}: data-state=${JSON.stringify(trigger["data-state"])} != "closed" initially`);
  }
  if (!panelIds.has(trigger["aria-controls"])) {
    fail(`trigger ${id}: aria-controls=${JSON.stringify(trigger["aria-controls"])} has no panel with that id`);
  }
}
if (triggers.some((trigger) => trigger["aria-expanded"] === "true")) {
  fail('a trigger renders aria-expanded="true" before any interaction');
}

for (const panel of panels) {
  const id = panel.id;
  if (panel.role !== "region") {
    fail(`panel ${id}: role=${JSON.stringify(panel.role)} != "region"`);
  }
  if (panel["data-state"] !== "closed") {
    fail(`panel ${id}: data-state=${JSON.stringify(panel["data-state"])} != "closed" initially`);
  }
  if ("hidden" in panel) {
    fail(`panel ${id}: a hidden attribute cannot carry the height transition; the state is data-state`);
  }
  if (panel["aria-hidden"] !== undefined) {
    fail(`panel ${id}: aria-hidden must stay off so the answer is reachable once revealed`);
  }
  if (!triggerIds.has(panel["aria-labelledby"])) {
    fail(`panel ${id}: aria-labelledby=${JSON.stringify(panel["aria-labelledby"])} is not a reveal trigger`);
  }
}

/* The panel's single child is the clip layer, and the clip layer's own child is the
   bordered answer box: that nesting is what lets the frame grow with the content. */
for (const match of html.matchAll(/<div[^>]*data-reveal-panel=""[^>]*>/g)) {
  const id = (match[0].match(/ id="([^"]*)"/) ?? [])[1];
  const child = html.slice(match.index + match[0].length);
  if (!child.startsWith('<div class="motion-reveal-clip">')) {
    fail(`panel ${id}: its single child must be the .motion-reveal-clip layer, got ${JSON.stringify(child.slice(0, 48))}`);
    continue;
  }
  const box = child.slice('<div class="motion-reveal-clip">'.length);
  if (!/^<div class="scholarly__panel scholarly__panel--(qa|hir)">/.test(box)) {
    fail(`panel ${id}: the clip layer must wrap the bordered answer box, got ${JSON.stringify(box.slice(0, 48))}`);
  }
}

const answerBlocks = tagsOf("p").filter((attrs) => (attrs.class ?? "").split(" ").includes("motion-answer"));
if (answerBlocks.length !== 18) {
  fail(`.motion-answer block count ${answerBlocks.length} != 18 (an answer label and an answer per panel)`);
}
const tiers = new Map();
for (const block of answerBlocks) {
  tiers.set(block["data-stagger"], (tiers.get(block["data-stagger"]) ?? 0) + 1);
}
if (tiers.get("1") !== 9 || tiers.get("2") !== 9) {
  fail(`answer stagger tiers ${JSON.stringify([...tiers])} != nine on tier 1 and nine on tier 2`);
}

/* docx page 4 moved each HIR closing sentence from a pull-quote into its own answer
   panel, as a second paragraph one blank line below the body and in another colour.
   The paragraph structure is the claim, so it is what is asserted: per HIR panel the
   `.scholarly__answer` paragraphs are the body then exactly one `.scholarly__answer--merge`
   carrying that panel's own dictionary sentence verbatim. Dropping the extra <p> (or
   folding the sentence back into the body) makes this fail. */
const MERGED = [
  { panel: "scholarly-hir-a1", key: "scholarly-hir.bridge1" },
  { panel: "scholarly-hir-a2", key: "scholarly-hir.bridge2" },
  { panel: "scholarly-hir-a3", key: "scholarly-hir.closing" },
];
for (const { panel, key } of MERGED) {
  const from = html.indexOf(`id="${panel}"`);
  if (from < 0) {
    fail(`#${panel}: the HIR answer panel is not rendered`);
    continue;
  }
  /* The panel's own tag carries `data-reveal-panel`, so the body starts after its
     closing bracket and ends at the next panel's tag. */
  const start = html.indexOf(">", from) + 1;
  const next = html.indexOf('data-reveal-panel=""', start);
  const body = html.slice(start, next < 0 ? html.length : next);
  const paragraphs = [...body.matchAll(/<p class="(scholarly__answer[^"]*)"[^>]*>([\s\S]*?)<\/p>/g)].map(
    (match) => ({ classes: match[1].split(" "), text: match[2] }),
  );
  const merged = paragraphs.filter((entry) => entry.classes.includes("scholarly__answer--merge"));
  if (paragraphs.length !== 2 || merged.length !== 1) {
    fail(
      `#${panel}: ${paragraphs.length} answer paragraph(s), ${merged.length} of them merged — ` +
        "expected the answer body plus one merged paragraph (docx page 4: the closing " +
        "sentence belongs inside the panel)",
    );
    continue;
  }
  if (paragraphs[1] !== merged[0]) {
    fail(`#${panel}: the merged paragraph must come after the answer body`);
  }
  /* React escapes markup characters in text children, so compare on the decoded text. */
  const decode = (markup) =>
    markup
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  if (decode(merged[0].text) !== en[key].text) {
    fail(`#${panel}: the merged paragraph is not ${key} verbatim (${JSON.stringify(merged[0].text.slice(0, 48))})`);
  }
}

const groups = tagsOf("ul").concat(tagsOf("div")).filter((attrs) => (attrs.class ?? "").split(" ").includes("motion-reveal-group"));
if (groups.length !== 3) {
  fail(`.motion-reveal-group count ${groups.length} != 3 (JHU / Immunotherapy / HIR)`);
}

/* The §4 devices: six media slots swept by a mask, nine ordinals sliding in, nine
   question cards with pointer micro-motion. */
const DEVICES = [
  { hook: "motion-clip", expected: 6, why: "three JHU puzzle slots + three wired figure slots (device ②)" },
  { hook: "motion-slide", expected: 9, why: "the nine question ordinals (device ③)" },
  { hook: "motion-hover", expected: 9, why: "the nine question cards (device ④)" },
];
for (const { hook, expected, why } of DEVICES) {
  const found = withHook(hook);
  if (found.length !== expected) {
    fail(`.${hook} count ${found.length} != ${expected}: ${why}`);
  }
}

/* No inline style anywhere: the height, the clip and the lift all come from motion.css. */
if (/\sstyle="/.test(html)) {
  fail("an inline style reached the markup; the reveal terminal state is aria-expanded + data-state");
}

const allIds = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
if (new Set(allIds).size !== allIds.length) {
  fail("duplicate id in the section markup");
}

/* ---------- 3./4. real links ---------- */

const IGEM_URL = "https://2025.igem.wiki/subcat-shanghai/";
const links = tagsOf("a");
const cta = links.find((attrs) => attrs.href === IGEM_URL);
if (cta === undefined) {
  fail(`no <a href="${IGEM_URL}">: the iGEM CTA must be a real link`);
} else {
  if (cta.target !== "_blank") {
    fail(`iGEM CTA target=${JSON.stringify(cta.target)} != "_blank"`);
  }
  const rel = (cta.rel ?? "").split(/\s+/);
  if (!rel.includes("noopener") || !rel.includes("noreferrer")) {
    fail(`iGEM CTA rel=${JSON.stringify(cta.rel)} lacks noopener/noreferrer for target="_blank"`);
  }
  /* The user ruled the anchor must read as a sentence, not as the address: a raw URL in the
     link text is the exact regression this catches. `tagsOf` keeps attributes only, so the
     anchor is re-matched whole to read its text. */
  const anchor = new RegExp(
    `<a\\b[^>]*href="${IGEM_URL.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}"[^>]*>([\\s\\S]*?)</a>`,
  ).exec(html);
  const label = (anchor?.[1] ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
  if (label === "") {
    fail("iGEM CTA has no visible text: the anchor must carry a sentence");
  } else if (/^https?:\/\//i.test(label) || label.includes("igem.wiki")) {
    fail(`iGEM CTA text ${JSON.stringify(label)} is the address itself; it must be a sentence`);
  }
}

const pdf = links.find((attrs) => (attrs.href ?? "").endsWith("media/hir-essay.pdf"));
if (pdf === undefined) {
  fail('no <a href="…/media/hir-essay.pdf">: the HIR card must link to the copied essay');
}

/* ---------- 3b. the docx-1021 additions: result copy and the 2x2 pillar matrix ---------- */

/* Both structures are new: without these assertions the docx's second and third additions
   could lose a paragraph, a pillar or a bullet and every gate would stay green. The texts
   are held to the dictionary entry each element renders, in the contract's order, and each
   element to that entry's own `lang` — the mark a screen reader needs on a cell whose
   language differs from the page's (BLUEPRINT §6.4). */
/* React escapes markup characters in text children, so comparisons run on decoded text. */
const decodeText = (markup) =>
  markup
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const RESULT = ["scholarly-igem.result.title", "scholarly-igem.result.body"];
const PILLAR_KEYS = [1, 2, 3, 4].flatMap((n) => [
  `scholarly-igem.pillar${n}.title`,
  `scholarly-igem.pillar${n}.item1`,
  `scholarly-igem.pillar${n}.item2`,
  `scholarly-igem.pillar${n}.item3`,
]);

const resultBlock = /<div class="scholarly__result">([\s\S]*?)<\/div>/.exec(html);
if (resultBlock === null) {
  fail("no .scholarly__result block: the docx's result copy (item 2) is not rendered");
} else {
  for (const key of RESULT) {
    const entry = en[key];
    if (entry === undefined) {
      fail(`docs/copy-en.json has no ${key}`);
      continue;
    }
    const element = new RegExp(`<p class="scholarly__[kd]" lang="([^"]*)">${entry.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`);
    const found = element.exec(resultBlock[1]);
    if (found === null) {
      fail(`the result block does not render ${key} (${JSON.stringify(entry.text)}) verbatim`);
    } else if (found[1] !== entry.lang) {
      fail(`the result block renders ${key} with lang=${JSON.stringify(found[1])}, expected ${JSON.stringify(entry.lang)}`);
    }
  }
  /* docx: the result block sits between the lab paragraph and the Paris heading. */
  const visible = decodeText(html);
  const labAt = visible.indexOf(en["scholarly-igem.para1"].text);
  const parisAt = visible.indexOf(en["scholarly-igem.sub2"].text);
  const blockAt = visible.indexOf('class="scholarly__result"');
  if (labAt < 0 || parisAt < 0) {
    fail("the iGEM lab paragraph or the Paris heading is missing from the markup");
  } else if (!(labAt < blockAt && blockAt < parisAt)) {
    fail("the result block is not between the lab paragraph and the Paris heading (docx item 2)");
  }
}

const pillarsAt = html.indexOf('class="scholarly__pillars"');
if (pillarsAt < 0) {
  fail("no .scholarly__pillars matrix: the docx's four blocks (item 3) are not rendered");
} else {
  /* The card is a `Reveal`, so its class list also carries the reveal hooks — match the class
     token, and cut each block at its closing `</ul>` rather than the first `</div>` (the card
     has no nested div, but the tag may be any element and the list is its last child). */
  const blocks = [...html.matchAll(/<[a-z]+\b[^>]*class="[^"]*\bscholarly__pillar\b[^"]*"[^>]*>([\s\S]*?<\/ul>)/g)].map((match) => match[1]);
  if (blocks.length !== 4) {
    fail(`the pillar matrix renders ${blocks.length} block(s), the docx lists 4`);
  }
  /* docx-1023 item 1（用户裁决）：the matrix moves up into the iGEM left column, between the
     result block and the Paris Conference heading. The order is the contract: para1 → result
     → pillars → sub2 → para2 → CTA, and the matrix sits inside `.scholarly__igemCol`. */
  const columnAt = html.indexOf('class="scholarly__igemCol"');
  const columnEnd = html.indexOf('class="scholarly__figcol"');
  const resultAt = html.indexOf('class="scholarly__result"');
  const parisAt = html.indexOf(`>${en["scholarly-igem.sub2"].text}</h4>`);
  const para2At = html.indexOf(`>${en["scholarly-igem.para2"].text}</p>`);
  if (columnAt < 0 || columnEnd < columnAt) {
    fail("no .scholarly__igemCol / .scholarly__figcol pair to locate the pillar matrix");
  } else if (!(columnAt < resultAt && resultAt < pillarsAt && pillarsAt < parisAt && parisAt < para2At)) {
    fail(
      "the pillar matrix is not between the result block and the Paris heading " +
        `(igemCol=${columnAt}, result=${resultAt}, pillars=${pillarsAt}, sub2=${parisAt}, para2=${para2At})`,
    );
  } else if (pillarsAt > columnEnd) {
    fail("the pillar matrix is outside .scholarly__igemCol (it must move up into the left column)");
  }
  [1, 2, 3, 4].forEach((n, index) => {
    const block = blocks[index];
    if (block === undefined) return;
    const titleKey = `scholarly-igem.pillar${n}.title`;
    /* The card title carries its own class now; accept either the card class or the old key
       class so the gate tests the text, not the styling hook. */
    const title = /<p\b[^>]*class="[^"]*\bscholarly__(?:pillarTitle|k)\b[^"]*"[^>]*lang="([^"]*)"[^>]*>([^<]*)<\/p>/.exec(block)
      ?? /<p\b[^>]*lang="([^"]*)"[^>]*class="[^"]*\bscholarly__(?:pillarTitle|k)\b[^"]*"[^>]*>([^<]*)<\/p>/.exec(block);
    if (title === null || decodeText(title[2]).trim() !== en[titleKey].text) {
      fail(`pillar ${n}: title ${JSON.stringify(title?.[2])} != ${titleKey} (${JSON.stringify(en[titleKey].text)})`);
    } else if (title[1] !== en[titleKey].lang) {
      fail(`pillar ${n} title: lang=${JSON.stringify(title[1])}, expected ${JSON.stringify(en[titleKey].lang)}`);
    }
    const items = [...block.matchAll(/<li lang="([^"]*)">([^<]*)<\/li>/g)];
    if (items.length !== 3) {
      fail(`pillar ${n}: ${items.length} bullet(s), the docx lists 3`);
    }
    for (let at = 0; at < 3; at += 1) {
      const key = `scholarly-igem.pillar${n}.item${at + 1}`;
      const rendered = decodeText(items[at]?.[2] ?? "").trim();
      if (rendered !== en[key].text) {
        fail(`pillar ${n} bullet ${at + 1}: ${JSON.stringify(rendered)} != ${key} (${JSON.stringify(en[key].text)})`);
      } else if (items[at][1] !== en[key].lang) {
        fail(`pillar ${n} bullet ${at + 1}: lang=${JSON.stringify(items[at][1])}, expected ${JSON.stringify(en[key].lang)}`);
      }
    }
  });
  /* Every key reaches the markup somewhere: the matrix is the only place these 16 keys are
     rendered, so a key that falls out here is dead, not merely moved. */
  for (const key of PILLAR_KEYS) {
    if (!decodeText(html).includes(en[key].text)) {
      fail(`${key} does not reach the markup: the docx's 16 matrix keys must all render`);
    }
  }
}

/* ---------- 5. language and photo attributes ---------- */

/* The default product is the en page (lang.ts DEFAULT_LANG), so the section renders one
   language: its own. Both halves of the old "both languages coexist" criterion are kept
   at the same strength — the other language must not appear at all, and the text that does
   appear must be the en dictionary's (§8 checks the accessible names the same way). */
if (documentElement.lang !== "en") {
  fail(`lang.ts wrote <html lang>=${JSON.stringify(documentElement.lang)} at import time, expected "en"`);
}
const cjk = html.match(/[\u2e80-\u2eff\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/gu) ?? [];
if (cjk.length > 0) {
  fail(`the en section renders ${cjk.length} CJK character(s): ${JSON.stringify([...new Set(cjk)].join(""))}`);
}
const langAttrs = [...new Set([...html.matchAll(/lang="([^"]+)"/g)].map((match) => match[1]))].sort();
if (JSON.stringify(langAttrs) !== JSON.stringify(["en"])) {
  fail(
    `lang attributes ${JSON.stringify(langAttrs)} != ["en"]: every marked string is in the page's language`,
  );
}

/* Six real photos: the three JHU puzzles (their alt is the answer text, §6.3) and the
   three wired figures (their alt is the T3b alt key of the slot). */
const FIGURES = [
  { src: "media/igem-fig1-720.webp", width: 720, height: 540, altKey: "scholarly-igem.fig1.alt" },
  { src: "media/igem-fig2-720.webp", width: 720, height: 540, altKey: "scholarly-igem.fig2.alt" },
  { src: "media/hir-fig-2688.webp", width: 2688, height: 840, altKey: "scholarly-hir.fig.alt" },
];
const photos = tagsOf("img");
if (photos.length !== FIGURES.length + 3) {
  fail(`img count ${photos.length} != ${FIGURES.length + 3}: the three JHU puzzles plus the three wired figures`);
}
/* The three JHU puzzle photos: each slot is one dissection photo whose alt is its own
   answer text (§6.3). The assertion is set equality over the three — the count of alts
   found in the answer list was weaker, because three photos wearing the same answer
   passed it — plus the per-src pairing, which pins each photo to its own answer. */
const JHU_PUZZLES = [
  { src: "media/image1-1600.webp", answer: "scholarly-jhu.a1" },
  { src: "media/image2-400.webp", answer: "scholarly-jhu.a2" },
  { src: "media/image3-600.webp", answer: "scholarly-jhu.a3" },
];
const puzzlePhotos = photos.filter((photo) => JHU_PUZZLES.some((puzzle) => (photo.src ?? "").endsWith(puzzle.src)));
if (puzzlePhotos.length !== JHU_PUZZLES.length) {
  fail(`JHU puzzle photos ${puzzlePhotos.length} != ${JHU_PUZZLES.length}: the three dissection photos are the puzzle slots`);
}
const puzzleAlts = puzzlePhotos.map((photo) => photo.alt).sort();
const answerTexts = JHU_PUZZLES.map((puzzle) => en[puzzle.answer].text);
if (JSON.stringify(puzzleAlts) !== JSON.stringify(answerTexts.slice().sort())) {
  fail(`JHU puzzle alt set ${JSON.stringify(puzzleAlts)} != the three answer texts ${JSON.stringify(answerTexts.slice().sort())}`);
}
for (const puzzle of JHU_PUZZLES) {
  const photo = puzzlePhotos.find((attrs) => (attrs.src ?? "").endsWith(puzzle.src));
  if (photo === undefined) {
    fail(`no <img src="…/${puzzle.src}">: the JHU puzzle slot is not wired`);
    continue;
  }
  if (photo.alt !== en[puzzle.answer].text) {
    fail(`img ${puzzle.src}: alt ${JSON.stringify(photo.alt)} != its own ${puzzle.answer} (${JSON.stringify(en[puzzle.answer].text)})`);
  }
}
for (const figure of FIGURES) {
  const photo = photos.find((attrs) => (attrs.src ?? "").endsWith(figure.src));
  if (photo === undefined) {
    fail(`no <img src="…/${figure.src}">: the figure slot is not wired`);
    continue;
  }
  if (photo.alt !== en[figure.altKey].text) {
    fail(`img ${figure.src}: alt ${JSON.stringify(photo.alt)} != ${figure.altKey}`);
  }
  if (Number(photo.width) !== figure.width || Number(photo.height) !== figure.height) {
    fail(`img ${figure.src}: width/height ${photo.width}×${photo.height} != the asset's native ${figure.width}×${figure.height}`);
  }
}
for (const photo of photos) {
  if (photo.loading !== "lazy" || photo.decoding !== "async") {
    fail(`img ${JSON.stringify(photo.src)}: loading/decoding must be lazy/async`);
  }
  if (!photo.width || !photo.height) {
    fail(`img ${JSON.stringify(photo.src)}: explicit width/height required against layout shift`);
  }
}
/* The wired slots replaced their `image pending` boxes: no placeholder element and no
   placeholder label may stay behind. (The two figure captions are dictionary text and
   are not this check's business — their wording belongs to the copy lane.) */
if (html.includes("scholarly__pending")) {
  fail("a .scholarly__pending placeholder box is still rendered");
}
if (/>image pending</.test(html)) {
  fail("the `image pending` placeholder label is still rendered");
}

/* ---------- 6. one side per paired key ---------- */

/* A paired key (`…zh` / `…en`) renders only the page's own side (BLUEPRINT §6.4, run in
   one mode). Both dictionaries hold the same text for the two sides of a pair, so the
   count of the string is what proves it: twice would mean both sides reached the DOM. */
const PAIRED_TEXTS = [
  { key: "scholarly-igem.cta.en", label: "iGEM CTA" },
  { key: "scholarly.title.en", label: "section title" },
];
for (const { key, label } of PAIRED_TEXTS) {
  const text = en[key].text;
  const seen = html.split(text).length - 1;
  if (seen !== 1) {
    fail(`${label}: ${JSON.stringify(text)} appears ${seen} time(s), expected 1 (one side of the pair only)`);
  }
}

/* ---------- 7. annotations and colours ---------- */

if (html.includes("※")) {
  fail("the ※ design annotation is rendered (BLUEPRINT §6.4 / CHROME.md §2)");
}
if (/#[0-9a-fA-F]{3,8}\b/.test(html)) {
  fail("a hex colour leaked into the markup");
}

/* ---------- 8. dictionary-sourced accessible names ---------- */

/* Every visible string the dictionaries carry, mapped to the language of its entry (the
   two dictionaries hold the same text for fallback entries, so the set can hold two). */
const langsOfText = new Map();
for (const dictionary of [en, zh]) {
  for (const entry of Object.values(dictionary)) {
    if (!langsOfText.has(entry.text)) {
      langsOfText.set(entry.text, new Set());
    }
    langsOfText.get(entry.text).add(entry.lang);
  }
}

/** Every element of the markup that carries an accessible name, with its attributes. */
const labelled = [];
for (const match of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
  if (!match[2].includes("aria-label=")) {
    continue;
  }
  const attrs = {};
  for (const attr of match[2].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
    attrs[attr[1]] = attr[2];
  }
  labelled.push({ selector: attrs.id ? `#${attrs.id}` : `<${match[1]}>`, attrs });
}

/* The i18n module wrote the page language onto the stubbed documentElement at import time. */
const named = labelled.filter((element) => langsOfText.has(element.attrs["aria-label"]));
for (const element of named) {
  const expected = [...langsOfText.get(element.attrs["aria-label"])];
  const actual = element.attrs.lang ?? documentElement.lang;
  if (!expected.includes(actual)) {
    fail(
      `${element.selector}: aria-label ${JSON.stringify(element.attrs["aria-label"])} ` +
        `expects lang ${expected.join("/")}, got ${JSON.stringify(actual)}`,
    );
  }
}
for (const id of ["scholarly-jhu-q1", "scholarly-jhu-q2", "scholarly-jhu-q3"]) {
  if (!named.some((element) => element.attrs.id === id)) {
    fail(`#${id}: no dictionary-sourced aria-label to check`);
  }
}

/* ---------- chrome texts and sub-block order ---------- */

const texts = ["scholarly.revealTap", "scholarly.revealSwipe", "scholarly.linkPdf"];
for (const key of texts) {
  /* A key this table names but the dictionary no longer has must be reported, not thrown out
     of the gate: docx-1027 removed the HIR meta line from this list, and a bare `en[key].text`
     crashed the whole check on a stack trace instead of naming the missing key. */
  const entry = en[key];
  if (entry === undefined) {
    fail(`docs/copy-en.json has no ${key}, and this check still asserts its copy`);
  } else if (!html.includes(entry.text)) {
    fail(`chrome text missing from the markup: ${key}`);
  }
}
/* docx page 3: each of the three JHU riddles carries its own prompt under the English
   question, and the block's old single `tap to reveal` line is gone. Counted rather than
   merely looked for: the copy-wiring check cannot see a 2-of-3 removal, because the same
   key stays referenced by the surviving card. */
const JHU_HINT = en["scholarly.revealClick"].text;
const jhuHints = (html.match(new RegExp(`class="scholarly__hint scholarly__hint--jhu"`, "g")) ?? []).length;
if (jhuHints !== 3) {
  fail(`JHU prompts ${jhuHints} != 3: every riddle carries its own "${JHU_HINT}" line`);
}
if (!html.includes(`>${JHU_HINT}</p>`)) {
  fail(`the JHU prompts do not render scholarly.revealClick verbatim (${JSON.stringify(JHU_HINT)})`);
}
let cursor = -1;
for (const key of ["scholarly-igem.no", "scholarly-jhu.no", "scholarly-immuno.no", "scholarly-hir.no"]) {
  const at = html.indexOf(`>${en[key].text}</p>`);
  if (at < 0) {
    fail(`sub-block number ${en[key].text} not rendered`);
  } else if (at < cursor) {
    fail(`sub-block ${key} is out of the frozen order iGEM → JHU → Immunotherapy → HIR`);
  } else {
    cursor = at;
  }
}

/* ---------- report ---------- */

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} SSR DOM problem(s); markup in ${HTML_OUT}`);
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `PASS: SSR markup (${html.length} B, ${HTML_OUT}) — h2=1 h3=4 h4=2 h1=0, ` +
    `${triggers.length} reveal triggers closed with a live panel id, ` +
    `${panels.length} panels on data-state="closed" (no hidden, no aria-hidden, no inline style), ` +
    `${answerBlocks.length} answer blocks on tiers ${[...tiers.keys()].sort().join("/")}, ` +
    `${groups.length} groups, ${withHook("motion-clip").length} mask sweeps / ` +
    `${withHook("motion-slide").length} ordinals / ${withHook("motion-hover").length} hover cards, ` +
    `${photos.length} lazy photos, en only (no CJK, lang=["en"]), one side per paired key`,
);
console.log(
  `PASS: ${named.length} dictionary-sourced aria-label(s) carry their entry's language ` +
    `(${[...new Set(named.map((element) => element.selector))].join(", ")})`,
);
