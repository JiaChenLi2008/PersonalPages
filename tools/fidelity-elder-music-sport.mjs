#!/usr/bin/env node
/*
 * Layout-fidelity check for lane S4: elder (02) / music (03) / sport (04).
 *
 * ui.pen is the only layout source. This script
 *   1. re-verifies the frozen sha256 prefix and byte size of ui.pen,
 *   2. walks the three section subtrees and extracts every numeric and colour
 *      value they carry — except the ※ authoring annotations that docs/CHROME.md
 *      §2 lists as never-rendered design notes,
 *   3. resolves the section stylesheets through tokens.css (var() + calc) and
 *      asserts each design value has a matching declaration,
 *   4. reports `checked=<n> missing=0`.
 *
 * The node-id -> selector map is the only hand-written part; the ids come from
 * the frozen ui.pen and every id it maps is looked up on each run, so a renamed
 * or moved node fails loudly instead of silently checking nothing.
 *
 * Usage: node tools/fidelity-elder-music-sport.mjs   (exit 0 = faithful, 1 = drift)
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
/* The frozen design lives outside the repo (one shared source for the whole
   project); the sha is pinned so the check is against the reviewed revision. */
const PEN_PATH = "/mnt/code/JC_Project/ui.pen";
const PEN_SHA16 = "8816b923b24c00e4";
const PEN_BYTES = 137536;
const TOKENS = "src/styles/tokens.css";
const PRIMITIVES = "src/components/primitives/primitives.css";

/** `<Rule variant="baseline">` is the shared 2px section baseline (primitives.css). */
const RULE_BASELINE = "PRIMITIVE:baseline";

const SECTIONS = [
  {
    name: "elder",
    nodeId: "s18X3i",
    css: "src/sections/Elder/Elder.css",
    tsx: "src/sections/Elder/Elder.tsx",
    selectors: {
      s18X3i: ".elder",
      E8f3cu: ".elder__head",
      WIGFx: ".elder__kicker",
      VtA4j: ".elder__title-en",
      lm0yZ: RULE_BASELINE,
      wGBfI: ".elder__body",
      MrSwt: ".elder__panel",
      D3vpEv: ".elder__pending",
    },
    annotations: {
      hGNQz: "the ※ note is a design annotation, not site copy (docs/CHROME.md §2)",
    },
  },
  {
    name: "music",
    nodeId: "Z79UYi",
    css: "src/sections/Music/Music.css",
    tsx: "src/sections/Music/Music.tsx",
    selectors: {
      Z79UYi: ".music",
      LwBYk: ".music__head",
      Q6MMlj: ".music__kicker",
      G3NNMY: ".music__title-en",
      I4xF2w: RULE_BASELINE,
      edufv: ".music__body",
      HBLRk: ".music__col",
      Fq3zQ: ".music__pull",
      T3Tl69: ".music__pull-rule",
      vkMNd: ".music__pull-text",
      LqODN: ".music__kv",
      mnlO6: ".music__k",
      XmoFw: ".music__v",
      mCN4T: ".music__fig",
      vVdM9: ".music__media",
      syl4Z: ".music__ph",
    },
    annotations: {},
  },
  {
    name: "sport",
    nodeId: "wO1ZI",
    css: "src/sections/Sport/Sport.css",
    tsx: "src/sections/Sport/Sport.tsx",
    selectors: {
      wO1ZI: ".sport",
      EXcwO: ".sport__head",
      B63uxr: ".sport__kicker",
      ZCort: ".sport__title-en",
      H3ZFf6: RULE_BASELINE,
      MGgqb: ".sport__body",
      LxXv0: ".sport__col",
      dUWkp: ".sport__pull",
      W6EmI: ".sport__pull-rule",
      nRD0G: ".sport__pull-text",
      iHPvo: ".sport__kv",
      wmLb1: ".sport__k",
      m9FVq: ".sport__v",
      p1ZAro: ".sport__fig",
      rWg3m: ".sport__media",
      f0PRy: ".sport__ph",
    },
    annotations: {},
  },
];

