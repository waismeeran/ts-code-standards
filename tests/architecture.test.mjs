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
import { resolve } from "node:path";

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
const typescriptLinter = new ESLint({
  overrideConfig: typescript,
  overrideConfigFile: true,
});
const typeCheckedLinter = new ESLint({
  overrideConfig: typescriptTypeChecked,
  overrideConfigFile: true,
});

async function lintMessages(code, filePath) {
  const [result] = await javascriptLinter.lintText(code, { filePath });
  return result.messages;
}

test("the dependency-safe root exports JavaScript but not optional TypeScript presets", () => {
  assert.deepEqual(Object.keys(root).sort(), [
    "javascript",
  ]);
  assert.ok(Array.isArray(root.javascript));
});

test("public preset subpaths resolve to typed arrays", () => {
  for (const [name, preset] of Object.entries(publicPresets)) {
    assert.equal(Array.isArray(preset), true, name);
  }

  assert.ok(javascript.length >= 2);
  for (const name of ["browser", "node"]) {
    assert.equal(publicPresets[name].length, 0, name + " remains out of Phase 1 scope");
  }
  assert.ok(typescript.length > 0);
  assert.ok(typescriptTypeChecked.length > typescript.length);
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

test("the untyped TypeScript preset parses supported extensions without project info", async () => {
  const fixtures = [
    ["example.ts", "export const value: string = 'ok';"],
    ["example.tsx", "export const view = <main />;"],
    ["example.mts", "export const value: string = 'ok';"],
    ["example.cts", "export const value: string = 'ok';"],
    ["example.d.ts", "export declare const value: string;"],
  ];

  for (const [filePath, code] of fixtures) {
    const [result] = await typescriptLinter.lintText(code, { filePath });
    assert.deepEqual(result.messages, [], filePath);
  }

  const config = await typescriptLinter.calculateConfigForFile("src/example.ts");
  assert.equal(config.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
  assert.equal(config.languageOptions.parserOptions?.projectService, undefined);
  assert.equal(config.rules["no-undef"][0], 0);
  assert.equal(config.rules["no-unused-vars"][0], 0);
  assert.equal(config.rules["@typescript-eslint/no-unused-vars"][0], 2);
  assert.equal(config.rules["prefer-const"][0], 2);
  assert.equal(config.rules["@typescript-eslint/no-explicit-any"][0], 2);
  const javascriptConfig = await typescriptLinter.calculateConfigForFile("src/example.js");
  assert.equal(javascriptConfig.rules?.["@typescript-eslint/no-explicit-any"], undefined);
  assert.equal(javascriptConfig.rules?.["prefer-const"], undefined);
});

test("TypeScript custom policies accept underscore-prefixed unused parameters and type-only imports", async () => {
  const accepted = await typescriptLinter.lintText(
    'import type { Linter } from "eslint"; function use(_unused: string): Linter.Config { return {}; } export { use };',
    { filePath: "policy.ts" },
  );
  assert.deepEqual(accepted[0].messages, []);

  const rejected = await typescriptLinter.lintText(
    'import { Linter } from "eslint"; export const config: Linter.Config = {};',
    { filePath: "runtime-import.ts" },
  );
  assert.ok(rejected[0].messages.some(
    (message) => message.ruleId === "@typescript-eslint/consistent-type-imports",
  ));
});

test("the type-checked preset adds semantic rules and Project Service", async () => {
  const fixturePath = resolve("tests/fixtures/typescript-project/src/semantic-cases.ts");
  const [untypedResult] = await typescriptLinter.lintFiles([fixturePath]);
  const [typedResult] = await typeCheckedLinter.lintFiles([fixturePath]);
  const typedRules = typedResult.messages.map((message) => message.ruleId);

  assert.ok(!untypedResult.messages.some(
    (message) => message.ruleId === "@typescript-eslint/no-floating-promises",
  ));
  for (const ruleId of [
    "@typescript-eslint/no-floating-promises",
    "@typescript-eslint/no-misused-promises",
    "@typescript-eslint/no-unsafe-argument",
    "@typescript-eslint/await-thenable",
  ]) {
    assert.ok(typedRules.includes(ruleId), ruleId);
  }

  const config = await typeCheckedLinter.calculateConfigForFile(fixturePath);
  assert.equal(config.languageOptions.parserOptions.projectService, true);
  assert.equal(config.rules["@typescript-eslint/no-unused-vars"][0], 2);
});

test("declarations and project TSX work with both presets; out-of-project typed files fail clearly", async () => {
  const projectFiles = [
    resolve("tests/fixtures/typescript-project/src/types.d.ts"),
    resolve("tests/fixtures/typescript-project/src/view.tsx"),
  ];

  for (const filePath of projectFiles) {
    const [untypedResult] = await typescriptLinter.lintFiles([filePath]);
    const [typedResult] = await typeCheckedLinter.lintFiles([filePath]);
    assert.deepEqual(untypedResult.messages, [], filePath);
    assert.deepEqual(typedResult.messages, [], filePath);
  }

  const outsidePath = resolve("tests/fixtures/outside-of-project.ts");
  const [outsideResult] = await typeCheckedLinter.lintFiles([outsidePath]);
  assert.ok(outsideResult.messages.some((message) =>
    /not found by the project service|allowDefaultProject/.test(message.message),
  ));
});

test("effective TypeScript configs are scoped, neutral, and free of format/framework plugins", async () => {
  for (const linter of [typescriptLinter, typeCheckedLinter]) {
    for (const extension of ["ts", "tsx", "d.ts"]) {
      const config = await linter.calculateConfigForFile(`src/example.${extension}`);
      assert.equal(config.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
      assert.equal(config.languageOptions.globals, undefined);
      assert.equal(config.rules["no-undef"][0], 0);
      assert.equal(config.rules["no-unused-vars"][0], 0);
      assert.equal(config.rules["@typescript-eslint/no-unused-vars"][0], 2);
      const pluginNames = Object.keys(config.plugins ?? {});
      assert.ok(pluginNames.includes("@typescript-eslint"));
      assert.ok(!pluginNames.some((name) => /react|angular|import|vitest|playwright/.test(name)));
      for (const rule of ["semi", "quotes", "indent", "comma-dangle", "max-len"]) {
        assert.equal(config.rules[rule], undefined, rule);
      }
      assert.equal(
        config.languageOptions.parserOptions?.projectService,
        linter === typeCheckedLinter ? true : undefined,
      );
    }
  }
});

test("declarations describe the public Preset type", async () => {
  await access("dist/index.d.ts");
  const declaration = await readFile("dist/index.d.ts", "utf8");
  assert.match(declaration, /export type \{ Preset \} from "\.\/types\.js"/);
});
