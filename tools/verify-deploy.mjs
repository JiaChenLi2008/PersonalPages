#!/usr/bin/env node
/*
 * Deployment gate.
 *
 * The site ships over GitHub Pages only (user ruling). This check pins that
 * decision down mechanically: vite keeps a relative base, the npm scripts keep
 * producing dist/, the Pages workflow keeps every required trigger, permission
 * and step, and every script the workflow or the README tells you to run
 * really exists on disk.
 *
 * Usage: node tools/verify-deploy.mjs   (exit 0 = deploy path intact)
 * Dependency-free and network-free on purpose: it must run in CI and on a
 * machine with no registry access alike.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WORKFLOW = ".github/workflows/deploy.yml";
const README = "README.md";

/** `node <path>.mjs` invocations, as written in shell blocks and run: steps. */
const NODE_SCRIPT = /\bnode\s+([\w./-]+\.(?:mjs|js))\b/g;

const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });

const text = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8") : "");
const has = (haystack, needle) => haystack.includes(needle);

for (const rel of ["vite.config.ts", "package.json", WORKFLOW, README]) {
  check(`${rel} exists`, existsSync(join(ROOT, rel)));
}

// Base stays relative so the same build serves /<repo>/ subpaths and a custom
// domain (root path) without a BASE override.
check('vite.config.ts sets base: "./"', has(text("vite.config.ts"), 'base: "./"'));

let pkg = null;
try {
  pkg = JSON.parse(text("package.json"));
} catch {
  pkg = null;
}
check("package.json parses", pkg !== null);
check("package.json scripts.build runs `vite build`", has(pkg?.scripts?.build ?? "", "vite build"));
check("package.json scripts.preview exists", Boolean(pkg?.scripts?.preview));

const workflow = text(WORKFLOW);
const workflowLiterals = [
  ["triggers on push", "push:"],
  ["workflow_dispatch", "workflow_dispatch:"],
  ["permission contents: read", "contents: read"],
  ["permission pages: write", "pages: write"],
  ["permission id-token: write", "id-token: write"],
  ["actions/checkout", "actions/checkout@"],
  ["actions/setup-node", "actions/setup-node@"],
  ["actions/configure-pages", "actions/configure-pages@"],
  ["actions/upload-pages-artifact", "actions/upload-pages-artifact@"],
  ["actions/deploy-pages", "actions/deploy-pages@"],
  ["setup-node cache: npm", "cache: npm"],
  ["install with npm ci", "npm ci"],
  ["build with npm run build", "npm run build"],
];
for (const [label, needle] of workflowLiterals) {
  check(`${WORKFLOW} ${label}`, has(workflow, needle));
}

// Anchored to the whole line: `path: ./dist2` must not slip through as `path: ./dist`.
const workflowPatterns = [
  ["push targets main", /^\s*branches:\s*\[main\]\s*$/m],
  ["concurrency group", /^concurrency:\s*$/m],
  ["concurrency group set", /^\s+group:\s*\S+/m],
  ["Node 22", /^\s*node-version:\s*["']?22["']?\s*$/m],
  ["upload path: ./dist", /^\s*path:\s*\.\/dist\s*$/m],
];
for (const [label, pattern] of workflowPatterns) {
  check(`${WORKFLOW} ${label}`, pattern.test(workflow));
}

// Checks that need assets outside the repo (ui.pen, .agents/briefs/) cannot run
// on a CI checkout, so they must stay out of the workflow.
check(`${WORKFLOW} excludes docs/verify-copy.mjs`, !has(workflow, "docs/verify-copy.mjs"));
check(`${WORKFLOW} excludes fidelity-* checks`, !has(workflow, "fidelity-"));
for (const rel of ["tools/verify-tokens.mjs", "tools/verify-deploy.mjs", "tools/verify-copy-wiring.mjs"]) {
  check(`${WORKFLOW} runs node ${rel}`, has(workflow, `node ${rel}`));
}

// These three gates need nothing but the checkout (no browser, no repo-external
// assets), so the workflow must keep running them. Anchored to the whole `run:`
// line: a renamed script (tools/verify-head-x.mjs) must not pass as a substring.
for (const rel of ["tools/verify-head.mjs", "tools/verify-responsive.mjs", "tools/verify-ssr-dom.mjs"]) {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stepPattern = new RegExp(`^\\s*run:\\s*node\\s+${escaped}\\s*$`, "m");
  check(`${WORKFLOW} runs node ${rel}`, stepPattern.test(workflow));
}

// Every script a human or the workflow is told to run must actually be there.
for (const [who, body] of [[WORKFLOW, workflow], [README, text(README)]]) {
  const referenced = [...new Set([...body.matchAll(NODE_SCRIPT)].map((match) => match[1]))].sort();
  for (const rel of referenced) {
    check(`${who} references existing script ${rel}`, existsSync(join(ROOT, rel)));
  }
}

for (const keyword of ["Settings", "GitHub Actions", "dist", "github.io"]) {
  check(`${README} mentions ${keyword}`, has(text(README), keyword));
}

const failed = checks.filter((entry) => !entry.ok);
for (const entry of checks) {
  console.log(`${entry.ok ? "ok  " : "FAIL"} ${entry.label}`);
}
console.log(`checked=${checks.length} passed=${checks.length - failed.length}`);
process.exit(failed.length > 0 ? 1 : 0);
