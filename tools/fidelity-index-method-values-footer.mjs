#!/usr/bin/env node
/*
 * Fidelity gate for the index / method / values / footer lanes.
 *
 * Reads the four ui.pen subtrees that own those sections (Index GfEMz, Columns
 * t0l2bz, Values F9LxTP, Footer jSRy5), extracts every numeric design value, every
 * fill colour and every font family, then asserts each one has a matching
 * declaration in that section's own .tsx/.css. Colours must arrive through a
 * src/styles/tokens.css token: a value that resolves to a hex the token file does
 * not carry is reported, and a raw hex in a section file is a failure.
 *
 * Stroke declarations live in the frozen stroke primitives
 * (src/components/primitives/primitives.css), so that file joins the pool the
 * design values are matched against.
 *
 * The three responsive tiers of BLUEPRINT §3 are checked as a second table: the
 * design has a single 1440 artboard, so those numbers are the blueprint's
 * implementation supplement and are asserted against the section's media blocks.
 *
 * Usage: node tools/fidelity-index-method-values-footer.mjs
 *        ui.pen is looked up beside the repo root or in its ancestors; UI_PEN overrides.
 * exit 0 = faithful (prints checked=<n> missing=0), 1 = a value is missing.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PEN_SHA256_PREFIX = "8816b923b24c00e4";
const TOKENS_PATH = join(ROOT, "src/styles/tokens.css");
const PRIMITIVES_PATH = join(ROOT, "src/components/primitives/primitives.css");

const SECTIONS = [
  { name: "index", node: "GfEMz", dir: join(ROOT, "src/sections/Index") },
  { name: "method", node: "t0l2bz", dir: join(ROOT, "src/sections/Method") },
  { name: "values", node: "F9LxTP", dir: join(ROOT, "src/sections/Values") },
  { name: "footer", node: "jSRy5", dir: join(ROOT, "src/sections/Footer") },
];

/* Requirement prop -> the CSS properties that may carry it. */
const FAMILIES = {
  fontSize: ["font-size"],
  fontWeight: ["font-weight"],
  letterSpacing: ["letter-spacing"],
  lineHeight: ["line-height"],
  fontFamily: ["font-family"],
  gap: ["gap", "row-gap", "column-gap"],
  padding: [
    "padding",
    "padding-block",
    "padding-inline",
    "padding-block-end",
    "padding-block-start",
    "padding-inline-end",
    "padding-inline-start",
  ],
  width: ["width", "inline-size"],
  height: ["height", "block-size"],
  strokeWidth: ["stroke-width"],
  textAlign: ["text-align"],
};

/* Design field -> requirement prop; padding is the only array field. */
const FIELD_PROPS = {
  fontSize: "fontSize",
  fontWeight: "fontWeight",
  letterSpacing: "letterSpacing",
  lineHeight: "lineHeight",
  fontFamily: "fontFamily",
  gap: "gap",
  width: "width",
  height: "height",
  strokeWidth: "strokeWidth",
  textAlign: "textAlign",
};

const WEIGHT_WORDS = { normal: 400, bold: 700 };

/* BLUEPRINT §3 tiers; [prop, expected] where a number matches numerically and a
   string matches as a substring of the resolved declaration. */
