#!/usr/bin/env node
/*
 * Responsive-fidelity check against BLUEPRINT §3.1-§3.3.
 *
 * ui.pen holds a single 1440 artboard, so §3 of the blueprint derives the narrow
 * tiers by ratio and lists them as the implementation supplement. This check
 * reads those tables and asserts, for every number they state, that the section
 * CSS actually carries it at the tier the table names:
 *
 *   §3.1 / §3.2 — token rows. The family (--gutter-x, --fs-64, …) fixes the
 *                 properties allowed to carry the value (padding, font-size, …);
 *                 a tier value must arrive as a declaration of one of those
 *                 properties inside a `@media (max-width: Npx)` block that
 *                 consumes the token — `var(--name)` or a tier form
 *                 `var(--name-tNNNN)` — on the selector that consumes the token
 *                 at 1440. Matching the section pool instead let the value be
 *                 moved to another selector of the same section and still pass.
 *                 A token no stylesheet consumes fails: the row would otherwise
 *                 never be checked.
 *   §3.3       — per-block rows. The numbers are anchored to the wording the
 *                 table uses (色块 / 方图 / `h`= / ≥ / gap / padding N/0, plus
 *                 `--token` and `Npx`) and must appear in that block's own CSS at
 *                 that tier. A `--token` number is held to that token's carriers
 *                 as above; plain numbers are matched against the block's own
 *                 declarations.
 *
 * Variable references are resolved through src/styles/tokens.css, so a value
 * carried by a token (var(--band-h-t900)) counts as the value it resolves to.
 *
 * Tiers are matched as `@media (max-width: Npx)` blocks, the form §3 and the
 * section stylesheets both use.
 *
 * docx-1027 deletes slots the frozen board still draws, and the values §3 asks of
 * them go with the slot: the photo band's caption bar (gap and its --pad-cap token)
 * and the footer's legal block (the 900 gap of its two-column shell). Those entries
 * are registered in REMOVED_BY_DOCX and judged by the same table the fidelity gates
 * use (tools/fidelity-docx-removal.mjs) — a key back in the dictionaries, or named
 * again under src/, fails this gate and names the node. A registration withholds a
 * value only when §3 still asks for exactly that number at that tier and anchor; an
 * entry that withholds nothing — a value §3 dropped, a token whose row no longer
 * matters — is reported too, so the table cannot turn into a hole.
 *
 * Output: breakpoints=<n> values_checked=<n> missing=<n> removed=<n>
 *   followed by one line per missing expectation: section / tier / value / files.
 * A §3 table the parser cannot read in full is an error: numbers left unread
 * inside a parsed table are reported and fail, so the gate never passes on a
 * partially understood table.
 *
 * Usage: node tools/verify-responsive.mjs   (exit 0 = every listed value wired)
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { judgeRemovedByDocx } from "./fidelity-docx-removal.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BLUEPRINT = join(ROOT, "docs", "BLUEPRINT.md");
const TOKENS_FILE = join(ROOT, "src", "styles", "tokens.css");
const SECTIONS_DIR = join(ROOT, "src", "sections");

/** The tier columns of every §3 table, as their breakpoint widths. */
const TIERS = [1200, 900, 600];

/** §3.3 block name -> section directory. */
const BLOCK_DIRS = {
  nav: "Nav",
  hero: "Hero",
  photoband: "PhotoBand",
  index: "Index",
  method: "Method",
  values: "Values",
  footer: "Footer",
};

/* docx-1027 删掉的槽位，键与三支 fidelity 同源（tools/fidelity-docx-removal.mjs 的 `{ keys, docx }`）。
   本门禁另记它扣下的条目：`tokens` 是只为那块 DOM 才被消费的 §3.1 token，`values` 是逐块、逐档、
   逐锚文的数字（`any` 即表里的「保持」；锚文就是 §3.3 那句话被读到的原文，如 `gap 24`）。 */
const REMOVED_BY_DOCX = {
  a6tTUe: {
    keys: ["photoband.figcap", "photoband.altnote"],
    docx: "docx-1027 第 3 条",
    tokens: ["--pad-cap"],
    values: { photoband: [["any", "gap 24"], [900, "gap 8"], [600, "gap 8"]] },
  },
  Q6Bqn: {
    keys: ["footer.legal"],
    docx: "docx-1027 第 10 条",
    values: { footer: [[900, "gap 16"]] },
  },
};