/** Design values that are enums, not numbers: layout intent a value check cannot see. */
const ENUM_PAIRS = {
  space_between: "justify-content: space-between",
  end: "align-items: flex-end",
  center_flex: "align-items: center",
  center_justify: "justify-content: center",
  vertical: "flex-direction: column",
  clip: "overflow: hidden",
};

const BASE_IMAGE_PENDING = "scholarly.imagePending";

/** FIDELITY_LIST=1 also prints every value assertion, e.g. for a review report. */
const LIST = process.env.FIDELITY_LIST === "1";

const missing = [];
const checked = [];
let annotationCount = 0;

function fail(label, detail) {
  missing.push(`${label}: ${detail}`);
}

// ---------------------------------------------------------------- ui.pen guard

function readPen() {
  let raw;
  try {
    raw = readFileSync(PEN_PATH);
  } catch (error) {
    console.error(
      `UNAVAILABLE: ui.pen — frozen design not readable (${error.code}): ${PEN_PATH}; ` +
        "this gate reads the frozen board from that path",
    );
    process.exit(2);
  }
  const sha = createHash("sha256").update(raw).digest("hex");
  if (sha.slice(0, 16) !== PEN_SHA16 || raw.byteLength !== PEN_BYTES) {
    console.error(
      `ui.pen does not match the frozen revision: sha256[0:16]=${sha.slice(0, 16)} ` +
        `bytes=${raw.byteLength} (expected ${PEN_SHA16} / ${PEN_BYTES})`,
    );
    process.exit(1);
  }
  console.log(`ui.pen frozen: sha256[0:16]=${sha.slice(0, 16)} bytes=${raw.byteLength}`);
  return JSON.parse(raw.toString("utf8"));
}

// ------------------------------------------------------------------ css parsing

/** Splits a stylesheet into rules; media blocks are recursed with their query kept. */
function parseStylesheet(text) {
  const source = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];

  function walk(chunk, atRule) {
    let i = 0;
    while (i < chunk.length) {
      const open = chunk.indexOf("{", i);
      if (open === -1) {
        return;
      }
      let depth = 1;
      let j = open + 1;
      while (j < chunk.length && depth > 0) {
        if (chunk[j] === "{") depth += 1;
        else if (chunk[j] === "}") depth -= 1;
        j += 1;
      }
      const head = chunk.slice(i, open).trim();
      const body = chunk.slice(open + 1, j - 1);
      if (head.startsWith("@")) {
        walk(body, head);
      } else {
        rules.push({ at: atRule, selector: head, decls: splitDecls(body) });
      }
      i = j;
    }
  }

  walk(source, null);
  return rules;
}

function splitDecls(body) {
  return [...body.matchAll(/(--[\w-]+|[a-zA-Z-]+)\s*:\s*([^;]+)(?:;|$)/g)].map(([, prop, value]) => [
    prop.trim(),
    value.trim().replace(/\s+/g, " "),
  ]);
}

/** Splits a value into parts on top-level whitespace, so calc() stays in one piece. */
function splitTop(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (/\s/.test(char) && depth === 0) {
      if (current !== "") parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current !== "") parts.push(current);
  return parts;
}

/** Selectors of one rule can be a list; each part is registered separately. */
function decorate(rules) {
  const out = [];
  for (const rule of rules) {
    for (const selector of rule.selector.split(",")) {
      out.push({ at: rule.at, selector: selector.trim(), decls: rule.decls });
    }
  }
  return out;
}

// -------------------------------------------------------------- value resolving

