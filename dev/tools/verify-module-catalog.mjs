import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { MODULE_CATALOG } from "../modules/catalog.js";
import { ASSETS } from "../content/assets.js";
import { PROP_BUILDERS } from "../modules/props/registry.js";
import { PROP_IDS } from "../content/props.js";
const sources = new Set(MODULE_CATALOG.map((m) => m.source));
assert.equal(
  new Set(MODULE_CATALOG.map((m) => m.id)).size,
  MODULE_CATALOG.length,
  "Duplicate catalog identity",
);
for (const entry of MODULE_CATALOG) {
  assert.ok(
    entry.name && entry.description && entry.capabilities?.length,
    `${entry.id}: missing documentation`,
  );
  await access(entry.source);
  for (const dep of entry.dependencies || [])
    assert.ok(
      MODULE_CATALOG.some((m) => m.id === dep),
      `${entry.id}: unknown dependency ${dep}`,
    );
}
for (const id of Object.keys(ASSETS))
  assert.ok(MODULE_CATALOG.some((m) => m.id === id));
assert.deepEqual([...PROP_IDS].sort(), Object.keys(PROP_BUILDERS).sort());
for (const dir of ["dev/runtime", "dev/presentation", "dev/features"])
  for (const entry of await readdir(dir))
    if (entry.endsWith(".js"))
      assert.ok(
        sources.has(`${dir}/${entry}`),
        `New public module missing from gallery: ${dir}/${entry}`,
      );
for (const name of await readdir("dev/modules/props"))
  if (name.endsWith(".js") && !["registry.js", "toolkit.js"].includes(name))
    assert.ok(
      PROP_IDS.includes(name.slice(0, -3)),
      `Unregistered prefab ${name}`,
    );
const generated = JSON.parse(
  await readFile("dev/modules/catalog.json", "utf8"),
);
assert.deepEqual(
  generated.modules,
  JSON.parse(JSON.stringify(MODULE_CATALOG)),
  "Rebuild the module catalog",
);
console.log(
  `PASS: ${MODULE_CATALOG.length} module entries, all public module sources, prefab registrations and catalog parity.`,
);
