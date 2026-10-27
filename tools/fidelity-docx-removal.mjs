/*
 * The one judgement behind the three fidelity gates' docx-1027 removal registries.
 *
 * docx-1027 deletes a batch of mono micro-labels (第 3 条), the ZH/EN switcher (第 6 条) and the
 * footer's copyright block (第 10 条). The frozen board still draws every one of those nodes,
 * so each gate names them in a `REMOVED_BY_DOCX` table and stops asserting their style and
 * copy. A registration is not an exemption: it holds only while the slot's keys are gone from
 * both dictionaries and no file under src/ names them. The moment a key comes back, the
 * registration is stale, and the gate fails and names the node — the table cannot quietly turn
 * into a hole in the gate.
 *
 * This is not SUPERSEDED_BY_DOCX (fidelity-scholarly's): that one keeps a slot whose text the
 * docx replaced, held to its key. Here the slot itself is gone, so a superseded entry would
 * assert a key that no longer has to exist. The two tables never share a node.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["en", "zh"];

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$|\.css$/.test(entry.name) ? [path] : [];
  });
}

/**
 * Which registrations still hold, and why the others do not.
 *
 * `registry` maps a ui.pen node id to `{ keys, docx }` — the keys that node carried and the
 * docx item that deleted them. `root` is the repo root; each gate passes its own. Returns the
 * node ids whose keys are gone from both docs/copy-{en,zh}.json and from src/, plus one
 * ready-to-print failure per registration whose key came back. The `src/` test is a plain
 * substring search on purpose: any mention — a text() call, a table entry, even a comment —
 * means the slot is being restored, and that has to reach the gate rather than slip past it.
 */
export function judgeRemovedByDocx(registry, root) {
  const dictionaries = LOCALES.map((locale) =>
    JSON.parse(readFileSync(join(root, "docs", `copy-${locale}.json`), "utf8")),
  );
  const srcText = sourceFiles(join(root, "src"))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");

  const active = new Set();
  const stale = [];
  for (const [node, entry] of Object.entries(registry)) {
    const back = LOCALES.flatMap((locale, index) =>
      entry.keys
        .filter((key) => key in dictionaries[index])
        .map((key) => `${key} is back in docs/copy-${locale}.json`),
    );
    const named = entry.keys.filter((key) => srcText.includes(key));
    if (back.length === 0 && named.length === 0) {
      active.add(node);
      continue;
    }
    const why = [...back, ...named.map((key) => `src/ names ${key}`)];
    stale.push(
      `${node}: ${entry.docx} deletes ${entry.keys.join(" + ")}, but ${why.join(" and ")}; ` +
        "revoke the registration and restore the assertion",
    );
  }
  return { active, stale };
}
