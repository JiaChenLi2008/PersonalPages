#!/usr/bin/env node
/*
 * DOM check for the two structures docx-2026-10 adds to Music (03) and Sport (04).
 *
 * Neither structure existed before this lane, so no gate measured them: the wall could
 * lose a photograph and the résumé table could be re-sorted without a single red run.
 * This check renders both sections through the same in-repo SSR path the other DOM gates
 * use (Vite JS API, virtual entry, `vite build --ssr`) and asserts what only markup shows:
 *
 *   1. each wall carries exactly its contract photo count — Music 9 (`music-wall-1..9`),
 *      Sport 4 (`sport-wall-1..4`) — in contract order, in the real track and again in the
 *      seamless loop's clone, so a photo cannot disappear behind the duplicate;
 *   2. both walls' photographs are decoration — `alt=""`, `loading="lazy"`,
 *      `decoding="async"` (BLUEPRINT §6.3 / §2.11) — while every photo in the real track is a
 *      lightbox trigger named by the chrome key `photo.zoom`, and the loop's clone track is
 *      `aria-hidden="true"` with `tabindex="-1"` (docx-1023 第 5 条: 照片可点开放大). The
 *      strip container itself is no longer `aria-hidden`: a focusable control inside one is
 *      unreachable;
 *   3. the wall sits after the section head and before the body (docx: Music "这个 section
 *      加一个照片墙", Sport "先放照片滚动墙");
 *   4. the résumé table is 14 body rows × 3 columns under 3 `<th scope="col">`, its dates run
 *      date-descending, every cell is that row's own dictionary entry, and the table carries
 *      an accessible name taken from a dictionary-sourced heading;
 *   4b. the twelve-instrument grid of docx-1021 items 1…12 renders its twelve tiles in contract
 *      order, each with its own cartoon drawing (`media/percussion/<slug>.svg`, alt="") and its
 *      own dictionary text under that entry's `lang` (the mark the hover swap replaces with the
 *      other side's) with `tabindex="0"` for keyboard reach, ahead of the table. The docx's
 *      interaction is "从图片变成乐器的英文": the tile shows the drawing only until hovered, so
 *      the CSS must start the name at `opacity: 0` and raise it on `:hover` / `:focus-visible`;
 *   5. Music's 4:3 figure still renders the T1 photograph (`music-fig-720.webp`) with its own
 *      alt key; Sport renders the docx's `sport.lead` and no longer its superseded
 *      `sport.body` (the ruling is "replace", and both keys are still in the dictionaries);
 *   6. the en render carries no CJK.
 *
 * Usage: node tools/verify-music-sport-dom.mjs   (exit 0 = pass, 1 = any failed assertion)
 *
 * Temporary output: /tmp/music-sport-ssr-out (rebuilt each run) + /tmp/music-sport-ssr.html.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "vite";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = "/tmp/music-sport-ssr-out";
const HTML_OUT = "/tmp/music-sport-ssr.html";
const ENTRY_ID = "\0virtual:music-sport-ssr-entry";
const MUSIC = join(REPO, "src", "sections", "Music", "Music.tsx");
const SPORT = join(REPO, "src", "sections", "Sport", "Sport.tsx");

const failures = [];
const fail = (message) => failures.push(message);

/* The shared i18n module writes the page language onto document.documentElement at import
   time; the renderer provides that one property, as the sibling gates do. */
const documentElement = {};