const RESPONSIVE = [
  {
    name: "index",
    tiers: [
      {
        breakpoint: 1200,
        wants: [
          ["padding", 32],
          ["padding", 40],
          ["width", 56],
          ["height", 56],
          ["width", 120],
          ["height", 120],
          ["fontSize", 28],
          ["fontSize", 22],
        ],
      },
      {
        breakpoint: 900,
        wants: [
          ["padding", 24],
          ["padding", 32],
          ["padding", 16],
          ["width", 40],
          ["height", 40],
          ["width", 96],
          ["height", 96],
          ["fontSize", 22],
          ["fontSize", 18],
        ],
      },
      {
        breakpoint: 600,
        wants: [
          ["padding", 24],
          ["padding", 8],
          ["gap", 16],
          ["flex-direction", "column"],
          ["width", 32],
          ["height", 32],
          ["width", 72],
          ["height", 72],
          ["fontSize", 18],
        ],
      },
    ],
  },
  {
    name: "method",
    tiers: [
      {
        breakpoint: 1200,
        wants: [
          ["padding", 32],
          ["padding", 40],
          ["fontSize", 54],
          ["fontSize", 18],
          ["gap", 24],
        ],
      },
      {
        breakpoint: 900,
        wants: [
          ["padding", 24],
          ["padding", 32],
          ["fontSize", 40],
          ["fontSize", 16],
          ["gap", 24],
          ["grid-template-columns", "1fr"],
        ],
      },
      {
        breakpoint: 600,
        wants: [
          ["padding", 24],
          ["fontSize", 32],
          ["gap", 16],
        ],
      },
    ],
  },
  {
    name: "values",
    tiers: [
      {
        breakpoint: 1200,
        wants: [
          ["height", 216],
          ["padding", 24],
          ["fontSize", 36],
        ],
      },
      {
        breakpoint: 900,
        wants: [
          ["height", 160],
          ["padding", 16],
          ["fontSize", 26],
          ["grid-template-columns", "repeat(2"],
        ],
      },
      {
        breakpoint: 600,
        wants: [
          ["height", 128],
          ["fontSize", 22],
          ["grid-template-columns", "1fr"],
        ],
      },
    ],
  },
  {
    name: "footer",
    tiers: [
      {
        breakpoint: 1200,
        wants: [
          ["padding", 32],
          ["padding", 40],
          ["fontSize", 40],
        ],
      },
      {
        breakpoint: 900,
        wants: [
          ["padding", 24],
          ["padding", 32],
          ["fontSize", 30],
          ["gap", 16],
          ["flex-direction", "column"],
        ],
      },
      {
        breakpoint: 600,
        wants: [
          ["padding", 16],
          ["padding", 24],
          ["fontSize", 24],
          ["text-align", "left"],
        ],
      },
    ],
  },
];

/* ---------------------------------------------------------------- ui.pen --- */

function findPen() {
  const candidates = [
    process.env.UI_PEN,
    join(ROOT, "ui.pen"),
    join(ROOT, "..", "ui.pen"),
    join(ROOT, "..", "..", "ui.pen"),
    join(ROOT, "..", "..", "..", "ui.pen"),
  ].filter(Boolean);
  return candidates.find((path) => existsSync(path));
}

function readPen() {
  const path = findPen();
  if (path === undefined) {
    console.error(
      "UNAVAILABLE: ui.pen — not found beside the repo root or in its ancestors; " +
        "this gate needs the frozen board there (or UI_PEN=/path/to/ui.pen)",
    );
    process.exit(2);
  }
  const bytes = readFileSync(path);
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (!sha.startsWith(PEN_SHA256_PREFIX)) {
    console.error(`ui.pen mismatch: ${path} sha256 ${sha} does not start with ${PEN_SHA256_PREFIX}`);
    process.exit(1);
  }
  console.log(`ui.pen: ${path} sha256 ${sha.slice(0, 16)}… ${bytes.length} B`);
  return JSON.parse(bytes.toString("utf8"));
}