/** §3.1 / §3.2 token family -> the properties allowed to carry its value. */
const FAMILY_PROPS = {
  "--gutter-x": ["padding", "padding-inline", "padding-left", "padding-right"],
  "--pad-section-y": ["padding"],
  "--pad-hero": ["padding"],
  "--pad-footer": ["padding"],
  "--pad-card": ["padding"],
  "--pad-row": ["padding"],
  "--pad-cap": ["padding"],
  "--nav-h": ["height", "min-height"],
  "--fs-": ["font-size"],
  "--col-hero-right": ["width", "flex", "flex-basis"],
  "--band-h": ["height"],
  "--num-block": ["width", "height", "line-height"],
  "--thumb": ["width", "height"],
  "--card-h": ["height"],
};

function familyProps(token) {
  const family = Object.keys(FAMILY_PROPS).find((name) =>
    name.endsWith("-") ? token.startsWith(name) : token === name,
  );
  return family === undefined ? null : { family, props: FAMILY_PROPS[family] };
}

/* ------------------------------------------------------------ stylesheets --- */

/** name -> value for every custom property declared in tokens.css. */
function tokenValues() {
  const tokens = new Map();
  const css = readFileSync(TOKENS_FILE, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].trim().replace(/\s+/g, " "));
  }
  return tokens;
}

const TOKENS = tokenValues();

/** Expands var(--x) against tokens.css, then returns the numbers it carries. */
function numbersOf(value) {
  let resolved = value;
  for (let round = 0; round < 8; round += 1) {
    const next = resolved.replace(/var\(\s*(--[\w-]+)\s*([^)]*)\)/g, (whole, name, rest) => {
      if (TOKENS.has(name)) return TOKENS.get(name);
      const fallback = rest.replace(/^\s*,\s*/, "").trim();
      return rest.includes(",") && fallback !== "" ? fallback : whole;
    });
    if (next === resolved) break;
    resolved = next;
  }
  return [...resolved.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
}

const SECTIONS = dirNames().map((name) => {
  const dir = join(SECTIONS_DIR, name);
  const files = readdirSync(dir).filter((file) => file.endsWith(".css"));
  return { name, dir, files };
});