/** Minimal arithmetic evaluator so calc() over px tokens resolves exactly. */
function evaluate(expression) {
  const source = expression.replace(/calc\(/g, "(").trim();
  let i = 0;
  const skip = () => {
    while (i < source.length && /\s/.test(source[i])) i += 1;
  };
  function primary() {
    skip();
    if (source[i] === "(") {
      i += 1;
      const value = sum();
      skip();
      if (source[i] !== ")") throw new Error(`unbalanced ${expression}`);
      i += 1;
      return value;
    }
    if (source[i] === "-") {
      i += 1;
      return -primary();
    }
    const number = /^\d*\.?\d+/.exec(source.slice(i));
    if (number === null) throw new Error(`cannot read a number in ${expression}`);
    i += number[0].length;
    if (source.startsWith("px", i)) i += 2;
    return Number(number[0]);
  }
  function product() {
    let value = primary();
    for (;;) {
      skip();
      const op = source[i];
      if (op !== "*" && op !== "/") return value;
      i += 1;
      value = op === "*" ? value * primary() : value / primary();
    }
  }
  function sum() {
    let value = product();
    for (;;) {
      skip();
      const op = source[i];
      if (op !== "+" && op !== "-") return value;
      i += 1;
      value = op === "+" ? value + product() : value - product();
    }
  }
  const result = sum();
  skip();
  if (i !== source.length) throw new Error(`trailing input in ${expression}`);
  return result;
}

function makeResolver(vars) {
  const expand = (raw) => {
    let value = raw;
    for (let pass = 0; pass < 10 && value.includes("var("); pass += 1) {
      value = value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, name) => {
        const token = vars.get(name);
        if (token === undefined) throw new Error(`unknown token ${name}`);
        return token;
      });
    }
    return value;
  };
  return {
    /** Length or unitless number; calc() arithmetic is evaluated exactly. */
    number(raw) {
      return evaluate(expand(raw));
    },
    /** The colour a value carries, read from the hex its tokens resolve to. */
    color(raw) {
      const hex = expand(raw).match(/#[0-9a-fA-F]{3,8}/);
      if (hex === null) throw new Error(`no colour in ${raw}`);
      return hex[0].toUpperCase();
    },
  };
}

function tokensFrom(rules) {
  const vars = new Map();
  for (const rule of rules) {
    if (rule.at !== null || rule.selector !== ":root") continue;
    for (const [prop, value] of rule.decls) {
      if (prop.startsWith("--")) vars.set(prop, value);
    }
  }
  return vars;
}

/** Section-local custom properties plus the shared tokens, as one lookup table.
    Only base-rule custom properties count: the ones inside media queries are the
    responsive overrides, and this check is about the desktop design values. */
function variablesFor(sectionRules, tokens) {
  const vars = new Map(tokens);
  for (const rule of sectionRules) {
    if (rule.at !== null) continue;
    for (const [prop, value] of rule.decls) {
      if (prop.startsWith("--")) vars.set(prop, value);
    }
  }
  return vars;
}

function blockFor(rules, selector) {
  const decls = [];
  for (const rule of rules) {
    if (rule.at === null && rule.selector === selector) decls.push(...rule.decls);
  }
  return decls;
}

function declared(rules, selector, prop) {
  const decls = blockFor(rules, selector);
  for (let i = decls.length - 1; i >= 0; i -= 1) {
    if (decls[i][0] === prop) return decls[i][1];
  }
  return undefined;
}

function exists(rules, prop, value) {
  return rules.some(
    (rule) => rule.decls.some(([p, v]) => p === prop && v === value),
  );
}

// --------------------------------------------------------------- value assertions

function checkNumber(section, rules, resolve, node, selector, prop, declaredProp) {
  const design = node[prop];
  const label = `${section.name} ${node.id} ${node.name} ${prop}=${design}`;
  const raw = declared(rules, selector, declaredProp);
  if (raw === undefined) {
    fail(label, `${selector} does not declare ${declaredProp}`);
    return;
  }
  let actual;
  try {
    actual = resolve.number(raw);
  } catch (error) {
    fail(label, `${selector} ${declaredProp}: ${error.message}`);
    return;
  }
  if (Math.abs(actual - design) > 1e-9) {
    fail(label, `${selector} ${declaredProp}: ${raw} resolves to ${actual}, design says ${design}`);
    return;
  }
  checked.push(`${label} <- ${selector} { ${declaredProp}: ${raw} }`);
}