const entrySource = `
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Music } from ${JSON.stringify(MUSIC)};
import { Sport } from ${JSON.stringify(SPORT)};

export function renderMusicSport() {
  return renderToStaticMarkup(createElement(Fragment, null, createElement(Music), createElement(Sport)));
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
      name: "music-sport-ssr-entry",
      resolveId: (id) => (id === ENTRY_ID ? ENTRY_ID : null),
      load: (id) => (id === ENTRY_ID ? entrySource : null),
    },
  ],
});

globalThis.document = { documentElement };
const { renderMusicSport } = await import(pathToFileURL(join(OUT_DIR, "entry.js")).href);
const html = renderMusicSport();
writeFileSync(HTML_OUT, html);

const en = JSON.parse(readFileSync(join(REPO, "docs", "copy-en.json"), "utf8"));

/* ---------- markup helpers ---------- */

const decode = (markup) =>
  markup
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

const textOf = (markup) => decode(markup.replace(/<[^>]*>/g, "")).trim();

/** The markup of one section, from its `<section` to the next one. */
function sectionMarkup(section) {
  const start = html.indexOf(`data-section="${section}"`);
  if (start < 0) return "";
  const next = html.indexOf("<section", start);
  return html.slice(start, next < 0 ? html.length : next);
}

/** Attributes of every `<tag …>` in a markup slice, as plain objects. */
function tagsOf(markup, name) {
  const found = [];
  for (const match of markup.matchAll(new RegExp(`<${name}\\b([^>]*)>`, "g"))) {
    const attrs = {};
    for (const attr of match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attrs[attr[1]] = attr[2];
    }
    found.push(attrs);
  }
  return found;
}

/* ---------- 1./2./3. the two walls ---------- */

const WALLS = [
  { section: "music", name: "music-wall", count: 9, stem: "media/music-wall-" },
  { section: "sport", name: "sport-wall", count: 4, stem: "media/sport-wall-" },
];

for (const wall of WALLS) {
  const markup = sectionMarkup(wall.section);
  const label = `${wall.section} wall`;
  if (markup === "") {
    fail(`${label}: src/sections/${wall.section} renders no data-section="${wall.section}"`);
    continue;
  }

  const stripAt = markup.indexOf(`data-strip="${wall.name}"`);
  if (stripAt < 0) {
    fail(`${label}: no <div data-strip="${wall.name}"> in the section`);
    continue;
  }
  const strip = markup.slice(stripAt);
  /* The strip ends after the reel's second track; everything past it is the section body,
     whose own photographs must not be counted as wall photos. */
  const stripEnd = strip.indexOf("</div></div>");
  if (stripEnd < 0) {
    fail(`${label}: data-strip="${wall.name}" is not followed by a closing reel`);
    continue;
  }
  const stripMarkup = strip.slice(0, stripEnd);
  /* The strip holds the wall's lightbox triggers now, so it may not be aria-hidden: a
     focusable control inside such a subtree is unreachable, not decoration. What stays
     decorative is each photograph (`alt=""`, asserted below). */
  const reelAt = stripMarkup.indexOf('class="photo-strip__reel"');
  if (reelAt < 0) {
    fail(`${label}: the strip has no .photo-strip__reel`);
    continue;
  }
  if (/aria-hidden="true"/.test(stripMarkup.slice(0, reelAt))) {
    fail(`${label}: the wall container is aria-hidden="true", which would hide its lightbox triggers`);
  }

  /* The loop's second copy is the clone; the real track is everything before it. */
  const cloneAt = stripMarkup.indexOf('data-clone="true"');
  if (cloneAt < 0) {
    fail(`${label}: the seamless loop has no cloned track (data-clone="true")`);
    continue;
  }
  const realTrack = stripMarkup.slice(0, cloneAt);
  const cloneTrack = stripMarkup.slice(cloneAt);
  const realPhotos = tagsOf(realTrack, "img");
  const clonePhotos = tagsOf(cloneTrack, "img");

  /* docx-1023 第 5 条: a wall photo enlarges on click, and its button name is the one chrome
     key this lane adds. Named per button, because a trigger without an `aria-label` is a
     control a screen reader reads out as "button". */
  const zoomLabel = en["photo.zoom"].text;
  const realButtons = tagsOf(realTrack, "button");
  const cloneButtons = tagsOf(cloneTrack, "button");
  if (realButtons.length !== wall.count) {
    fail(`${label}: ${realButtons.length} lightbox trigger(s) in the track, expected ${wall.count}`);
  }
  for (const button of realButtons) {
    if (button.type !== "button") {
      fail(`${label}: wall trigger has type=${JSON.stringify(button.type)}, expected "button"`);
    }
    if (button["aria-label"] !== zoomLabel) {
      fail(
        `${label}: wall trigger has aria-label=${JSON.stringify(button["aria-label"])}, ` +
          `expected ${JSON.stringify(zoomLabel)} (photo.zoom)`,
      );
    }
  }
  if (cloneButtons.length !== realButtons.length) {
    fail(
      `${label}: the cloned track carries ${cloneButtons.length} button(s) but the real track ` +
        `${realButtons.length}; the loop would jump`,
    );
  }
  for (const button of cloneButtons) {
    if (button["aria-hidden"] !== "true" || button.tabindex !== "-1") {
      fail(
        `${label}: a clone button is aria-hidden=${JSON.stringify(button["aria-hidden"])} ` +
          `tabindex=${JSON.stringify(button.tabindex)}, expected the loop's copy to be ` +
          `aria-hidden="true" tabindex="-1" (the same photo must not be focusable twice)`,
      );
    }
    /* A visible clone is still a mouse target: same trigger class and same photo.zoom name
       as the real track, so it cannot regress to the old pointer-events:none ghost. */
    const classes = String(button.class ?? "").split(/\s+/);
    if (!classes.includes("lightbox__trigger") || classes.includes("photo-strip__clone")) {
      fail(
        `${label}: a clone button has class=${JSON.stringify(button.class)}, expected ` +
          `lightbox__trigger (a clickable photo, not a pointer-events:none clone)`,
      );
    }
    if (button["aria-label"] !== zoomLabel) {
      fail(
        `${label}: a clone button has aria-label=${JSON.stringify(button["aria-label"])}, ` +
          `expected ${JSON.stringify(zoomLabel)} (photo.zoom)`,
      );
    }
  }

  if (realPhotos.length !== wall.count) {
    fail(`${label}: ${realPhotos.length} photo(s) in the track, expected ${wall.count}`);
  }
  if (clonePhotos.length !== realPhotos.length) {
    fail(
      `${label}: the cloned track carries ${clonePhotos.length} photo(s) but the real track ` +
        `${realPhotos.length}; the loop would jump`,
    );
  }
  const expected = Array.from({ length: wall.count }, (_, index) => `${wall.stem}${index + 1}.webp`);
  const actual = realPhotos.map((photo) => photo.src);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label}: photos ${JSON.stringify(actual)} != the contract's ${JSON.stringify(expected)}`);
  }
  for (const photo of realPhotos) {
    if (photo.alt !== "") {
      fail(`${label}: img ${photo.src} has alt=${JSON.stringify(photo.alt)}, expected "" (decoration)`);
    }
    if (photo.loading !== "lazy" || photo.decoding !== "async") {
      fail(`${label}: img ${photo.src} is loading=${photo.loading} decoding=${photo.decoding}, expected lazy/async`);
    }
  }

  /* The copy count is measured, not fixed: one track must cover the strip, and the reel
     must always hold at least one full track beyond it. A fixed two copies is the exact
     regression the user reported — Sport's four photos are 1232px against a 1329px strip,
     so two copies left a bare gap at the right edge and the junction read as a seam. The
     component must derive the count from a measurement, so the source has to carry a
     ResizeObserver and a ceiling on (strip + track) / track. */
  const component = readFileSync(join(REPO, "src/components/PhotoStrip/PhotoStrip.tsx"), "utf8");
  if (!/ResizeObserver/.test(component)) {
    fail(`${label}: PhotoStrip does not measure the strip (no ResizeObserver); a fixed copy count gaps at wide viewports`);
  }
  if (!/Math\.ceil\(\(stripWidth \+ trackWidth\) \/ trackWidth\)/.test(component)) {
    fail(`${label}: PhotoStrip does not derive the copy count from strip and track width`);
  }
  if (!/--strip-shift/.test(component)) {
    fail(`${label}: PhotoStrip does not set --strip-shift, so a 3+ copy reel would shift by -50% and jump`);
  }

  /* The wall holds still under the pointer and for the keyboard reader: the pause is one
     attribute the component sets from `pointerenter`/`pointerleave` (mouse) and a
     `:focus-visible` inside the wall, and one `animation-play-state` switch in the
     stylesheet. No second way of moving the reel, no dependency on the hover media query —
     the host browser reports `hover: none`, so the wall would never pause if the switch
     were gated on it. */
  const stripCss = readFileSync(join(REPO, "src/components/PhotoStrip/PhotoStrip.css"), "utf8");
  for (const [needle, why] of [
    ["onPointerEnter", "PhotoStrip does not listen to pointerenter"],
    ["onPointerLeave", "PhotoStrip does not listen to pointerleave"],
    ['data-paused={paused ? "true" : undefined}', "PhotoStrip does not expose the pause as data-paused"],
    [".photo-strip[data-paused=\"true\"] .photo-strip__reel", "PhotoStrip.css does not pause the reel on data-paused"],
    ["animation-play-state: paused", "PhotoStrip.css does not hold the reel (no animation-play-state)"],
  ]) {
    const source = needle.startsWith(".") || needle.startsWith("animation") ? stripCss : component;
    if (!source.includes(needle)) {
      fail(`${label}: ${why}`);
    }
  }

  /* docx order: the wall comes after head + baseline and before the body. */
  const bodyAt = markup.indexOf(`${wall.section}__body`);
  if (bodyAt >= 0 && stripAt > bodyAt) {
    fail(`${label}: the wall sits after .${wall.section}__body; the docx puts it ahead of the text`);
  }
  const headAt = markup.indexOf(`id="${wall.section}-title"`);
  if (headAt < 0 || stripAt < headAt) {
    fail(`${label}: the wall is not after the section head (#${wall.section}-title)`);
  }
}

