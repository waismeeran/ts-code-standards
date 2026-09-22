import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";
import { defineConfig } from "eslint/config";
import { ESLint } from "eslint";

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

const javascriptLinter = new ESLint({
  overrideConfig: javascript,
  overrideConfigFile: true,
});

async function lintMessages(code, filePath) {
  const [result] = await javascriptLinter.lintText(code, { filePath });
  return result.messages;
}

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
  }

  assert.ok(javascript.length >= 2);
  for (const name of ["browser", "node", "typescript", "typescriptTypeChecked"]) {
    assert.equal(publicPresets[name].length, 0, name + " remains out of Phase 1 scope");
  }
});

test("defineConfig is the supported array composition boundary", () => {
  const composed = defineConfig(javascript, browser, {
    name: "consumer-overrides",
  });

  assert.equal(Array.isArray(composed), true);
  assert.equal(composed.length, javascript.length + 1);
  assert.equal(composed.at(-1).name, "consumer-overrides");
});

test("the internal base is not a package export", async () => {
  await assert.rejects(
    import("@scope/js-style-guide/base"),
    (error) => error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED",
  );
});

test("the recommended JavaScript rules catch representative correctness issues", async () => {
  const messages = await lintMessages("debugger;", "fixture.js");
  assert.ok(messages.some((message) => message.ruleId === "no-debugger"));
});

test("prefer-const rejects an immutable let and accepts a reassigned let", async () => {
  const invalid = await lintMessages(
    "let answer = 42; function read() { return answer; } read();",
    "immutable.js",
  );
  assert.ok(invalid.some((message) => message.ruleId === "prefer-const"));

  const valid = await lintMessages(
    "let answer = 41; answer += 1; function read() { return answer; } read();",
    "mutable.js",
  );
  assert.deepEqual(valid, []);
});

test("supports ESM, CommonJS, and JSX syntax without framework configuration", async () => {
  assert.deepEqual(
    await lintMessages("export const answer = 42;", "module.mjs"),
    [],
  );
  assert.deepEqual(
    await lintMessages(
      'const value = require("node:path"); module.exports = value;',
      "commonjs.cjs",
    ),
    [],
  );
  assert.deepEqual(
    await lintMessages("export default <main />;", "view.jsx"),
    [],
  );
});

test("JavaScript remains environment-neutral and does not configure TypeScript", async () => {
  for (const filePath of ["environment-neutral.js", "environment-neutral.cjs"]) {
    const globals = await lintMessages("window.document; process.exit();", filePath);
    assert.equal(globals.filter((message) => message.ruleId === "no-undef").length, 2);
  }

  assert.equal(await javascriptLinter.calculateConfigForFile("example.ts"), undefined);

  const config = await javascriptLinter.calculateConfigForFile("example.js");
  assert.equal(config.languageOptions.globals, undefined);
  assert.equal(config.rules["no-undef"][0], 2);
  assert.equal(config.rules["prefer-const"][0], 2);
  for (const pluginName of Object.keys(config.plugins ?? {})) {
    assert.ok(!/typescript|react|angular|vitest|playwright|import/.test(pluginName));
  }
  for (const rule of ["semi", "quotes", "indent", "comma-dangle", "object-curly-spacing", "brace-style", "max-len"]) {
    assert.equal(config.rules[rule], undefined, rule + " is formatting policy");
  }
});

test("declarations describe the public Preset type", async () => {
  await access("dist/index.d.ts");
  const declaration = await readFile("dist/index.d.ts", "utf8");
  assert.match(declaration, /export type \{ Preset \} from "\.\/types\.js"/);
});