function checkColor(section, rules, resolve, node, selector, prop, accepted) {
  const design = String(node[prop]).toUpperCase();
  const label = `${section.name} ${node.id} ${node.name} ${prop}=${design}`;
  const decls = blockFor(rules, selector);
  for (const [declaredProp, raw] of decls) {
    if (!accepted.some((prefix) => declaredProp.startsWith(prefix))) continue;
    let actual;
    try {
      actual = resolve.color(raw);
    } catch (error) {
      fail(label, `${selector} ${declaredProp}: ${error.message}`);
      return;
    }
    if (actual === undefined) continue;
    if (actual !== design) {
      fail(label, `${selector} ${declaredProp}: ${raw} resolves to ${actual}, design says ${design}`);
      return;
    }
    checked.push(`${label} <- ${selector} { ${declaredProp}: ${raw} }`);
    return;
  }
  fail(label, `${selector} declares no matching colour`);
}

function checkPadding(section, rules, resolve, node, selector) {
  const design = paddingToSides(node.padding);
  const label = `${section.name} ${node.id} ${node.name} padding=[${node.padding.join(", ")}]`;
  const raw = declared(rules, selector, "padding");
  if (raw === undefined) {
    fail(label, `${selector} does not declare padding`);
    return;
  }
  const parts = splitTop(raw);
  const sides = { top: "0", right: "0", bottom: "0", left: "0" };
  if (parts.length === 1) Object.keys(sides).forEach((side) => (sides[side] = parts[0]));
  if (parts.length === 2) {
    sides.top = parts[0];
    sides.bottom = parts[0];
    sides.right = parts[1];
    sides.left = parts[1];
  }
  if (parts.length === 4) {
    [sides.top, sides.right, sides.bottom, sides.left] = parts;
  }
  for (const side of Object.keys(sides)) {
    let actual;
    try {
      actual = resolve.number(sides[side]);
    } catch (error) {
      fail(label, `${selector} padding ${side}: ${error.message}`);
      continue;
    }
    if (Math.abs(actual - design[side]) > 1e-9) {
      fail(label, `${selector} padding ${side} resolves to ${actual}, design says ${design[side]}`);
      continue;
    }
    checked.push(`${label} ${side}=${design[side]} <- ${selector} { padding: ${raw} }`);
  }
}

function paddingToSides(padding) {
  const [first, second, third, fourth] = padding;
  if (padding.length === 2) {
    return { top: first, right: second, bottom: first, left: second };
  }
  return { top: first, right: second, bottom: third, left: fourth };
}

function checkRatio(section, rules, node, selector, ratio, label) {
  const raw = declared(rules, selector, "aspect-ratio");
  if (raw === undefined) {
    fail(label, `${selector} declares no aspect-ratio`);
    return;
  }
  const [w, h] = raw.split("/").map((part) => Number.parseFloat(part.trim()));
  if (Math.abs(w * ratio[1] - ratio[0] * h) > 1e-9) {
    fail(label, `${selector} aspect-ratio ${raw} is not ${ratio[0]}:${ratio[1]}`);
    return;
  }
  checked.push(`${label} <- ${selector} { aspect-ratio: ${raw} }`);
}

