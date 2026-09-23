import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { defineConfig } from "eslint/config";
import { ESLint } from "eslint";
import { tmpdir } from "node:os";

import * as root from "@scope/js-style-guide";
import browser from "@scope/js-style-guide/browser";
import imports from "@scope/js-style-guide/imports";
import javascript from "@scope/js-style-guide/javascript";
import node from "@scope/js-style-guide/node";
import typescript from "@scope/js-style-guide/typescript";
import typescriptTypeChecked from "@scope/js-style-guide/typescript-type-checked";
import { join, resolve } from "node:path";

const publicPresets = {
  browser,
  imports,
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
  assert.ok(browser.length > 0);
  assert.ok(node.length > 0);
  assert.ok(imports.length > 0);
  assert.ok(typescript.length > 0);
  assert.ok(typescriptTypeChecked.length > typescript.length);
});

test("defineConfig is the supported array composition boundary", () => {
  const composed = defineConfig(javascript, browser, {
    name: "consumer-overrides",
  });

  assert.equal(Array.isArray(composed), true);
  assert.equal(composed.length, javascript.length + browser.length + 1);
  assert.equal(composed.at(-1).name, "consumer-overrides");
});

test("browser is a language-neutral overlay and exposes browser, not Node, globals", async () => {
  const plain = await javascriptLinter.lintText("window.document;", { filePath: "plain.js" });
  assert.ok(plain[0].messages.some((message) => message.ruleId === "no-undef"));

  const browserLinter = new ESLint({
    overrideConfig: defineConfig(javascript, browser),
    overrideConfigFile: true,
  });
  const browserResult = await browserLinter.lintText(
    "window.document; navigator.userAgent; location.href; fetch; URL; console; setTimeout;",
    { filePath: "browser.js" },
  );
  assert.deepEqual(browserResult[0].messages, []);

  const nodeLeak = await browserLinter.lintText("process.cwd(); Buffer.from('x');", {
    filePath: "browser-only.js",
  });
  assert.deepEqual(
    nodeLeak[0].messages.filter((message) => message.ruleId === "no-undef").length,
    2,
  );

  const typescriptBrowser = new ESLint({
    overrideConfig: defineConfig(typescript, browser),
    overrideConfigFile: true,
  });
  const tsConfig = await typescriptBrowser.calculateConfigForFile("client/view.tsx");
  assert.equal(tsConfig.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
  assert.ok("window" in tsConfig.languageOptions.globals);
  assert.ok(!("process" in tsConfig.languageOptions.globals));
});

test("Node uses built-ins for ESM and CommonJS wrapper globals only for explicit CJS extensions", async () => {
  const plain = await javascriptLinter.lintText("process.cwd();", { filePath: "plain.js" });
  assert.ok(plain[0].messages.some((message) => message.ruleId === "no-undef"));

  const nodeLinter = new ESLint({
    overrideConfig: defineConfig(javascript, node),
    overrideConfigFile: true,
  });
  const esm = await nodeLinter.lintText("process.cwd(); Buffer.from('x');", {
    filePath: "server.mjs",
  });
  assert.deepEqual(esm[0].messages, []);

  const invalidEsmWrapper = await nodeLinter.lintText(
    'require("node:path"); __dirname; __filename; module.exports; exports.value;',
    { filePath: "server.mjs" },
  );
  assert.equal(
    invalidEsmWrapper[0].messages.filter((message) => message.ruleId === "no-undef").length,
    5,
  );

  const commonJs = await nodeLinter.lintText(
    'require("node:path"); __dirname; __filename; module.exports; exports.value;',
    { filePath: "server.cjs" },
  );
  assert.deepEqual(commonJs[0].messages, []);

  const ambiguousJs = await nodeLinter.calculateConfigForFile("server.js");
  assert.ok("process" in ambiguousJs.languageOptions.globals);
  assert.ok(!("require" in ambiguousJs.languageOptions.globals));
  assert.ok(!("window" in ambiguousJs.languageOptions.globals));

  const nodeTypescript = new ESLint({
    overrideConfig: defineConfig(typescript, node),
    overrideConfigFile: true,
  });
  const esmConfig = await nodeTypescript.calculateConfigForFile("server.mts");
  const cjsConfig = await nodeTypescript.calculateConfigForFile("server.cts");
  assert.equal(esmConfig.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
  assert.ok("process" in esmConfig.languageOptions.globals);
  assert.ok(!("require" in esmConfig.languageOptions.globals));
  assert.ok("require" in cjsConfig.languageOptions.globals);
  assert.ok(!("window" in esmConfig.languageOptions.globals));

  const nodeFiles = [
    ["js", nodeLinter, false],
    ["mjs", nodeLinter, false],
    ["cjs", nodeLinter, true],
    ["jsx", nodeLinter, false],
    ["ts", nodeTypescript, false],
    ["mts", nodeTypescript, false],
    ["cts", nodeTypescript, true],
    ["tsx", nodeTypescript, false],
  ];
  for (const [extension, linter, isCommonJs] of nodeFiles) {
    const config = await linter.calculateConfigForFile(`server/example.${extension}`);
    assert.ok("process" in config.languageOptions.globals, extension);
    assert.ok(!("window" in config.languageOptions.globals), extension);
    for (const name of ["require", "module", "exports", "__dirname", "__filename"]) {
      assert.equal(name in config.languageOptions.globals, isCommonJs, `${extension}: ${name}`);
    }
  }
});

test("browser and Node can be scoped independently in one repository", async () => {
  const mixed = defineConfig(
    {
      files: ["client/**/*.ts"],
      extends: [typescript, browser],
    },
    {
      files: ["server/**/*.ts"],
      extends: [typescriptTypeChecked, node],
    },
  );
  const linter = new ESLint({ overrideConfig: mixed, overrideConfigFile: true });
  const client = await linter.calculateConfigForFile("client/app.ts");
  const server = await linter.calculateConfigForFile("server/app.ts");

  assert.ok("window" in client.languageOptions.globals);
  assert.ok(!("process" in client.languageOptions.globals));
  assert.ok("process" in server.languageOptions.globals);
  assert.ok(!("window" in server.languageOptions.globals));
  assert.equal(server.languageOptions.parserOptions?.projectService, true);
});

test("imports checks JS resolution, duplicate declarations, and exported names without sorting", async () => {
  const importsLinter = new ESLint({
    overrideConfig: defineConfig(javascript, imports),
    overrideConfigFile: true,
  });
  const fixtureRoot = resolve("tests/fixtures/imports-project/src");

  for (const file of ["valid.js", "target.js"]) {
    const [result] = await importsLinter.lintFiles([join(fixtureRoot, file)]);
    assert.deepEqual(result.messages, [], file);
  }

  const cases = [
    ["duplicate.js", "import-x/no-duplicates"],
    ["unresolved.js", "import-x/no-unresolved"],
    ["invalid-named.js", "import-x/named"],
  ];
  for (const [file, ruleId] of cases) {
    const [result] = await importsLinter.lintFiles([join(fixtureRoot, file)]);
    assert.ok(result.messages.some((message) => message.ruleId === ruleId), `${file}: ${ruleId}`);
  }

  const config = await importsLinter.calculateConfigForFile("src/example.js");
  assert.ok(config.plugins["import-x"]);
  assert.equal(config.languageOptions.globals, undefined);
  for (const rule of [
    "semi",
    "quotes",
    "indent",
    "max-len",
    "import-x/order",
    "sort-imports",
    "import-x/no-cycle",
    "import-x/no-unused-modules",
    "unused-imports/no-unused-imports",
  ]) {
    assert.equal(config.rules[rule], undefined, rule);
  }
  for (const pluginName of Object.keys(config.plugins ?? {})) {
    assert.ok(!/react|angular|vitest|playwright/.test(pluginName));
  }

  const importsOnlyLinter = new ESLint({
    overrideConfig: imports,
    overrideConfigFile: true,
  });
  for (const filePath of ["src/example.js", "src/example.ts"]) {
    const importsOnly = await importsOnlyLinter.calculateConfigForFile(filePath);
    assert.notEqual(
      importsOnly.languageOptions.parser?.meta?.name,
      "typescript-eslint/parser",
      filePath,
    );
    assert.equal(importsOnly.languageOptions.globals, undefined, filePath);
    assert.equal(importsOnly.rules["no-undef"], undefined, filePath);
    assert.equal(importsOnly.rules["prefer-const"], undefined, filePath);
    assert.ok(importsOnly.plugins["import-x"]);
    assert.ok(!Object.keys(importsOnly.plugins).includes("@typescript-eslint"));
  }
});

test("imports resolves TypeScript path aliases and allows the preset's separate type imports", async () => {
  const script = [
    'import { ESLint } from "eslint";',
    'import { defineConfig } from "eslint/config";',
    'import typescript from "@scope/js-style-guide/typescript";',
    'import imports from "@scope/js-style-guide/imports";',
    'const linter = new ESLint({ overrideConfig: defineConfig(typescript, imports), overrideConfigFile: true });',
    'const files = ["src/valid-alias.ts", "src/duplicate-alias.ts", "src/unresolved-alias.ts"];',
    'const results = await Promise.all(files.map((file) => linter.lintFiles([file])));',
    'process.stdout.write(JSON.stringify(results.map(([result]) => result.messages.map(({ruleId}) => ruleId))));',
  ].join("\n");
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: resolve("tests/fixtures/imports-project"),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const [validRules, duplicateRules, unresolvedRules] = JSON.parse(result.stdout);
  assert.deepEqual(validRules, []);
  assert.ok(duplicateRules.includes("no-duplicate-imports"));
  assert.ok(unresolvedRules.includes("import-x/no-unresolved"));
});

test("imports resolves public package exports and rejects an unexported package subpath", async () => {
  const consumerRoot = await mkdtemp(join(tmpdir(), "style-guide-package-exports-"));
  const fixturePackage = join(
    consumerRoot,
    "node_modules",
    "phase3-package-exports-fixture",
  );
  await mkdir(fixturePackage, { recursive: true });
  await mkdir(join(consumerRoot, "src"));

  try {
    await writeFile(join(fixturePackage, "package.json"), JSON.stringify({
      name: "phase3-package-exports-fixture",
      type: "module",
      exports: {
        "./feature": "./feature.js",
      },
    }, null, 2));
    await writeFile(join(fixturePackage, "feature.js"), "export const value = 42;\n");
    await writeFile(join(consumerRoot, "src/valid.mjs"), [
      'import { value } from "phase3-package-exports-fixture/feature";',
      "export const answer = value;",
      "",
    ].join("\n"));
    await writeFile(join(consumerRoot, "src/private.mjs"), [
      'import "phase3-package-exports-fixture/private";',
      "export const answer = 42;",
      "",
    ].join("\n"));

    const packageLinter = new ESLint({
      cwd: consumerRoot,
      overrideConfig: defineConfig(javascript, imports),
      overrideConfigFile: true,
    });
    const [valid] = await packageLinter.lintFiles([join(consumerRoot, "src/valid.mjs")]);
    assert.deepEqual(valid.messages, []);
    const [privatePath] = await packageLinter.lintFiles([
      join(consumerRoot, "src/private.mjs"),
    ]);
    assert.ok(privatePath.messages.some((message) => message.ruleId === "import-x/no-unresolved"));
  } finally {
    await rm(consumerRoot, { recursive: true, force: true });
  }
});

test("the internal base is not a package export", async () => {
  // Verify the package export map rejects this path without import-rule noise.
  // eslint-disable-next-line import-x/no-unresolved -- expected private subpath
  const loadInternalBase = () => import("@scope/js-style-guide/base");
  await assert.rejects(
    loadInternalBase(),
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