function findNode(node, id) {
  if (node.id === id) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

/** Every numeric / colour / font requirement a subtree states, in walk order. */
function requirementsOf(root, section, notes, out = []) {
  for (const [field, prop] of Object.entries(FIELD_PROPS)) {
    const value = root[field];
    if (value === undefined) {
      continue;
    }
    /* ui.pen's fourth index row keeps an editor default of a 0x0 chip; DESIGN-GAPS
       #6 and this lane's brief say the row reuses the row spec, so the zero pair is
       not asserted as a design value and is reported as a note instead. */
    if (root.name === "Num" && value === 0 && (root.width === 0 || root.height === 0)) {
      notes.push(`${section} ${root.id}: ${field} 0 is ui.pen's editor default; the row 01 spec applies to all four rows`);
      continue;
    }
    if (prop === "textAlign" || prop === "fontFamily") {
      out.push({ section, node: root.id, prop, kind: "text", want: String(value) });
    } else if (typeof value === "number") {
      out.push({ section, node: root.id, prop, kind: "number", want: value });
    } else if (typeof value === "string" && value in WEIGHT_WORDS) {
      out.push({ section, node: root.id, prop, kind: "number", want: WEIGHT_WORDS[value] });
    }
  }
  if (Array.isArray(root.padding)) {
    for (const value of root.padding) {
      out.push({ section, node: root.id, prop: "padding", kind: "number", want: value });
    }
  }
  for (const field of ["fill", "stroke"]) {
    const value = root[field];
    if (typeof value === "string" && value.startsWith("#")) {
      out.push({ section, node: root.id, prop: "colour", kind: "colour", want: value.toLowerCase() });
    }
  }
  for (const child of root.children ?? []) {
    requirementsOf(child, section, notes, out);
  }
  return out;
}


/* ------------------------------------------------------------------ CSS --- */

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function matchBrace(text, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    else if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** Splits a stylesheet into media-tier bodies and top-level rule blocks. */
function parseSheet(css) {
  const clean = stripComments(css);
  const tiers = new Map();
  const withoutTiers = clean.replace(/@media\s*\(max-width:\s*(\d+)px\)\s*\{/g, (match, width, offset) => {
    const open = clean.indexOf("{", offset);
    const close = matchBrace(clean, open);
    const body = clean.slice(open + 1, close);
    tiers.set(Number(width), body);
    return " ".repeat(close - offset + 1);
  });
  return { tiers, blocks: ruleBlocks(withoutTiers) };
}

/** [{selector, declarations: [{prop, value}]}] for a brace-only stylesheet body. */
function ruleBlocks(css) {
  const blocks = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    blocks.push({ selector: match[1].trim().replace(/\s+/g, " "), declarations: declarationsOf(match[2]) });
  }
  return blocks;
}

function declarationsOf(body) {
  const declarations = [];
  for (const match of body.matchAll(/([-a-zA-Z][\w-]*)\s*:\s*([^;]+)/g)) {
    declarations.push({ prop: match[1], value: match[2].trim() });
  }
  return declarations;
}

/** All declarations of a stylesheet, flat, tagged with their media tier if any. */
function allDeclarations(sheet) {
  const flat = [];
  for (const block of sheet.blocks) {
    for (const declaration of block.declarations) {
      flat.push({ ...declaration, selector: block.selector, block: block.declarations, tier: null });
    }
  }
  for (const [tier, body] of sheet.tiers) {
    for (const block of ruleBlocks(body)) {
      for (const declaration of block.declarations) {
        flat.push({ ...declaration, selector: block.selector, block: block.declarations, tier });
      }
    }
  }
  return flat;
}

function tokenMap(css) {
  const tokens = new Map();
  for (const match of stripComments(css).matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) {
    tokens.set(match[1], match[2].trim().replace(/\s+/g, " "));
  }
  return tokens;
}

/** Expands var() references: the declaration's own block first, then tokens.css. */
function resolveValue(raw, block, tokens) {
  let value = raw;
  for (let round = 0; round < 8; round += 1) {
    const next = value.replace(/var\(\s*(--[\w-]+)\s*([^)]*)\)/g, (whole, name, rest) => {
      const own = block.find((declaration) => declaration.prop === name);
      const found = own?.value ?? tokens.get(name);
      if (found !== undefined) {
        return found;
      }
      const fallback = rest.replace(/^\s*,\s*/, "").trim();
      return rest.includes(",") && fallback !== "" ? fallback : whole;
    });
    if (next === value) break;
    value = next;
  }
  return value;
}

function numbersIn(value) {
  const numbers = [];
  for (const token of value.split(/[\s,]+/)) {
    const number = Number.parseFloat(token);
    if (!Number.isNaN(number)) {
      numbers.push(number);
    }
  }
  return numbers;
}

function familyMatches(prop, cssProp) {
  const family = FAMILIES[prop];
  return family === undefined ? cssProp === prop : family.includes(cssProp);
}

/* ------------------------------------------------------------------ run --- */

const pen = readPen();
const root = pen.children[0];
const tokens = tokenMap(readFileSync(TOKENS_PATH, "utf8"));
const sharedDeclarations = allDeclarations(parseSheet(readFileSync(PRIMITIVES_PATH, "utf8")));

const hexToToken = new Map();
for (const [name, value] of tokens) {
  const hex = value.toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex) && !hexToToken.has(hex)) {
    hexToToken.set(hex, name);
  }
}