/** One node: every numeric, colour and layout value the design carries. */
function checkNode(context, node, parentNode) {
  const { section, rules, resolve } = context;
  const selector = section.selectors[node.id];
  if (selector === undefined) {
    fail(`${section.name} ${node.id} ${node.name}`, "no selector mapped in this script");
    return;
  }
  if (selector === RULE_BASELINE) {
    const baseline = blockFor(context.primitiveRules, '[data-rule="baseline"]');
    const height = baseline.find(([prop]) => prop === "height")?.[1];
    const background = baseline.find(([prop]) => prop === "background")?.[1];
    if (height === undefined || background === undefined) {
      fail(`${section.name} ${node.id} Rule`, `${PRIMITIVES} has no [data-rule="baseline"]`);
      return;
    }
    if (resolve.number(height) !== node.height) {
      fail(`${section.name} ${node.id} Rule`, `baseline height ${height} is not ${node.height}`);
    }
    if (resolve.color(background) !== String(node.fill).toUpperCase()) {
      fail(`${section.name} ${node.id} Rule`, `baseline background ${background} is not ${node.fill}`);
    }
    if (!context.tsx.includes('<Rule variant="baseline" />')) {
      fail(`${section.name} ${node.id} Rule`, `${section.tsx} does not render <Rule variant="baseline" />`);
      return;
    }
    checked.push(`${section.name} Rule (2px ${node.fill}) <- <Rule variant="baseline" /> ${PRIMITIVES}`);
    return;
  }

  const text = node.type === "text";
  const hasSize = typeof node.width === "number" && typeof node.height === "number";
  const fillsCell = node.width === "fill_container" && typeof parentNode?.width === "number";

  if (node.fontSize !== undefined) checkNumber(section, rules, resolve, node, selector, "fontSize", "font-size");
  if (node.letterSpacing !== undefined)
    checkNumber(section, rules, resolve, node, selector, "letterSpacing", "letter-spacing");
  if (node.lineHeight !== undefined)
    checkNumber(section, rules, resolve, node, selector, "lineHeight", "line-height");
  if (node.gap !== undefined) checkNumber(section, rules, resolve, node, selector, "gap", "gap");
  if (node.padding !== undefined) checkPadding(section, rules, resolve, node, selector);
  if (node.strokeWidth !== undefined) {
    const label = `${section.name} ${node.id} ${node.name} strokeWidth=${node.strokeWidth}`;
    const raw = declared(rules, selector, "border") ?? declared(rules, selector, "border-width");
    if (raw === undefined) {
      fail(label, `${selector} declares no border`);
    } else {
      const width = raw.split(/\s+/)[0];
      const actual = resolve.number(width);
      if (Math.abs(actual - node.strokeWidth) > 1e-9) {
        fail(label, `${selector} ${raw} starts with ${actual}, design says ${node.strokeWidth}`);
      } else {
        checked.push(`${label} <- ${selector} { border: ${raw} }`);
      }
    }
  }
  if (node.fontWeight !== undefined) {
    const design = node.fontWeight === "normal" ? 400 : Number(node.fontWeight);
    const label = `${section.name} ${node.id} ${node.name} fontWeight=${design}`;
    const raw = declared(rules, selector, "font-weight");
    if (raw === undefined) {
      fail(label, `${selector} declares no font-weight`);
    } else {
      const actual = resolve.number(raw);
      if (Math.abs(actual - design) > 1e-9) {
        fail(label, `${selector} font-weight ${raw} resolves to ${actual}`);
      } else {
        checked.push(`${label} <- ${selector} { font-weight: ${raw} }`);
      }
    }
  }

  if (hasSize) {
    checkRatio(
      section,
      rules,
      node,
      selector,
      [node.width, node.height],
      `${section.name} ${node.id} ${node.name} ${node.width}×${node.height}`,
    );
  } else if (fillsCell) {
    if (declared(rules, selector, "aspect-ratio") !== undefined) {
      checkRatio(
        section,
        rules,
        node,
        selector,
        [parentNode.width, node.height],
        `${section.name} ${node.id} ${node.name} ${parentNode.width}×${node.height}`,
      );
    } else {
      checkNumber(section, rules, resolve, node, selector, "height", "height");
    }
  } else if (typeof node.width === "number") {
    checkNumber(section, rules, resolve, node, selector, "width", "width");
  }

  const fillsBorder = node.stroke !== undefined;
  const colorProps = text
    ? ["color", "background", "background-"]
    : fillsBorder
      ? ["border", "outline"]
      : ["background", "color"];
  if (node.fill !== undefined) {
    checkColor(section, rules, resolve, node, selector, "fill", colorProps);
  }
  if (node.stroke !== undefined) {
    checkColor(section, rules, resolve, node, selector, "stroke", ["border", "outline"]);
  }

  const enums = enumRequirements(node);
  for (const pair of enums) {
    const [prop, value] = pair.split(": ");
    if (!exists(rules, prop, value)) {
      fail(`${section.name} ${node.id} ${node.name} ${pair}`, `no rule declares ${pair}`);
    } else {
      checked.push(`${section.name} ${node.id} ${node.name} <- { ${pair} }`);
    }
  }
}