/* ---------- 4. the résumé table ---------- */

const music = sectionMarkup("music");
const tableAt = music.indexOf("<table");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

if (tableAt < 0) {
  fail("music table: the section renders no <table>");
} else {
  const table = music.slice(tableAt, music.indexOf("</table>", tableAt));
  const heads = tagsOf(table, "th");
  if (heads.length !== 3 || heads.some((head) => head.scope !== "col")) {
    fail(`music table: ${heads.length} <th scope="col">, expected the three column names`);
  }
  const headTexts = tagsOf(table, "th").length === 3
    ? ["music.resume.head.date", "music.resume.head.theme", "music.resume.head.venue"].map(
        (key) => en[key].text,
      )
    : [];
  const renderedHeads = [...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((match) => textOf(match[1]));
  if (JSON.stringify(renderedHeads) !== JSON.stringify(headTexts)) {
    fail(
      `music table: column names ${JSON.stringify(renderedHeads)} != the dictionary's ` +
        JSON.stringify(headTexts),
    );
  }

  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((match) => [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => textOf(cell[1])))
    .filter((cells) => cells.length > 0);
  if (rows.length !== 14) {
    fail(`music table: ${rows.length} body row(s), the docx lists 14 performances`);
  }

  /* Date-descending: read each row's own date cell, never the dictionary's row order, so a
     re-sorted table is caught even if its cells are all still real entries. */
  /* Date order: the table is sortable, so either monotonic direction is legal — but a table
     that is not monotonic in either direction, or whose rows drifted out of the dictionary,
     still fails. The direction must also match the `aria-sort` the head advertises, or the
     arrow and the data would disagree. */
  const keys = rows.map((cells) => {
    const match = /^([A-Z][a-z]{2}) (\d{4})$/.exec(cells[0] ?? "");
    const month = match === null ? -1 : MONTHS.indexOf(match[1]);
    return match === null ? Number.NaN : Number(match[2]) * 12 + (month < 0 ? Number.NaN : month);
  });
  let descending = true;
  let ascending = true;
  keys.forEach((key, index) => {
    if (Number.isNaN(key)) {
      fail(`music table row ${index + 1}: date ${JSON.stringify(rows[index]?.[0])} is not a month + year`);
      return;
    }
    if (index === 0 || Number.isNaN(keys[index - 1])) {
      return;
    }
    if (key > keys[index - 1]) descending = false;
    if (key < keys[index - 1]) ascending = false;
  });
  if (!descending && !ascending) {
    fail("music table: dates are monotonic in neither direction — the rows are out of order");
  }
  const advertised = /aria-sort="(ascending|descending)"/.exec(table)?.[1];
  if (advertised === undefined) {
    fail('music table: the date head carries no aria-sort, so the sort control is unannounced');
  } else if (advertised === "ascending" ? !ascending : !descending) {
    fail(
      `music table: aria-sort="${advertised}" but the rows read ` +
        `${ascending ? "ascending" : descending ? "descending" : "neither"}`,
    );
  }
  /* The control itself: a button inside the date head, so the column name is clickable and
     keyboard-reachable rather than a bare glyph. */
  if (!/<th\b[^>]*>\s*<button\b/.test(table)) {
    fail("music table: the date head renders no <button>, so the sort control is not operable");
  }

  /* Every cell is that row's own entry: a key that fell out of the dictionary would fall
     back to en and quietly break the one-language-per-page rule. */
  rows.forEach((cells, index) => {
    const row = `r${String(index + 1).padStart(2, "0")}`;
    ["date", "theme", "venue"].forEach((column, at) => {
      const wanted = en[`music.resume.${row}.${column}`];
      if (wanted === undefined) {
        fail(`music table row ${index + 1}: docs/copy-en.json has no music.resume.${row}.${column}`);
      } else if (cells[at] !== wanted.text) {
        fail(
          `music table row ${index + 1} ${column}: ${JSON.stringify(cells[at])} != ` +
            `music.resume.${row}.${column} (${JSON.stringify(wanted.text)})`,
        );
      }
    });
  });

  /* The table's accessible name: the region wrapper names itself by the section heading,
     which is itself dictionary-sourced — the dictionaries carry no caption key. */
  const before = music.slice(Math.max(0, tableAt - 400), tableAt);
  const region = /role="region"[^>]*aria-labelledby="([^"]+)"/.exec(before);
  if (region === null) {
    fail('music table: no role="region" aria-labelledby="…" wrapper, so the table has no accessible name');
  } else if (!music.includes(`id="${region[1]}"`)) {
    fail(`music table: aria-labelledby="${region[1]}" names an id the section does not render`);
  }
}

