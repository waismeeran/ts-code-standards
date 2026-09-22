import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";
import { defineConfig } from "eslint/config";

import * as root from "@scope/js-style-guide";
import browser from "@scope/js-style-guide/browser";
import javascript from "@scope/js-style-guide/javascript";
import node from "@scope/js-style-guide/node";
import typescript from "@scope/js-style-guide/typescript";
import typescriptTypeChecked from "@scope/js-style-guide/typescript-type-checked";

const publicPresets = {
  browser,
  javascript,
  node,
  typescript,
  typescriptTypeChecked,
};

test("root exports only core language capabilities", () => {
  assert.deepEqual(Object.keys(root).sort(), [
    "javascript",
    "typescript",
    "typescriptTypeChecked",
  ]);
});

test("public preset subpaths resolve to typed arrays", () => {
  for (const [name, preset] of Object.entries(publicPresets)) {
    assert.equal(Array.isArray(preset), true, name);
    assert.equal(preset.length, 0, name + " remains a Phase 0B placeholder");
  }
});

test("defineConfig is the supported array composition boundary", () => {
  const composed = defineConfig(javascript, browser, {
    name: "consumer-overrides",
  });

  assert.equal(Array.isArray(composed), true);
  assert.equal(composed.length, 1);
  assert.equal(composed[0].name, "consumer-overrides");
});

test("the internal base is not a package export", async () => {
  await assert.rejects(
    import("@scope/js-style-guide/base"),
    (error) => error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED",
  );
});

test("declarations describe the public Preset type", async () => {
  await access("dist/index.d.ts");
  const declaration = await readFile("dist/index.d.ts", "utf8");
  assert.match(declaration, /export type \{ Preset \} from "\.\/types\.js"/);
});