/** Design enums that carry layout intent; values are matched against section rules. */
function enumRequirements(node) {
  const out = [];
  if (node.layout === "vertical") out.push(ENUM_PAIRS.vertical);
  if (node.justifyContent === "space_between") out.push(ENUM_PAIRS.space_between);
  if (node.alignItems === "end") out.push(ENUM_PAIRS.end);
  if (node.alignItems === "center") out.push(ENUM_PAIRS.center_flex);
  if (node.justifyContent === "center") out.push(ENUM_PAIRS.center_justify);
  if (node.clip === true) out.push(ENUM_PAIRS.clip);
  return [...new Set(out)];
}

// ------------------------------------------------------------------ dom checks

function checkDom(section, tsx, css) {
  if (tsx.includes("※") || css.includes("※")) {
    fail(`${section.name} dom`, "a ※ design annotation must never be rendered");
  }
  const hex = /#[0-9a-fA-F]{3,8}\b/;
  for (const [file, text] of [
    [section.tsx, tsx],
    [section.css, css],
  ]) {
    if (hex.test(text)) {
      fail(`${section.name} ${file}`, "hex colour literal (tokens.css is the only colour source)");
    }
  }
  if (!tsx.includes(`text("${BASE_IMAGE_PENDING}")`) && section.name !== "elder") {
    fail(`${section.name} dom`, `placeholder label must be text("${BASE_IMAGE_PENDING}")`);
  }
  checked.push(`${section.name} files: no hex literal, no ※ annotation, dictionary-only placeholder label`);
}

// ---------------------------------------------------------------------- driving

function findNode(node, id) {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found !== null) return found;
  }
  return null;
}

const pen = readPen();
const root = pen.children[0];
const tokens = tokensFrom(decorate(parseStylesheet(readFileSync(join(ROOT, TOKENS), "utf8"))));
const primitiveRules = decorate(parseStylesheet(readFileSync(join(ROOT, PRIMITIVES), "utf8")));

for (const section of SECTIONS) {
  const node = findNode(root, section.nodeId);
  if (node === null) {
    fail(section.name, `node ${section.nodeId} is not in ui.pen`);
    continue;
  }
  const css = readFileSync(join(ROOT, section.css), "utf8");
  const tsx = readFileSync(join(ROOT, section.tsx), "utf8");
  const rules = decorate(parseStylesheet(css));
  const resolve = makeResolver(variablesFor(rules, tokens));
  const context = { section, rules, resolve, primitiveRules, tsx };

  const stack = [{ node, parent: null }];
  let nodeCount = 0;
  while (stack.length > 0) {
    const { node: current, parent } = stack.pop();
    nodeCount += 1;
    if (section.annotations[current.id] !== undefined) {
      annotationCount += 1;
      console.log(
        `  skip ${section.name} ${current.id} ${current.name}: ${section.annotations[current.id]}`,
      );
    } else {
      checkNode(context, current, parent);
    }
    for (const child of current.children ?? []) {
      stack.push({ node: child, parent: current });
    }
  }
  checkDom(section, tsx, css);
  const mediaSteps = rules.filter((rule) => rule.at !== null).length;
  console.log(
    `${section.name} (${section.nodeId}): nodes=${nodeCount} responsive_declarations=${mediaSteps} ` +
      `rendered_text_keys=${[...tsx.matchAll(/text\("([^"]+)"\)/g)].length}`,
  );
}

if (LIST) {
  console.log([...checked].sort().join("\n"));
}
console.log(`\nchecked=${checked.length} missing=${missing.length}`);
if (missing.length > 0) {
  console.error(missing.map((line) => `MISSING  ${line}`).join("\n"));
  process.exit(1);
}
console.log(`all design values have a declaration (annotation nodes skipped: ${annotationCount})`);