/* ---------- 5. the twelve-instrument grid (docx-1021 items 1…12) ---------- */

/* The grid is new structure: without this block a tile could be deleted, reordered, lose its
   drawing or render the wrong language and every gate would stay green. Each tile pairs one
   drawing with the page's own side of its key under that entry's `lang`, which is the mark the
   hover swap replaces with the other side's — so a tile that loses its `lang`, or a tile whose
   drawing drifted out of the contract order, fails here. The drawing's own file is checked on
   disk: the pair is only half a pair if the SVG is missing. */
const PERCUSSION = Array.from(
  { length: 12 },
  (_, index) => `music.perc.${String(index + 1).padStart(2, "0")}`,
);
const PERCUSSION_ART = [
  "01-handpan",
  "02-marimba",
  "03-drum-kit",
  "04-timpani",
  "05-cymbals",
  "06-vibraphone",
  "07-tubular-bells",
  "08-xylophone",
  "09-glockenspiel",
  "10-tambourine",
  "11-clapper",
  "12-congas",
];
const percGrid = /<ul class="music__perc">([\s\S]*?)<\/ul>/.exec(music);
if (percGrid === null) {
  fail("music percussion: the section renders no <ul class=\"music__perc\"> grid");
} else {
  const tiles = [...percGrid[1].matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/g)].map((match) => {
    const attrs = {};
    for (const attr of match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attrs[attr[1]] = attr[2];
    }
    const art = /<img\b([^>]*)>/.exec(match[2]);
    const artAttrs = {};
    for (const attr of (art?.[1] ?? "").matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      artAttrs[attr[1]] = attr[2];
    }
    const name = /<span\b([^>]*)>([\s\S]*?)<\/span>/.exec(match[2]);
    const nameAttrs = {};
    for (const attr of (name?.[1] ?? "").matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      nameAttrs[attr[1]] = attr[2];
    }
    return { attrs, art: artAttrs, name: nameAttrs, text: decode(name?.[2] ?? "").trim() };
  });
  if (tiles.length !== PERCUSSION.length) {
    fail(`music percussion: ${tiles.length} tile(s), the docx lists ${PERCUSSION.length} instruments`);
  }
  PERCUSSION.forEach((key, index) => {
    const wanted = en[key];
    if (wanted === undefined) {
      fail(`music percussion tile ${index + 1}: docs/copy-en.json has no ${key}`);
      return;
    }
    const tile = tiles[index];
    if (tile === undefined) {
      return;
    }
    if (tile.text !== wanted.text) {
      fail(
        `music percussion tile ${index + 1}: ${JSON.stringify(tile.text)} != ${key} ` +
          `(${JSON.stringify(wanted.text)})`,
      );
    }
    if (tile.name.lang !== wanted.lang) {
      fail(
        `music percussion tile ${index + 1}: lang=${JSON.stringify(tile.name.lang)} != ` +
          `${JSON.stringify(wanted.lang)} (the tile's own dictionary entry) — the hover swap ` +
          `replaces this mark with the other side's, so the tile must carry one`,
      );
    }
    if (tile.attrs.tabindex !== "0") {
      fail(`music percussion tile ${index + 1}: not reachable by keyboard (tabindex missing)`);
    }
    const slug = PERCUSSION_ART[index];
    if (tile.art.src !== `media/percussion/${slug}.svg`) {
      fail(
        `music percussion tile ${index + 1}: drawing ${JSON.stringify(tile.art.src)} != ` +
          `"media/percussion/${slug}.svg" — the tile and its drawing are one pair`,
      );
    }
    if (tile.art.alt !== undefined && tile.art.alt !== "") {
      fail(`music percussion tile ${index + 1}: the drawing is decoration, alt must be empty`);
    }
    /* Explicit width/height is what reserves the box before the SVG arrives; without it the
       twelve tiles reflow on load. Both must match the drawing's own square. */
    if (tile.art.width !== "56" || tile.art.height !== "56") {
      fail(
        `music percussion tile ${index + 1}: drawing width/height ` +
          `${JSON.stringify([tile.art.width, tile.art.height])} != ["56","56"] (CLS reservation)`,
      );
    }
    if (!existsSync(join(REPO, "public", "media", "percussion", `${slug}.svg`))) {
      fail(`music percussion tile ${index + 1}: public/media/percussion/${slug}.svg is missing`);
    }
  });
  const gridAt = music.indexOf('<ul class="music__perc">');
  if (gridAt > tableAt) {
    fail("music percussion: the grid sits after the résumé table; the docx puts it ahead of it");
  }

  /* The docx's interaction is "从图片变成乐器的英文", not "drawing beside a permanent name":
     the tile must open on the drawing alone. Reading the stylesheet is the only way to catch
     a regression to the always-visible name — markup alone cannot tell, because the name has
     to stay in the DOM to be the tile's accessible label. */
  const musicCss = readFileSync(join(REPO, "src", "sections", "Music", "Music.css"), "utf8");
  /* Declarations of every top-level block whose selector list contains the exact selector.
     A selector can appear in a grouped rule (`.a, .b { … }`), so match by splitting the list. */
  const declarations = (selector) => {
    const found = [];
    for (const [, selectors, body] of musicCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const list = selectors.split(",").map((part) => part.trim().replace(/\s+/g, " "));
      if (list.includes(selector)) {
        found.push(body);
      }
    }
    return found.join("\n");
  };
  const nameIdle = declarations(".music__percName");
  if (!/opacity:\s*0\s*;/.test(nameIdle)) {
    fail(
      "music percussion: .music__percName does not start at opacity: 0 — the docx wants the " +
        "drawing alone until hover, not a permanent name beside it",
    );
  }
  if (!/opacity:\s*1\s*;/.test(declarations(".music__percItem:hover .music__percName"))) {
    fail("music percussion: hovering a tile does not reveal .music__percName (opacity: 1 missing)");
  }
  if (!/opacity:\s*0\s*;/.test(declarations(".music__percItem:hover .music__percArt"))) {
    fail("music percussion: hovering a tile does not hide .music__percArt (opacity: 0 missing)");
  }
  if (!/opacity:\s*1\s*;/.test(declarations(".music__percItem:focus-visible .music__percName"))) {
    fail("music percussion: keyboard focus does not reveal the name (opacity: 1 missing)");
  }
  const shared = declarations(".music__percArt") + declarations(".music__percName");
  if (!/grid-area:\s*1\s*\/\s*1\s*;/.test(shared)) {
    fail("music percussion: drawing and name do not share one grid cell (grid-area: 1 / 1)");
  }

  /* The name must speak the page's own language in both states. The earlier build swapped to
     the *other* dictionary on hover, which made the English page reveal Chinese — the docx's
     "从图片变成乐器的英文" is a picture-to-name swap, not a language swap. The rendered markup
     above already pins each name to its own entry's lang; this pins the source so a future
     edit cannot reintroduce a second dictionary read. */
  const musicTsx = readFileSync(MUSIC, "utf8");
  if (/dictionaries\s*\.\s*(?:en|zh)/.test(musicTsx)) {
    fail(
      "music percussion: Music.tsx reads a dictionary directly — the hover name must be the " +
        "page's own entry, never the other language's",
    );
  }
  if (/onMouseEnter|onMouseLeave|onFocus=|onBlur=/.test(musicTsx)) {
    fail(
      "music percussion: the tile swap is driven by React handlers; it must be CSS-only " +
        "(:hover / :focus-visible) so the shown name can never diverge from the page language",
    );
  }
}