const failures = [];
const notes = [];
let checked = 0;

for (const section of SECTIONS) {
  const files = readdirSync(section.dir).filter((name) => /\.(tsx|css)$/.test(name));
  const source = files.map((name) => readFileSync(join(section.dir, name), "utf8")).join("\n");
  const css = files
    .filter((name) => name.endsWith(".css"))
    .map((name) => readFileSync(join(section.dir, name), "utf8"))
    .join("\n");

  const sheet = parseSheet(css);
  const sectionDeclarations = allDeclarations(sheet);
  const pool = [...sectionDeclarations, ...sharedDeclarations];

  /* raw hex in a section file is a hard failure (colours come from tokens only) */
  const rawHex = source.match(/(?<!&)#[0-9a-fA-F]{3,8}\b/g) ?? [];
  for (const hex of new Set(rawHex)) {
    failures.push(`${section.name}: raw hex ${hex} in ${section.dir.replace(`${ROOT}/`, "")}`);
  }

  /* every var() the section references must exist as a token or a local property */
  for (const match of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
    const name = match[1];
    const local = sectionDeclarations.some((declaration) => declaration.prop === name);
    if (!local && !tokens.has(name)) {
      failures.push(`${section.name}: var(${name}) is neither a tokens.css token nor a local property`);
    }
  }

  const subtree = findNode(root, section.node);
  if (subtree === null) {
    failures.push(`${section.name}: ui.pen node ${section.node} not found`);
    continue;
  }

  let sectionChecked = 0;
  let sectionMissing = 0;

  for (const requirement of requirementsOf(subtree, section.name, notes)) {
    checked += 1;
    sectionChecked += 1;

    if (requirement.kind === "colour") {
      /* any declaration whose resolved value is that token's hex proves the colour
         reaches the stylesheet through a token, since raw hex is banned */
      const hit = pool.some((declaration) => {
        const resolved = resolveValue(declaration.value, declaration.block, tokens).toLowerCase();
        return resolved === requirement.want || resolved.split(/[\s,]+/).includes(requirement.want);
      });
      if (!hit) {
        sectionMissing += 1;
        failures.push(
          `${section.name} ${requirement.node}: colour ${requirement.want} (token ${hexToToken.get(requirement.want) ?? "?"}) has no declaration`,
        );
      }
      continue;
    }

    const hit = pool.some((declaration) => {
      if (!familyMatches(requirement.prop, declaration.prop)) {
        return false;
      }
      const resolved = resolveValue(declaration.value, declaration.block, tokens);
      if (requirement.kind === "text") {
        return resolved.toLowerCase().includes(requirement.want.toLowerCase());
      }
      return numbersIn(resolved).includes(requirement.want);
    });

    if (!hit) {
      sectionMissing += 1;
      failures.push(
        `${section.name} ${requirement.node}: ${requirement.prop} ${requirement.want} has no ${FAMILIES[requirement.prop]?.join("/") ?? requirement.prop} declaration`,
      );
    }
  }

  /* the per-row custom properties must be consumed, not merely declared */
  for (const name of ["--num-fill", "--no-ink", "--en-ink", "--card-fill", "--card-title-ink", "--card-label-ink"]) {
    const declared = sectionDeclarations.some((declaration) => declaration.prop === name);
    const consumed = sectionDeclarations.some(
      (declaration) => declaration.prop !== name && declaration.value.includes(`var(${name})`),
    );
    if (declared && !consumed) {
      sectionMissing += 1;
      failures.push(`${section.name}: ${name} is declared but never consumed`);
    }
  }

  console.log(`${section.name.padEnd(7)} (${section.node}): checked=${sectionChecked} missing=${sectionMissing}`);
}

/* Index row colours, per design node: Num fill, No ink, EN ink. */
const indexSubtree = findNode(root, "GfEMz");
const indexDeclarations = allDeclarations(parseSheet(
  readdirSync(SECTIONS[0].dir)
    .filter((name) => name.endsWith(".css"))
    .map((name) => readFileSync(join(SECTIONS[0].dir, name), "utf8"))
    .join("\n"),
));

function tokenNameOf(raw, block) {
  const direct = raw.match(/var\(\s*(--[\w-]+)/);
  if (direct !== null && tokens.has(direct[1])) {
    const value = resolveValue(`var(${direct[1]})`, block, tokens).toLowerCase();
    if (hexToToken.get(value) === direct[1]) {
      return direct[1];
    }
  }
  return hexToToken.get(resolveValue(raw, block, tokens).toLowerCase()) ?? `?(${raw})`;
}

const rowReport = [];
for (const row of indexSubtree.children.filter((child) => child.name?.startsWith("0"))) {
  const position = indexDeclarations.findIndex(
    (declaration) => declaration.prop === "--num-fill" && declaration.selector.includes(`:nth-child(${Number(row.name.slice(0, 2))})`),
  );
  const rowBlock = position === -1 ? [] : indexDeclarations[position].block;
  const num = row.children.find((child) => child.name === "Num");
  const no = row.children.find((child) => child.name === "No");
  const body = row.children.find((child) => child.name === "Body");
  const en = body?.children.find((child) => child.name === "Top")?.children.find((child) => child.name === "EN");

  const label = `row${Number(row.name.slice(0, 2))}`;
  const parts = [];
  for (const [prop, node, field] of [
    ["--num-fill", num, "fill"],
    ["--no-ink", no, "fill"],
    ["--en-ink", en, "fill"],
  ]) {
    if (node === undefined || typeof node[field] !== "string") {
      continue;
    }
    const declared = rowBlock.find((declaration) => declaration.prop === prop);
    checked += 1;
    if (declared === undefined) {
      failures.push(`index ${node.id}: :nth-child(${Number(row.name.slice(0, 2))}) does not declare ${prop} (design ${node[field]})`);
      parts.push(`${prop}=missing`);
      continue;
    }
    const name = tokenNameOf(declared.value, rowBlock);
    const resolved = resolveValue(declared.value, rowBlock, tokens).toLowerCase();
    if (resolved !== node[field].toLowerCase()) {
      failures.push(`index ${node.id}: :nth-child(...) ${prop} resolves to ${resolved}, design says ${node[field]}`);
      parts.push(`${prop}=${name}!`);
      continue;
    }
    parts.push(`${prop}=${name}`);
  }
  rowReport.push(`${label} ${parts.join(" ")}`);
}
console.log(`index rows: ${rowReport.join(" | ")}`);

if (rowReport.length !== 4) {
  failures.push(`index: expected 4 rows in ui.pen, found ${rowReport.length}`);
}

/* Values cards, per design node: the generic colour pass above matches the
   section pool, so a card whose fill or ink is wrong still passes while another
   declaration in the section resolves to the same hex. Each card's container
   fill, T fill and K fill are therefore paired with its own --card-fill,
   --card-title-ink and --card-label-ink, the way the index rows pair theirs. */
const valuesSubtree = findNode(root, "F9LxTP");
const valuesDeclarations = allDeclarations(parseSheet(
  readdirSync(SECTIONS.find((section) => section.name === "values").dir)
    .filter((name) => name.endsWith(".css"))
    .map((name) => readFileSync(join(SECTIONS.find((section) => section.name === "values").dir, name), "utf8"))
    .join("\n"),
));

const CARD_COLOUR_PROPS = ["--card-fill", "--card-title-ink", "--card-label-ink"];

const cardReport = [];
(valuesSubtree?.children ?? []).forEach((card, index) => {
  const k = card.children?.find((child) => child.name === "K");
  if (k === undefined || typeof k.fill !== "string") {
    return;
  }
  const title = card.children?.find((child) => child.name === "T");
  const position = valuesDeclarations.findIndex(
    (declaration) =>
      CARD_COLOUR_PROPS.includes(declaration.prop) && declaration.selector.includes(`:nth-child(${index + 1})`),
  );
  const cardBlock = position === -1 ? [] : valuesDeclarations[position].block;

  const parts = [];
  for (const [prop, node] of [
    ["--card-fill", card],
    ["--card-title-ink", title],
    ["--card-label-ink", k],
  ]) {
    if (node === undefined || typeof node.fill !== "string") {
      continue;
    }
    checked += 1;
    const declared = cardBlock.find((declaration) => declaration.prop === prop);
    if (declared === undefined) {
      failures.push(`values ${node.id}: :nth-child(${index + 1}) ${card.name} does not declare ${prop} (design ${node.fill})`);
      parts.push(`${prop}=missing`);
      continue;
    }
    const name = tokenNameOf(declared.value, cardBlock);
    const resolved = resolveValue(declared.value, cardBlock, tokens).toLowerCase();
    if (resolved !== node.fill.toLowerCase()) {
      failures.push(`values ${node.id}: :nth-child(${index + 1}) ${card.name} ${prop} resolves to ${resolved}, design says ${node.fill}`);
      parts.push(`${prop}=${name}!`);
      continue;
    }
    parts.push(`${prop}=${name}`);
  }
  cardReport.push(`card${index + 1}(${card.name}) ${parts.join(" ")}`);
});
console.log(`values cards: ${cardReport.join(" | ")}`);

if (cardReport.length !== 4) {
  failures.push(`values: expected 4 cards in ui.pen, found ${cardReport.length}`);
}

/* BLUEPRINT §3 tiers. */
for (const section of RESPONSIVE) {
  const css = readdirSync(join(ROOT, "src/sections", section.name[0].toUpperCase() + section.name.slice(1)))
    .filter((name) => name.endsWith(".css"))
    .map((name) => readFileSync(join(ROOT, "src/sections", section.name[0].toUpperCase() + section.name.slice(1), name), "utf8"))
    .join("\n");
  const sheet = parseSheet(css);
  for (const tier of section.tiers) {
    const body = sheet.tiers.get(tier.breakpoint);
    if (body === undefined) {
      failures.push(`${section.name}: no @media (max-width: ${tier.breakpoint}px) block`);
      continue;
    }
    const declarations = ruleBlocks(body).flatMap((block) =>
      block.declarations.map((declaration) => ({ ...declaration, block: block.declarations })),
    );
    for (const [prop, want] of tier.wants) {
      checked += 1;
      const hit = declarations.some((declaration) => {
        if (typeof want === "number") {
          if (!familyMatches(prop, declaration.prop)) return false;
          return numbersIn(resolveValue(declaration.value, declaration.block, tokens)).includes(want);
        }
        if (!declaration.prop.startsWith(prop)) return false;
        return resolveValue(declaration.value, declaration.block, tokens).includes(want);
      });
      if (!hit) {
        failures.push(`${section.name} @${tier.breakpoint}: ${prop} ${want} missing (BLUEPRINT §3)`);
      }
    }
  }
}
console.log(`responsive: ${RESPONSIVE.map((section) => `${section.name} ${section.tiers.map((tier) => tier.breakpoint).join("/")}`).join(", ")}`);

for (const failure of failures) {
  console.error(`missing: ${failure}`);
}
for (const note of notes) {
  console.log(`note: ${note}`);
}
console.log(`checked=${checked} missing=${failures.length}`);
process.exit(failures.length === 0 ? 0 : 1);