function dirNames() {
  return readdirSync(SECTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Declarations of one stylesheet, tagged with the tier of the @media (max-width)
 * block they sit in (null at the top level).
 */
function declarations(css, file) {
  const found = [];
  const collect = (body, tier) => {
    for (const match of body.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const selector = match[1].replace(/\/\*[\s\S]*?\*\//g, " ").trim().replace(/\s+/g, " ");
      for (const decl of match[2].matchAll(/([-a-zA-Z][\w-]*)\s*:\s*([^;]+)/g)) {
        found.push({ file, selector, tier, prop: decl[1], value: decl[2].trim() });
      }
    }
  };

  let rest = css;
  for (const tier of TIERS) {
    const pattern = new RegExp(`@media\\s*\\(max-width:\\s*${tier}px\\)\\s*\\{`, "g");
    const blocks = [];
    for (const match of rest.matchAll(pattern)) {
      let depth = 1;
      let at = match.index + match[0].length;
      while (at < rest.length && depth > 0) {
        if (rest[at] === "{") depth += 1;
        if (rest[at] === "}") depth -= 1;
        at += 1;
      }
      collect(rest.slice(match.index + match[0].length, at - 1), tier);
      blocks.push([match.index, at]);
    }
    /* The whole block is blanked, not just its header: a body left in place was
       collected a second time at tier null, so every tier declaration also read
       as a 1440 one and the selector binding below could not tell them apart. */
    for (const [start, end] of blocks.reverse()) {
      rest = rest.slice(0, start) + " ".repeat(end - start) + rest.slice(end);
    }
  }
  collect(rest, null);
  return found;
}

/* -------------------------------------------------------------- blueprint --- */

const blueprint = readFileSync(BLUEPRINT, "utf8").split("\n");

/** Lines of one "### 3.x" section of the blueprint. */
function sectionLines(heading) {
  const start = blueprint.findIndex((line) => line.startsWith(heading));
  if (start === -1) throw new Error(`BLUEPRINT.md: heading "${heading}" not found`);
  let end = start + 1;
  while (end < blueprint.length && !/^#{2,3} /.test(blueprint[end])) end += 1;
  return blueprint.slice(start + 1, end);
}

/** Cells of a markdown table; separator rows and non-rows are dropped. */
function tableRows(lines) {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .slice(1, -1)
        .replace(/\\\|/g, "\u0001")
        .split("|")
        .map((cell) => cell.replace(/\u0001/g, "|").trim()),
    )
    .filter((cells) => !cells.every((cell) => /^:?-{2,}:?$/.test(cell)));
}

const unread = [];
const problems = [];
let checked = 0;
let breakpoints = 0;
let removed = 0;

/* The registrations that still hold, and the entries each one withholds. A stale one fails
   here, so a key the docx deleted cannot quietly come back under a withheld value. */
const { active: removedNodes, stale: staleRegistrations } = judgeRemovedByDocx(REMOVED_BY_DOCX, ROOT);
problems.push(...staleRegistrations);
const withheldTokens = new Map();
const withheldValues = new Map();
for (const node of removedNodes) {
  for (const token of REMOVED_BY_DOCX[node].tokens ?? []) withheldTokens.set(token, node);
  for (const [block, entries] of Object.entries(REMOVED_BY_DOCX[node].values ?? {})) {
    const known = withheldValues.get(block) ?? [];
    known.push(...entries.map(([tier, anchor]) => ({ node, tier, anchor, used: false })));
    withheldValues.set(block, known);
  }
}

/** Withholds one §3.3 number when a registration covers its block, tier and anchor text;
    returns true when it did, so the caller skips the expectation instead of the loop. */
function withheldNumber(block, tier, anchors) {
  for (const entry of withheldValues.get(block) ?? []) {
    if (entry.used || entry.tier !== tier || !anchors.has(entry.anchor)) continue;
    entry.used = true;
    removed += 1;
    return true;
  }
  return false;
}

/** The four values of one row, desktop first: null = "does not shrink". */
function rowValues(cells) {
  return cells.slice(1, 5).map((cell) => {
    const text = cell.replace(/`|\*/g, "").trim();
    if (text === "" || text.includes("不缩")) return null;
    const parts = text.split("/").map((part) => part.trim());
    const numbers = parts.map((part) => {
      const match = part.match(/^(\d+)(?:px)?$/);
      return match === null ? null : match[1];
    });
    return numbers.includes(null) ? null : `${numbers.join("/")}`;
  });
}

/** "56 / 48 / 40" and "56px" both become the number list [56, 48, 40]. */
function valueNumbers(value) {
  return value.split("/").map((part) => Number(part.trim().replace("px", "")));
}

function expect(label, tier, wanted, pool, props) {
  checked += 1;
  const hit = pool.some((declaration) => {
    /* A `max-width` block still matches every narrower width, so the value that
       applies at tier N may come from any block with a breakpoint >= N. */
    if (tier !== "any" && (declaration.tier === null || declaration.tier < tier)) return false;
    if (props !== null && !props.includes(declaration.prop)) return false;
    const numbers = numbersOf(declaration.value);
    return wanted.every((number) => numbers.includes(number));
  });
  if (!hit) {
    const where = [...new Set(pool.map((declaration) => relative(ROOT, declaration.file)))].join(", ");
    problems.push(`${label} @${tier}: ${wanted.join("/")}px missing in ${where}`);
  }
}

/* Each section's declarations, and the whole pool, for §3.1/§3.2 (global rows). */
const bySection = new Map();
const bySectionSheets = new Map();
const pool = [];
const stylesheets = [];
for (const section of SECTIONS) {
  const files = section.files.map((file) => {
    const path = join(section.dir, file);
    const css = readFileSync(path, "utf8");
    return { path, css, declarations: declarations(css, path) };
  });
  stylesheets.push(...files);
  const declarationsOfSection = files.flatMap((file) => file.declarations);
  bySection.set(section.name, declarationsOfSection);
  bySectionSheets.set(section.name, files);
  pool.push(...declarationsOfSection);
}

/**
 * The declarations a §3.1/§3.2 row can be checked against: a token row is global,
 * but only a stylesheet that consumes the token — `var(--name)` or one of its tier
 * forms `var(--name-tNNNN)` — can be asked to carry its value. Demanding it of
 * every section (as this check first did) is unsatisfiable for a token one section
 * consumes, such as --pad-row, and would keep the gate red forever. A token no
 * stylesheet consumes is reported as missing, never passed silently.
 */
function consumers(name) {
  const used = new RegExp(`var\\(\\s*${name}(?:-t\\d+)?\\s*[,)]`);
  return stylesheets
    .filter((stylesheet) => used.test(stylesheet.css))
    .flatMap((stylesheet) => stylesheet.declarations);
}

/**
 * The declarations a token's tier value may arrive in: the token reference —
 * `var(--name)` or a tier form `var(--name-tNNNN)` — has to sit on a selector that
 * consumes the token in the same stylesheet at 1440. A tier block that hands the
 * value to a different selector has moved it off the element §3 applies it to;
 * that used to pass, because any declaration in the section carrying the number
 * counted.
 */
function tierCarriers(name, sheets = stylesheets) {
  const used = new RegExp(`var\\(\\s*${name}(?:-t\\d+)?\\s*[,)]`);
  return sheets.flatMap((stylesheet) => {
    const owners = new Set(
      stylesheet.declarations
        .filter((declaration) => declaration.tier === null && used.test(declaration.value))
        .map((declaration) => declaration.selector),
    );
    return stylesheet.declarations.filter(
      (declaration) => used.test(declaration.value) && (declaration.tier === null || owners.has(declaration.selector)),
    );
  });
}

for (const tier of TIERS) {
  const found = pool.some((declaration) => declaration.tier === tier);
  const declared = SECTIONS.some((section) =>
    section.files.some((file) =>
      readFileSync(join(section.dir, file), "utf8").includes(`@media (max-width: ${tier}px)`),
    ),
  );
  if (!declared || !found) {
    problems.push(`@media (max-width: ${tier}px): no section stylesheet declares this tier`);
  } else {
    breakpoints += 1;
  }
}

/* §3.1 and §3.2: token rows, checked against every section (they are global). */
for (const [heading, label] of [
  ["### 3.1", "BLUEPRINT §3.1"],
  ["### 3.2", "BLUEPRINT §3.2"],
]) {
  for (const cells of tableRows(sectionLines(heading))) {
    const names = [...cells[0].matchAll(/`(--[\w-]+)`/g)].map((match) => match[1]);
    if (names.length === 0) continue;
    const values = rowValues(cells);
    if (values.every((value) => value === null)) continue;
    for (const name of names) {
      const family = familyProps(name);
      if (family === null) {
        problems.push(`${label} ${name}: no property family is known to this check`);
        continue;
      }
      const scoped = consumers(name);
      if (scoped.length === 0) {
        const node = withheldTokens.get(name);
        if (node !== undefined) {
          removed += 1;
          withheldTokens.delete(name);
          continue;
        }
        problems.push(
          `${label} ${name}: no section stylesheet consumes this token (var(${name})), so its tier values cannot be checked`,
        );
        continue;
      }
      const carriers = tierCarriers(name);
      for (const tier of TIERS) {
        const value = values[TIERS.indexOf(tier) + 1];
        if (value === null || value === undefined) continue;
        expect(`${label} ${name}`, tier, valueNumbers(value), carriers, family.props);
      }
    }
  }
}

/* §3.3: per-block rows, checked against that block's own stylesheet. */
const ANCHORS = [
  /`(--[\w-]+)`\s*(\d+)(?:px)?/g,
  /\*\*(\d+)px\*\*/g,
  /(?:^|[^\d.])(\d+)px/g,
  /色块\s*(\d+)/g,
  /方图\s*(\d+)/g,
  /\bh\s*=\s*(\d+)/g,
  /`h`\s*(\d+)/g,
  /每行\s*(\d+)/g,
  /≥\s*(\d+)/g,
  /\bgap\s*(\d+)/g,
  /`padding`\s*(\d+)\s*\/\s*(\d+)/g,
];

for (const cells of tableRows(sectionLines("### 3.3"))) {
  const block = cells[0]
    .replace(/`/g, "")
    .split(/[\s（]/)[0]
    .trim();
  if (block === "区块") continue;
  const dir = BLOCK_DIRS[block];
  if (dir === undefined) {
    if (cells.slice(1).some((cell) => /\d/.test(cell))) {
      problems.push(`BLUEPRINT §3.3 "${block}": no section is known to this check`);
    }
    continue;
  }
  const section = bySection.get(dir);
  if (section === undefined) {
    problems.push(`BLUEPRINT §3.3 "${block}": src/sections/${dir} is missing`);
    continue;
  }
  const files = [...new Set(section.map((declaration) => relative(ROOT, declaration.file)))].join(", ");
  const sheets = bySectionSheets.get(dir) ?? [];

  for (const tier of TIERS) {
    const cell = cells[TIERS.indexOf(tier) + 2] ?? "";
    for (const clause of cell
      .split(/[；;，]/)
      .map((part) => part.trim())
      .filter((part) => part !== "")) {
      /* A statement that a size does not change ("11px 不缩") sets no tier value. */
      if (/不缩|不折|不变/.test(clause)) continue;
      const blank = [...clause];
      const wanted = new Map();
      const tokenWanted = [];
      /* `--token N` names the token that must carry the number at this tier. */
      for (const match of clause.matchAll(ANCHORS[0])) {
        tokenWanted.push({ token: match[1], number: Number(match[2]) });
        for (let at = match.index; at < match.index + match[0].length; at += 1) blank[at] = " ";
      }
      for (const anchor of ANCHORS.slice(1)) {
        for (const match of blank.join("").matchAll(anchor)) {
          for (const group of match.slice(1)) {
            if (group === undefined || !Number.isFinite(Number(group))) continue;
            const number = Number(group);
            const anchors = wanted.get(number) ?? new Set();
            anchors.add(match[0].replace(/\s+/g, " ").trim());
            wanted.set(number, anchors);
          }
          for (let at = match.index; at < match.index + match[0].length; at += 1) blank[at] = " ";
        }
      }
      /* "…保持" / "同 …" restates the desktop value, so any tier proves it. */
      const scope = /保持|同/.test(clause) ? "any" : tier;
      for (const [number, anchors] of wanted) {
        if (withheldNumber(block, scope, anchors)) continue;
        expect(`BLUEPRINT §3.3 ${block}`, scope, [number], section, null);
      }
      /* A `--token` number is held to that token's own carriers in this block. */
      for (const { token, number } of tokenWanted) {
        expect(`BLUEPRINT §3.3 ${block} ${token}`, scope, [number], tierCarriers(token, sheets), null);
      }
      /* A number the anchors did not read means the table says more than the check
         understood: that is a failure, never a silent pass. Ratios (÷ 2.571) and
         names such as H1 carry no tier value. */
      const leftoverSource = blank.join("").replace(/(?:\d+(?:\.\d+)?)?\s*[÷×]\s*\d+(?:\.\d+)?/g, " ");
      const leftovers = [
        ...leftoverSource.matchAll(/(?<![A-Za-z\d.§#×÷≤<.])(\d+(?:\.\d+)?)(?![\d.#×])/g),
      ].map((match) => match[1]);
      if (leftovers.length > 0) {
        unread.push(`BLUEPRINT §3.3 ${block} @${tier}: unread numbers ${leftovers.join(", ")} in "${clause}"`);
      }
    }
  }
}

/* ---------------------------------------------------------------- report --- */

/* An entry that withheld nothing means §3 no longer asks the deleted slot for that value:
   the registration outlived its expectation, and it is reported rather than left as a
   standing hole in the table. */
for (const [token, node] of withheldTokens) {
  problems.push(`REMOVED_BY_DOCX ${node}: ${token} is registered as removed, but its §3.1 row no longer needs a consumer`);
}
for (const [block, entries] of withheldValues) {
  for (const entry of entries) {
    if (!entry.used) {
      problems.push(
        `REMOVED_BY_DOCX ${entry.node}: "${entry.anchor}" ${block} @${entry.tier} is registered as removed, ` +
          "but §3.3 no longer asks for it; revoke the entry",
      );
    }
  }
}

console.log(`breakpoints=${breakpoints} values_checked=${checked} missing=${problems.length} removed=${removed}`);
for (const line of problems) {
  console.error(`missing: ${line}`);
}
for (const line of unread) {
  console.error(`unreadable: ${line}`);
}
if (!existsSync(TOKENS_FILE)) {
  console.error(`missing: ${relative(ROOT, TOKENS_FILE)}`);
  process.exit(1);
}
process.exit(problems.length + unread.length === 0 ? 0 : 1);