/* ---------- 5b. the docx-1023 lead-ins (段[2]…[6]) ---------- */

/* Two copy blocks the dictionaries already carried and the section did not render: the three
   lines that introduce the twelve drawings and the two that introduce the résumé table. Their
   text alone cannot show a missing placement — every key also stays reachable if it is moved —
   so each key is located in the section's reading order: ahead of the grid it introduces, or
   ahead of the table. Positions are read from the decoded markup, because the dictionary text
   carries characters React escapes in the raw string. */
const readableMusic = decode(music);
const gridInReadable = readableMusic.indexOf('<ul class="music__perc">');
const tableInReadable = readableMusic.indexOf("<table");
const positionOf = (key) => {
  const entry = en[key];
  return entry === undefined ? -1 : readableMusic.indexOf(entry.text);
};

let introCursor = -1;
for (const key of ["music.intro.p1", "music.intro.p2", "music.intro.p3"]) {
  const position = positionOf(key);
  if (position < 0) {
    fail(`music intro: ${key} does not reach the markup, so the docx's 段[2]…[4] line is missing`);
  } else if (gridInReadable < 0) {
    fail(`music intro: ${key} has no twelve-icon list after it to introduce`);
  } else if (position > gridInReadable) {
    fail(`music intro: ${key} sits after the twelve-icon list; the docx puts it between the body and the drawings`);
  } else if (position < introCursor) {
    fail(`music intro: ${key} is out of the docx order 段[2] → 段[3] → 段[4]`);
  }
  introCursor = Math.max(introCursor, position);
}

let resumeIntroCursor = -1;
for (const key of ["music.resume.intro1", "music.resume.intro2"]) {
  const position = positionOf(key);
  if (position < 0) {
    fail(`music résumé intro: ${key} does not reach the markup, so the docx's 段[5]…[6] line is missing`);
  } else if (tableInReadable < 0) {
    fail(`music résumé intro: ${key} has no résumé table after it to introduce`);
  } else if (position > tableInReadable) {
    fail(`music résumé intro: ${key} sits after the table; the docx puts it between the drawings and the résumé`);
  } else if (position < resumeIntroCursor) {
    fail(`music résumé intro: ${key} is out of the docx order 段[5] → 段[6]`);
  }
  resumeIntroCursor = Math.max(resumeIntroCursor, position);
}

/* ---------- 6. the figure and the lead ---------- */

const figure = /<img\b[^>]*src="(media\/music-fig-[^"]+)"[^>]*alt="([^"]*)"/.exec(music);
if (figure === null) {
  fail("music figure: the 4:3 slot no longer renders a music-fig photo with its alt");
} else if (figure[1] !== "media/music-fig-720.webp") {
  fail(`music figure: src ${JSON.stringify(figure[1])} is not the T1 photograph media/music-fig-720.webp`);
} else if (figure[2] !== en["music.fig.alt"].text) {
  fail(
    `music figure: alt ${JSON.stringify(figure[2])} != music.fig.alt ` +
      `(${JSON.stringify(en["music.fig.alt"].text)})`,
  );
}

const sport = sectionMarkup("sport");
if (!decode(sport).includes(en["sport.lead"].text)) {
  fail("sport lead: the docx's paragraph (sport.lead) is not rendered in the section");
}
/* The user ruling is "the new sentence replaces the old one", so the old sentence must be
   gone. It is still in both dictionaries, which is exactly why this assertion has to read
   the markup: the dictionary alone can no longer tell the two states apart. */
if (decode(sport).includes(en["sport.body"].text)) {
  fail("sport lead: the superseded paragraph (sport.body) is still rendered; sport.lead replaces it");
}
if (sport.indexOf("data-strip=") > sport.indexOf("sport__body")) {
  fail("sport lead: the wall must come before the body (docx 页面7 先放照片滚动墙)");
}
/* docx-1023 item 9（用户裁决）：the Sport KV row is removed. The two dictionary keys stay
   for Hero's own row, so the markup is the only place the deletion can be proven. */
if (/class="sport__kv\b/.test(sport)) {
  fail("sport KV: .sport__kv is still rendered; docx-1023 item 9 removes the whole row");
}
if (decode(sport).includes(en["hero.val.sport"].text)) {
  fail(
    `sport KV: the removed row's value (${JSON.stringify(en["hero.val.sport"].text)}) ` +
      "is still rendered inside #sport; the keys stay for Hero only",
  );
}

/* docx-1023 item 8（用户裁决）：去右侧重复标题、kicker 14px/--c-blue。The head's kicker
   alone names the section: neither a duplicate English title class nor a second span may
   survive in Music/Sport. */
for (const [name, markup] of [
  ["music", music],
  ["sport", sport],
]) {
  if (new RegExp(`class="[^"]*\\b${name}__title-en\\b`).test(markup)) {
    fail(`${name} head: .${name}__title-en is still rendered; docx-1023 item 8 removes the duplicate`);
  }
  const head = new RegExp(`<h2\\b[^>]*class="[^"]*\\b${name}__head\\b[^"]*"[^>]*>([\\s\\S]*?)</h2>`).exec(markup);
  if (head === null) {
    fail(`${name} head: no <h2 class="${name}__head"> to check`);
  } else if ((head[1].match(/<span\b/g) ?? []).length !== 1) {
    fail(`${name} head: ${(head[1].match(/<span\b/g) ?? []).length} span(s) inside the h2, expected the kicker alone`);
  }
}

/* ---------- 6. one language ---------- */

const cjk = /[\u2e80-\u2eff\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/gu;
const cjkHits = html.match(cjk) ?? [];
if (cjkHits.length > 0) {
  fail(`the en render carries ${cjkHits.length} CJK character(s): ${JSON.stringify([...new Set(cjkHits)].join(""))}`);
}

/* ---------- report ---------- */

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} music/sport problem(s)`);
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `PASS: music wall 9 + sport wall 4 photos (track + clone, photo.zoom triggers, clone aria-hidden/tabindex=-1, lazy/async), ` +
    "walls ahead of their bodies, résumé table 14 rows × 3 columns date-descending, " +
    "cells are their own dictionary entries, percussion 12 tiles in contract order with drawing + lang + tabindex, " +
    "sport.body replaced, en only",
);
