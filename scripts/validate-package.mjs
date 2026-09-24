import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix, resolve } from "node:path";

const root = resolve(".");
const packDirectory = await mkdtemp(join(tmpdir(), "js-style-guide-pack-"));
const consumers = await Promise.all([
  mkdtemp(join(tmpdir(), "js-style-guide-js-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-playwright-js-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-ts-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-typed-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-react-js-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-react-ts-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-react-typed-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-react-browser-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-react-imports-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-next-js-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-next-ts-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-next-typed-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-next-imports-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-next-browser-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-angular-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-angular-browser-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-angular-imports-consumer-")),
  mkdtemp(join(tmpdir(), "js-style-guide-angular-typed-consumer-")),
]);

function run(command, args, cwd, { rejectPeerWarnings = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(" ")} failed with exit ${result.status}`,
      result.stdout,
      result.stderr,
    ].join("\n"));
  }

  if (rejectPeerWarnings) {
    assert.doesNotMatch(result.stderr, /ERESOLVE|unmet peer dependency|peer dep conflict/i, `${command} ${args.join(" ")}: no misleading peer-resolution warning`);
  }

  return result.stdout;
}

async function writeConsumer(directory, name, tarballPath, typescriptVersion, omitPeers = false, extraDependencies = {}) {
  const dependencies = {
    "@scope/js-style-guide": `file:${tarballPath}`,
    eslint: "10.11.0",
    ...extraDependencies,
  };
  if (typescriptVersion) dependencies.typescript = typescriptVersion;

  await writeFile(join(directory, "package.json"), JSON.stringify({
    name,
    private: true,
    type: "module",
    dependencies,
  }, null, 2));

  const installArgs = ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false"];
  if (omitPeers) installArgs.push("--omit=peer");
  run("npm", installArgs, directory, { rejectPeerWarnings: true });
}

try {
  const packager = process.env.PACKAGE_MANAGER ?? (process.env.npm_execpath ? "npm" : "pnpm");
  const useNpm = packager === "npm" || packager.endsWith("/npm");
  const packArgs = useNpm
    ? ["pack", "--json", "--ignore-scripts", "--pack-destination", packDirectory]
    : ["pack", "--pack-destination", packDirectory];

  const packOutput = run(packager, packArgs, root);

  const packedFiles = await readdir(packDirectory);
  const tarball = packedFiles.find((name) => name.endsWith(".tgz"));
  assert.ok(tarball, "a package tarball should be created");

  const tarballPath = join(packDirectory, tarball);
  const archiveListing = execFileSync("tar", ["-tzf", tarballPath], {
    encoding: "utf8",
  }).split("\n").filter(Boolean);

  const packageMetadata = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const archiveFiles = new Set(archiveListing.filter((entry) => !entry.endsWith("/")));
  for (const [specifier, target] of Object.entries(packageMetadata.exports)) {
    if (typeof target === "string") {
      assert.ok(archiveFiles.has(`package/${target.replace(/^\.\//, "")}`), `${specifier}: package export target exists in tarball`);
      continue;
    }

    assert.deepEqual(Object.keys(target).sort(), ["import", "types"], `${specifier}: export exposes only ESM and type conditions`);
    assert.match(target.import, /^\.\/dist\/.*\.js$/, `${specifier}: ESM target uses emitted .js`);
    assert.match(target.types, /^\.\/dist\/.*\.d\.ts$/, `${specifier}: declaration target uses emitted .d.ts`);
    assert.ok(archiveFiles.has(`package/${target.import.replace(/^\.\//, "")}`), `${specifier}: ESM target exists in tarball`);
    assert.ok(archiveFiles.has(`package/${target.types.replace(/^\.\//, "")}`), `${specifier}: declaration target exists in tarball`);
  }
  assert.ok(!("./vitest" in packageMetadata.exports), "Vitest remains absent from the public exports");
  assert.equal(packageMetadata.type, "module", "package remains ESM-only");

  const tarballMetadata = useNpm ? JSON.parse(packOutput)[0] : undefined;

  assert.ok(archiveListing.includes("package/dist/index.js"));
  assert.ok(archiveListing.includes("package/dist/index.d.ts"));
  assert.ok(archiveListing.includes("package/README.md"));
  assert.ok(archiveListing.includes("package/docs/contributing/CONTRIBUTING.md"));
  assert.ok(archiveListing.includes("package/LICENSE"));
  assert.ok(archiveListing.includes("package/docs/adr/0001-flat-config-and-composition.md"));
  assert.ok(archiveListing.includes("package/docs/presets/javascript.md"));
  assert.ok(archiveListing.includes("package/docs/presets/typescript.md"));
  assert.ok(archiveListing.includes("package/docs/presets/browser.md"));
  assert.ok(archiveListing.includes("package/docs/presets/node.md"));
  assert.ok(archiveListing.includes("package/docs/presets/imports.md"));
  assert.ok(archiveListing.includes("package/docs/presets/react.md"));
  assert.ok(archiveListing.includes("package/docs/presets/next.md"));
  assert.ok(archiveListing.includes("package/docs/presets/angular.md"));
  assert.ok(archiveListing.includes("package/docs/presets/playwright.md"));
  assert.ok(archiveListing.includes("package/dist/presets/imports.js"));
  assert.ok(archiveListing.includes("package/dist/presets/react.js"));
  assert.ok(archiveListing.includes("package/dist/presets/react.d.ts"));
  assert.ok(archiveListing.includes("package/dist/presets/next.js"));
  assert.ok(archiveListing.includes("package/dist/presets/next.d.ts"));
  assert.ok(archiveListing.includes("package/dist/presets/angular.js"));
  assert.ok(archiveListing.includes("package/dist/presets/angular.d.ts"));
  assert.ok(archiveListing.includes("package/dist/presets/playwright.js"));
  assert.ok(archiveListing.includes("package/dist/presets/playwright.d.ts"));
  assert.ok(archiveListing.includes("package/docs/adr/0009-react-linting-strategy.md"));
  assert.ok(archiveListing.includes("package/docs/adr/0010-next-linting-composition.md"));
  assert.ok(archiveListing.includes("package/docs/adr/0011-angular-linting-strategy.md"));
  assert.ok(archiveListing.includes("package/docs/adr/0012-vitest-deferral-node-compatibility.md"));
  assert.ok(!archiveListing.includes("package/AGENTS.md"));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/tests/")));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/src/")));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/.github/")));
  assert.ok(!archiveListing.some((entry) => /(^|\/)(AGENTS\.md|CLAUDE\.md|copilot-instructions\.md)$/.test(entry)));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/docs/agents/")));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/docs/planning/")));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/docs/phases/")));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/docs/audits/")));
  assert.ok(!archiveListing.some((entry) => entry.includes("node_modules")));
  assert.ok(!archiveListing.some((entry) => /(^|\/)(\.DS_Store|Thumbs\.db|\.npmrc|\.env(?:\.|$))/.test(entry)));
  assert.ok(!archiveListing.some((entry) => /\.(?:map|tsbuildinfo)$/.test(entry)));
  for (const markdownFile of archiveFiles) {
    if (!markdownFile.endsWith(".md")) continue;
    const contents = execFileSync("tar", ["-xOf", tarballPath, markdownFile], { encoding: "utf8" });
    for (const [, rawTarget] of contents.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(rawTarget)) continue;
      const targetPath = decodeURIComponent(rawTarget.split("#", 1)[0].split("?", 1)[0]);
      if (!targetPath) continue;
      const resolvedTarget = posix.normalize(posix.join(posix.dirname(markdownFile), targetPath));
      const existsAsFile = archiveFiles.has(resolvedTarget);
      const existsAsDirectory = [...archiveFiles].some((entry) => entry.startsWith(`${resolvedTarget.replace(/\/$/, "")}/`));
      assert.ok(existsAsFile || existsAsDirectory, `${markdownFile}: relative link ${rawTarget} resolves inside the package`);
    }
  }
  if (tarballMetadata) {
    assert.ok(tarballMetadata.size > 0, "npm pack reports a non-empty compressed artifact");
    assert.ok(tarballMetadata.unpackedSize > 0, "npm pack reports a non-empty unpacked artifact");
    assert.equal(tarballMetadata.files.length, archiveFiles.size, "npm pack file count matches the inspected archive");
    console.log(`Tarball metrics: ${tarballMetadata.files.length} files, ${tarballMetadata.size} bytes packed, ${tarballMetadata.unpackedSize} bytes unpacked.`);
  }

  const [
    javascriptConsumer,
    playwrightJsConsumer,
    typescriptConsumer,
    typedConsumer,
    reactJsConsumer,
    reactTsConsumer,
    reactTypedConsumer,
    reactBrowserConsumer,
    reactImportsConsumer,
    nextJsConsumer,
    nextTsConsumer,
    nextTypedConsumer,
    nextImportsConsumer,
    nextBrowserConsumer,
    angularConsumer,
    angularBrowserConsumer,
    angularImportsConsumer,
    angularTypedConsumer,
  ] = consumers;

  await writeConsumer(javascriptConsumer, "javascript-consumer", tarballPath, undefined, true);
  await writeFile(join(javascriptConsumer, "eslint.config.js"), [
    'import { defineConfig } from "eslint/config";',
    'import browser from "@scope/js-style-guide/browser";',
    'import imports from "@scope/js-style-guide/imports";',
    'import { javascript } from "@scope/js-style-guide";',
    'import node from "@scope/js-style-guide/node";',
    'export default defineConfig({ files: ["client*.js"], extends: [javascript, browser] },',
    '  { files: ["server.mjs"], extends: [javascript, node] },',
    '  { files: ["server.cjs"], extends: [javascript, node] },',
    '  { files: ["imports.js"], extends: [javascript, imports] },',
    '  { files: ["invalid.js"], extends: [javascript] });',
    "",
  ].join("\n"));
  await writeFile(join(javascriptConsumer, "client.js"), "window.document; fetch; export default 42;\n");
  await writeFile(join(javascriptConsumer, "client-invalid.js"), "process.cwd();\n");
  await writeFile(join(javascriptConsumer, "server.mjs"), "process.cwd(); Buffer.from('x');\n");
  await writeFile(join(javascriptConsumer, "server.cjs"), 'require("node:path"); __dirname; module.exports = 42;\n');
  await writeFile(join(javascriptConsumer, "import-target.js"), "export const value = 42;\n");
  await writeFile(join(javascriptConsumer, "imports.js"), 'import { value } from "./import-target.js"; export { value };\n');
  await writeFile(join(javascriptConsumer, "invalid.js"), "let answer = 42; export { answer };\n");
  await writeFile(join(javascriptConsumer, "root-import.mjs"), [
    'import * as root from "@scope/js-style-guide";',
    'if (!Array.isArray(root.javascript) || "typescript" in root || "typescriptTypeChecked" in root) process.exit(1);',
    "",
  ].join("\n"));
  run("node", ["root-import.mjs"], javascriptConsumer);
  const typescriptAbsent = spawnSync("node", [
    "--input-type=module",
    "-e",
    'await import("typescript").then(() => process.exit(1), (error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; });',
  ], {
    cwd: javascriptConsumer,
    encoding: "utf8",
  });
  assert.equal(typescriptAbsent.status, 0, "JavaScript-only consumer should not need the TypeScript peer");
  const reactToolingAbsent = spawnSync("node", [
    "--input-type=module",
    "-e",
    'for (const name of ["eslint-plugin-react-hooks", "eslint-plugin-jsx-a11y-x"]) await import(name).then(() => process.exit(1), (error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; });',
  ], { cwd: javascriptConsumer, encoding: "utf8" });
  assert.equal(reactToolingAbsent.status, 0, "safe non-React consumer should not install React tooling");
  const nextToolingAbsent = spawnSync("node", [
    "--input-type=module",
    "-e",
    'await import("@next/eslint-plugin-next").then(() => process.exit(1), (error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; });',
  ], { cwd: javascriptConsumer, encoding: "utf8" });
  assert.equal(nextToolingAbsent.status, 0, "safe non-Next consumer should not install Next tooling");
  const angularToolingAbsent = spawnSync("node", [
    "--input-type=module",
    "-e",
    'for (const name of ["@angular-eslint/eslint-plugin", "@angular-eslint/eslint-plugin-template", "@angular-eslint/template-parser", "@angular-eslint/bundled-angular-compiler", "@angular/compiler", "@angular/core"]) await import(name).then(() => process.exit(1), (error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; });',
  ], { cwd: javascriptConsumer, encoding: "utf8" });
  assert.equal(angularToolingAbsent.status, 0, "safe non-Angular consumer should not install Angular tooling or runtime");
  const playwrightToolingAbsent = spawnSync("node", [
    "--input-type=module",
    "-e",
    'await import("eslint-plugin-playwright").then(() => process.exit(1), (error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; });',
  ], { cwd: javascriptConsumer, encoding: "utf8" });
  assert.equal(playwrightToolingAbsent.status, 0, "safe root consumer should not install Playwright tooling");

  const privateExports = [
    "@scope/js-style-guide/vitest",
    "@scope/js-style-guide/internal/react",
    "@scope/js-style-guide/internal/base",
    "@scope/js-style-guide/dist/internal/react",
    "@scope/js-style-guide/src/presets/react",
  ];
  const privateExportCheck = spawnSync("node", [
    "--input-type=module",
    "-e",
    `for (const specifier of ${JSON.stringify(privateExports)}) await import(specifier).then(() => process.exit(1), (error) => { if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error; });`,
  ], { cwd: javascriptConsumer, encoding: "utf8" });
  assert.equal(privateExportCheck.status, 0, "Vitest and private implementation paths are not package exports");
  const commonJsCheck = spawnSync("node", [
    "-e",
    'try { require("@scope/js-style-guide"); process.exit(1); } catch (error) { if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error; }',
  ], { cwd: javascriptConsumer, encoding: "utf8" });
  assert.equal(commonJsCheck.status, 0, "CommonJS consumers receive the ordinary unsupported-export error");

  const missingTypeScriptPeer = spawnSync("node", [
    "--input-type=module",
    "-e",
    'await import("@scope/js-style-guide/typescript");',
  ], {
    cwd: javascriptConsumer,
    encoding: "utf8",
  });
  assert.notEqual(missingTypeScriptPeer.status, 0, "a TypeScript subpath should fail without its peer");
  assert.match(missingTypeScriptPeer.stderr, /Cannot find module ['"]typescript['"]/);
  assert.match(missingTypeScriptPeer.stderr, /typescript-eslint/);

  const missingPlaywrightPeer = spawnSync("node", [
    "--input-type=module",
    "-e",
    'await import("@scope/js-style-guide/playwright");',
  ], {
    cwd: javascriptConsumer,
    encoding: "utf8",
  });
  assert.notEqual(missingPlaywrightPeer.status, 0, "the Playwright subpath should require its optional peer");
  assert.match(missingPlaywrightPeer.stderr, /Cannot find package ['"]eslint-plugin-playwright['"]/);
  const missingReactPeers = spawnSync("node", [
    "--input-type=module",
    "-e",
    'await import("@scope/js-style-guide/react");',
  ], { cwd: javascriptConsumer, encoding: "utf8" });
  assert.notEqual(missingReactPeers.status, 0, "the React subpath should require its optional lint tooling");
  assert.match(missingReactPeers.stderr, /eslint-plugin-react-hooks|eslint-plugin-jsx-a11y-x/);
  const missingAngularPeer = spawnSync("node", [
    "--input-type=module",
    "-e",
    'await import("@scope/js-style-guide/angular");',
  ], { cwd: javascriptConsumer, encoding: "utf8" });
  assert.notEqual(missingAngularPeer.status, 0, "the Angular subpath should require its optional lint tooling");
  assert.match(missingAngularPeer.stderr, /@angular-eslint\/eslint-plugin|@angular-eslint\/eslint-plugin-template|@angular-eslint\/template-parser/);

  run("node", ["node_modules/eslint/bin/eslint.js", "client.js", "server.mjs", "server.cjs", "imports.js"], javascriptConsumer);
  const invalidBrowserEnvironment = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "client-invalid.js"], {
    cwd: javascriptConsumer,
    encoding: "utf8",
  });
  assert.notEqual(invalidBrowserEnvironment.status, 0, "browser preset must not expose Node globals");
  assert.match(invalidBrowserEnvironment.stdout + invalidBrowserEnvironment.stderr, /no-undef/);
  const invalidJavaScript = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "invalid.js"], {
    cwd: javascriptConsumer,
    encoding: "utf8",
  });
  assert.notEqual(invalidJavaScript.status, 0, "invalid JavaScript should fail linting");
  assert.match(invalidJavaScript.stdout + invalidJavaScript.stderr, /prefer-const/);

  await writeConsumer(playwrightJsConsumer, "playwright-javascript-consumer", tarballPath, undefined, false, {
    "eslint-plugin-playwright": "2.12.0",
  });
  await mkdir(join(playwrightJsConsumer, "e2e"));
  await mkdir(join(playwrightJsConsumer, "src"));
  await writeFile(join(playwrightJsConsumer, "eslint.config.js"), [
    'import { defineConfig } from "eslint/config";',
    'import javascript from "@scope/js-style-guide/javascript";',
    'import playwright from "@scope/js-style-guide/playwright";',
    "export default defineConfig(javascript, playwright);",
    "",
  ].join("\n"));
  await writeFile(join(playwrightJsConsumer, "e2e/home.e2e.js"), [
    "/* global test, expect */",
    'test("home loads", async ({ page }) => { await page.goto("/"); await expect(page.getByRole("heading")).toBeVisible(); });',
    "",
  ].join("\n"));
  await writeFile(join(playwrightJsConsumer, "e2e/focused.e2e.js"), [
    "/* global test, expect */",
    'test.only("focused", async ({ page }) => { page.waitForResponse("/api"); await expect(page.getByRole("heading")).toBeVisible(); });',
    "",
  ].join("\n"));
  await writeFile(join(playwrightJsConsumer, "src/application.js"), [
    "/* global test */",
    'test.only("application source is not an E2E file", () => {});',
    "",
  ].join("\n"));
  await writeFile(join(playwrightJsConsumer, "src/ordinary.spec.js"), [
    "/* global test */",
    'test.only("unit spec is not an E2E file", () => {});',
    "",
  ].join("\n"));
  run("node", ["node_modules/eslint/bin/eslint.js", "e2e/home.e2e.js"], playwrightJsConsumer);
  const playwrightJsInvalid = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "--format", "json", "e2e/focused.e2e.js"], {
    cwd: playwrightJsConsumer,
    encoding: "utf8",
  });
  assert.notEqual(playwrightJsInvalid.status, 0, "focused JavaScript E2E source must fail linting");
  assert.match(playwrightJsInvalid.stdout, /playwright\/no-focused-test/);
  const playwrightJsOutOfScope = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "--format", "json", "src/application.js", "src/ordinary.spec.js"], {
    cwd: playwrightJsConsumer,
    encoding: "utf8",
  });
  assert.equal(playwrightJsOutOfScope.status, 0, "production and unit-spec JavaScript should not receive Playwright rules");

  await writeConsumer(typescriptConsumer, "typescript-playwright-consumer", tarballPath, "4.8.4", false, {
    "eslint-plugin-playwright": "2.12.0",
  });
  await mkdir(join(typescriptConsumer, "src"));
  await mkdir(join(typescriptConsumer, "e2e"));
  await writeFile(join(typescriptConsumer, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      baseUrl: ".",
      paths: { "@app/*": ["src/*"] },
    },
    include: ["src/**/*.ts", "e2e/**/*.ts"],
  }, null, 2));
  await writeFile(join(typescriptConsumer, "public-exports.ts"), [
    'import type { Preset } from "@scope/js-style-guide";',
    'import javascript from "@scope/js-style-guide/javascript";',
    'import typescript from "@scope/js-style-guide/typescript";',
    'import typescriptTypeChecked from "@scope/js-style-guide/typescript-type-checked";',
    'import browser from "@scope/js-style-guide/browser";',
    'import node from "@scope/js-style-guide/node";',
    'import imports from "@scope/js-style-guide/imports";',
    'import react from "@scope/js-style-guide/react";',
    'import next from "@scope/js-style-guide/next";',
    'import angular from "@scope/js-style-guide/angular";',
    'import playwright from "@scope/js-style-guide/playwright";',
    "const publicPresets: Preset[] = [javascript, typescript, typescriptTypeChecked, browser, node, imports, react, next, angular, playwright];",
    "export default publicPresets;",
    "",
  ].join("\n"));
  run("node", ["node_modules/typescript/bin/tsc", "--noEmit", "--strict", "--skipLibCheck", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--target", "ES2022", "public-exports.ts"], typescriptConsumer);
  await writeFile(join(typescriptConsumer, "eslint.config.js"), [
    'import { defineConfig } from "eslint/config";',
    'import browser from "@scope/js-style-guide/browser";',
    'import imports from "@scope/js-style-guide/imports";',
    'import playwright from "@scope/js-style-guide/playwright";',
    'import typescript from "@scope/js-style-guide/typescript";',
    "export default defineConfig(typescript, browser, imports, playwright);",
    "",
  ].join("\n"));
  await writeFile(join(typescriptConsumer, "src/model.ts"), "export interface Model { value: number }\nexport const model: Model = { value: 42 };\n");
  await writeFile(join(typescriptConsumer, "src/valid.ts"), 'import type { Model } from "@app/model";\nimport { model } from "@app/model";\nexport const href = window.location.href;\nexport const answer: Model = model;\n');
  await writeFile(join(typescriptConsumer, "src/invalid.ts"), "export const answer: any = 42;\n");
  await writeFile(join(typescriptConsumer, "src/ordinary.spec.ts"), [
    'declare const test: { only(title: string, callback: () => void): void };',
    'test.only("ordinary unit spec", () => {});',
    "",
  ].join("\n"));
  await writeFile(join(typescriptConsumer, "src/application.ts"), [
    'declare const test: { only(title: string, callback: () => void): void };',
    'test.only("production file", () => {});',
    "",
  ].join("\n"));
  await writeFile(join(typescriptConsumer, "e2e/valid.e2e.ts"), [
    'interface Page { goto(url: string): Promise<void>; getByRole(role: string): { toBeVisible(): Promise<void> } }',
    'interface Test { (title: string, callback: (ctx: { page: Page }) => Promise<void>): void; only: Test }',
    'declare const test: Test; declare function expect(locator: ReturnType<Page["getByRole"]>): { toBeVisible(): Promise<void> };',
    'test("page renders", async ({ page }) => { await page.goto("/"); await expect(page.getByRole("main")).toBeVisible(); });',
    "",
  ].join("\n"));
  await writeFile(join(typescriptConsumer, "e2e/invalid.e2e.ts"), [
    'interface Page { waitForResponse(url: string): Promise<unknown>; waitForTimeout(ms: number): Promise<void>; getByRole(role: string): { toBeVisible(): Promise<void> } }',
    'interface Test { (title: string, callback: (ctx: { page: Page }) => Promise<void>): void; only: Test }',
    'declare const test: Test; declare function expect(locator: ReturnType<Page["getByRole"]>): { toBeVisible(): Promise<void> };',
    'test.only("focused", async ({ page }) => { page.waitForResponse("/api"); await page.waitForTimeout(100); await expect(page.getByRole("main")).toBeVisible(); });',
    "",
  ].join("\n"));
  run("node", ["node_modules/eslint/bin/eslint.js", "src/valid.ts"], typescriptConsumer);
  const invalidTypeScript = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "src/invalid.ts"], {
    cwd: typescriptConsumer,
    encoding: "utf8",
  });
  assert.notEqual(invalidTypeScript.status, 0, "invalid TypeScript should fail linting");
  assert.match(invalidTypeScript.stdout + invalidTypeScript.stderr, /@typescript-eslint\/no-explicit-any/);
  run("node", ["node_modules/eslint/bin/eslint.js", "e2e/valid.e2e.ts"], typescriptConsumer);
  const typescriptPlaywrightInvalid = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "--format", "json", "e2e/invalid.e2e.ts"], {
    cwd: typescriptConsumer,
    encoding: "utf8",
  });
  assert.notEqual(typescriptPlaywrightInvalid.status, 0, "invalid TypeScript E2E source must fail linting");
  assert.match(typescriptPlaywrightInvalid.stdout, /playwright\/no-focused-test/);
  assert.match(typescriptPlaywrightInvalid.stdout, /playwright\/missing-playwright-await/);
  assert.match(typescriptPlaywrightInvalid.stdout, /playwright\/no-wait-for-timeout/);
  const typescriptPlaywrightOutOfScope = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "--format", "json", "src/application.ts", "src/ordinary.spec.ts"], {
    cwd: typescriptConsumer,
    encoding: "utf8",
  });
  assert.equal(typescriptPlaywrightOutOfScope.status, 0, "production and ordinary .spec.ts should not receive Playwright rules");

  await writeConsumer(typedConsumer, "typed-typescript-consumer", tarballPath, "6.0.3", false, {
    "@types/node": "26.6.2",
    "eslint-plugin-playwright": "2.12.0",
  });
  await mkdir(join(typedConsumer, "src"));
  await mkdir(join(typedConsumer, "e2e"));
  await writeFile(join(typedConsumer, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      baseUrl: ".",
      paths: { "@app/*": ["src/*"] },
    },
    include: ["src/**/*.ts", "e2e/**/*.ts"],
  }, null, 2));
  await writeFile(join(typedConsumer, "eslint.config.js"), [
    'import { defineConfig } from "eslint/config";',
    'import imports from "@scope/js-style-guide/imports";',
    'import node from "@scope/js-style-guide/node";',
    'import playwright from "@scope/js-style-guide/playwright";',
    'import typescriptTypeChecked from "@scope/js-style-guide/typescript-type-checked";',
    "export default defineConfig(typescriptTypeChecked, node, imports, playwright);",
    "",
  ].join("\n"));
  await writeFile(join(typedConsumer, "src/model.ts"), "export interface Model { value: number }\nexport const model: Model = { value: 42 };\n");
  await writeFile(join(typedConsumer, "src/valid.ts"), 'import { model } from "./model.js";\nvoid process;\nexport const answer: number = model.value;\n');
  await writeFile(join(typedConsumer, "src/invalid.ts"), [
    "export async function later(): Promise<void> {}",
    "later();",
    "",
  ].join("\n"));
  await writeFile(join(typedConsumer, "e2e/invalid.e2e.ts"), [
    'interface Page { waitForResponse(url: string): Promise<unknown>; waitForTimeout(ms: number): Promise<void>; getByRole(role: string): { toBeVisible(): Promise<void> } }',
    'interface Test { (title: string, callback: (ctx: { page: Page }) => Promise<void>): void; only: Test }',
    'declare const test: Test; declare function expect(locator: ReturnType<Page["getByRole"]>): { toBeVisible(): Promise<void> };',
    'test.only("focused", async ({ page }) => { page.waitForResponse("/api"); await page.waitForTimeout(100); await expect(page.getByRole("main")).toBeVisible(); });',
    "export async function later(): Promise<void> {}",
    "later();",
    "",
  ].join("\n"));
  run("node", ["node_modules/eslint/bin/eslint.js", "src/valid.ts"], typedConsumer);
  const invalidTypedTypeScript = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "src/invalid.ts"], {
    cwd: typedConsumer,
    encoding: "utf8",
  });
  assert.notEqual(invalidTypedTypeScript.status, 0, "a floating promise should fail typed linting");
  assert.match(invalidTypedTypeScript.stdout + invalidTypedTypeScript.stderr, /@typescript-eslint\/no-floating-promises/);
  const typedPlaywrightInvalid = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "--format", "json", "e2e/invalid.e2e.ts"], {
    cwd: typedConsumer,
    encoding: "utf8",
  });
  assert.notEqual(typedPlaywrightInvalid.status, 0, "typed Playwright E2E source must report plugin and typed diagnostics");
  assert.match(typedPlaywrightInvalid.stdout, /playwright\/no-focused-test/);
  assert.match(typedPlaywrightInvalid.stdout, /@typescript-eslint\/no-floating-promises/);

  const reactTooling = {
    "eslint-plugin-react-hooks": "7.1.1",
    "eslint-plugin-jsx-a11y-x": "0.2.0",
  };
  const reactConsumers = [
    [reactJsConsumer, "packed-react-javascript", undefined, "javascript", "App.jsx"],
    [reactTsConsumer, "packed-react-typescript", "4.8.4", "typescript", "src/App.tsx"],
    [reactTypedConsumer, "packed-react-typed-typescript", "6.0.3", "typescript-type-checked", "src/App.tsx"],
    [reactBrowserConsumer, "packed-react-browser", "4.8.4", "typescript-browser", "src/App.tsx"],
    [reactImportsConsumer, "packed-react-imports", "4.8.4", "typescript-imports", "src/App.tsx"],
  ];

  for (const [directory, name, tsVersion, mode, fixturePath] of reactConsumers) {
    const dependencies = { ...reactTooling };
    if (mode === "typescript-type-checked") dependencies["@types/node"] = "26.6.2";
    await writeConsumer(directory, name, tarballPath, tsVersion, false, dependencies);
    if (mode === "javascript") {
      const missingNextPeer = spawnSync("node", [
        "--input-type=module",
        "-e",
        'await import("@scope/js-style-guide/next");',
      ], { cwd: directory, encoding: "utf8" });
      assert.notEqual(missingNextPeer.status, 0, "the Next subpath should require its optional plugin peer");
      assert.match(missingNextPeer.stderr, /@next\/eslint-plugin-next/);
    }
    if (mode !== "javascript") await mkdir(join(directory, "src"));

    const presetImports = {
      javascript: 'import javascript from "@scope/js-style-guide/javascript";',
      typescript: 'import typescript from "@scope/js-style-guide/typescript";',
      "typescript-type-checked": 'import typescriptTypeChecked from "@scope/js-style-guide/typescript-type-checked";',
      "typescript-browser": 'import typescript from "@scope/js-style-guide/typescript";\nimport browser from "@scope/js-style-guide/browser";',
      "typescript-imports": 'import typescript from "@scope/js-style-guide/typescript";\nimport imports from "@scope/js-style-guide/imports";',
    }[mode];
    const composedPresets = {
      javascript: "javascript, react",
      typescript: "typescript, react",
      "typescript-type-checked": "typescriptTypeChecked, react",
      "typescript-browser": "typescript, react, browser",
      "typescript-imports": "typescript, react, imports",
    }[mode];
    await writeFile(join(directory, "eslint.config.js"), [
      'import { defineConfig } from "eslint/config";',
      presetImports,
      'import react from "@scope/js-style-guide/react";',
      `export default defineConfig(${composedPresets});`,
      "",
    ].join("\n"));

    const hookDeclaration = mode === "javascript"
      ? "function useEffect(_callback) {}\n"
      : "function useEffect(_callback: () => void): void {}\n";
    const component = [
      hookDeclaration,
      "export function App({ condition }) {",
      "  if (condition) useEffect(() => {}, []);",
      "  return <><main /><img src='x.png' /></>;",
      "}",
      mode === "typescript-type-checked" ? "export async function later(): Promise<void> {}\nlater();" : "",
      "",
    ].join("\n");
    const outputFile = join(directory, fixturePath);
    await writeFile(outputFile, mode === "javascript"
      ? component
      : component.replace("export function App({ condition }) {", "export function App({ condition }: { condition: boolean }) {"));

    if (mode === "typescript-type-checked") {
      await writeFile(join(directory, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          noEmit: true,
          jsx: "preserve",
        },
        include: ["src/**/*"],
      }, null, 2));
    }
    if (mode === "typescript-imports") {
      await writeFile(join(directory, "src/value.ts"), "export const value = 42;\n");
      const source = await readFile(outputFile, "utf8");
      await writeFile(outputFile, `import { value } from "./value.js";\n${source.replace("<main />", "<main>{value}</main>")}`);
    }

    const lintResult = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "--format", "json", fixturePath], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.notEqual(lintResult.status, 0, `${name} should report intentional violations`);
    const [result] = JSON.parse(lintResult.stdout);
    const ruleIds = result.messages.map(({ ruleId }) => ruleId);
    assert.ok(ruleIds.includes("react-hooks/rules-of-hooks"), `${name}: Hooks violation`);
    assert.ok(ruleIds.includes("jsx-a11y-x/alt-text"), `${name}: accessibility violation`);
    if (mode === "typescript-type-checked") {
      assert.ok(ruleIds.includes("@typescript-eslint/no-floating-promises"), `${name}: typed rule`);
    }
    if (mode === "typescript-browser") {
      await writeFile(outputFile, "export function App() { return <main>{window.location.href}{document.title}{navigator.userAgent}</main>; }\n");
      run("node", ["node_modules/eslint/bin/eslint.js", fixturePath], directory);
    }
    if (mode === "typescript-imports") {
      assert.ok(!ruleIds.includes("import-x/no-unresolved"), `${name}: relative import resolves`);
    }
  }

  const nextTooling = {
    "@next/eslint-plugin-next": "16.3.6",
    "eslint-plugin-playwright": "2.12.0",
    "eslint-plugin-react-hooks": "7.1.1",
    "eslint-plugin-jsx-a11y-x": "0.2.0",
  };
  const nextConsumers = [
    [nextJsConsumer, "packed-next-javascript", undefined, "javascript", "app/page.jsx"],
    [nextTsConsumer, "packed-next-typescript", "4.8.4", "typescript", "app/page.tsx"],
    [nextTypedConsumer, "packed-next-typed-typescript", "6.0.3", "typed", "app/page.tsx"],
    [nextImportsConsumer, "packed-next-imports", "4.8.4", "imports", "src/page.tsx"],
    [nextBrowserConsumer, "packed-next-browser", "4.8.4", "browser", "src/client.tsx"],
  ];

  for (const [directory, name, tsVersion, mode, fixturePath] of nextConsumers) {
    const dependencies = { ...nextTooling };
    if (mode === "typed") dependencies["@types/node"] = "26.6.2";
    await writeConsumer(directory, name, tarballPath, tsVersion, false, dependencies);
    const outputFile = join(directory, fixturePath);
    await mkdir(join(outputFile, ".."), { recursive: true });
    const importsLine = mode === "imports" ? 'import { value } from "./value.js";\n' : "";
    const browserUse = mode === "browser" ? "{window.location.href}{document.title}{navigator.userAgent}" : "Next";
    const typedViolation = mode === "typed" ? "export async function later(): Promise<void> {}\nlater();\n" : "";
    await writeFile(outputFile, `${importsLine}${typedViolation}export default function Page() { return <><p>${browserUse}</p><img src='/hero.jpg' alt='Hero' /></>; }\n`);
    if (mode === "imports") await writeFile(join(directory, "src/value.ts"), "export const value = 42;\n");
    if (mode === "typed") {
      await writeFile(join(directory, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          noEmit: true,
          jsx: "preserve",
          skipLibCheck: true,
        },
        include: ["app/**/*", "types.d.ts"],
      }, null, 2));
      await writeFile(join(directory, "types.d.ts"), "declare namespace JSX { interface IntrinsicElements { [name: string]: unknown } }\n");
    }
    if (mode === "typescript") {
      await mkdir(join(directory, "e2e"));
      await writeFile(join(directory, "e2e/home.e2e.ts"), [
        'interface Page { goto(url: string): Promise<void>; getByRole(role: string): { toBeVisible(): Promise<void> } }',
        'interface Test { (title: string, callback: (ctx: { page: Page }) => Promise<void>): void; only: Test }',
        'declare const test: Test; declare function expect(locator: ReturnType<Page["getByRole"]>): { toBeVisible(): Promise<void> };',
        'test("next page works", async ({ page }) => { await page.goto("/"); await expect(page.getByRole("main")).toBeVisible(); });',
        "",
      ].join("\n"));
    }

    const languageImport = mode === "javascript"
      ? 'import javascript from "@scope/js-style-guide/javascript";'
      : mode === "typed"
        ? 'import typescriptTypeChecked from "@scope/js-style-guide/typescript-type-checked";'
        : 'import typescript from "@scope/js-style-guide/typescript";';
    const overlayImport = mode === "imports"
      ? 'import imports from "@scope/js-style-guide/imports";'
      : mode === "browser"
        ? 'import browser from "@scope/js-style-guide/browser";'
        : "";
    const playwrightImport = 'import playwright from "@scope/js-style-guide/playwright";';
    const languagePreset = mode === "javascript" ? "javascript" : mode === "typed" ? "typescriptTypeChecked" : "typescript";
    const overlays = mode === "imports"
      ? `${languagePreset}, next, imports, playwright`
      : mode === "browser"
        ? `${languagePreset}, next, browser, playwright`
        : `${languagePreset}, next, playwright`;
    await writeFile(join(directory, "eslint.config.js"), [
      'import { defineConfig } from "eslint/config";',
      languageImport,
      'import next from "@scope/js-style-guide/next";',
      overlayImport,
      playwrightImport,
      `export default defineConfig(${overlays});`,
      "",
    ].filter(Boolean).join("\n"));

    const lintResult = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "--format", "json", "--max-warnings", "0", fixturePath], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.notEqual(lintResult.status, 0, `${name} should report the Next image optimization warning`);
    const [result] = JSON.parse(lintResult.stdout);
    const ruleIds = result.messages.map(({ ruleId }) => ruleId);
    assert.ok(ruleIds.includes("@next/next/no-img-element"), `${name}: current Next-specific image rule`);
    assert.ok(ruleIds.includes("jsx-a11y-x/alt-text") === false, `${name}: accessible image remains valid`);
    if (mode === "typed") assert.ok(ruleIds.includes("@typescript-eslint/no-floating-promises"), `${name}: typed rule`);
    if (mode === "imports") assert.ok(!ruleIds.includes("import-x/no-unresolved"), `${name}: import resolves`);
    if (mode === "browser") assert.ok(!ruleIds.includes("no-undef"), `${name}: explicit browser globals`);
    if (mode === "typescript") {
      run("node", ["node_modules/eslint/bin/eslint.js", "e2e/home.e2e.ts"], directory);
      const e2eConfig = spawnSync("node", ["--input-type=module", "-e", [
        'import { ESLint } from "eslint";',
        'const eslint = new ESLint({ overrideConfigFile: "eslint.config.js" });',
        'const config = await eslint.calculateConfigForFile("e2e/home.e2e.ts");',
        'if (!config.plugins.playwright || !config.plugins["@next/next"]) process.exit(1);',
        'if ("window" in (config.languageOptions.globals ?? {}) && config.languageOptions.globals.window !== "off") process.exit(1);',
      ].join("\n")], { cwd: directory, encoding: "utf8" });
      assert.equal(e2eConfig.status, 0, `${name}: Next + Playwright effective config`);
    }
  }
  const nextRuntimeAbsent = spawnSync("node", [
    "--input-type=module",
    "-e",
    'await import("next").then(() => process.exit(1), (error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; });',
  ], { cwd: nextJsConsumer, encoding: "utf8" });
  assert.equal(nextRuntimeAbsent.status, 0, "Next lint consumers do not need the Next runtime package");

  const angularTooling = {
    "@angular-eslint/eslint-plugin": "21.4.0",
    "@angular-eslint/eslint-plugin-template": "21.4.0",
    "@angular-eslint/template-parser": "21.4.0",
    "eslint-plugin-playwright": "2.12.0",
  };
  const angularConsumers = [
    [angularConsumer, "packed-angular", "application"],
    [angularBrowserConsumer, "packed-angular-browser", "browser"],
    [angularImportsConsumer, "packed-angular-imports", "imports"],
    [angularTypedConsumer, "packed-angular-typed", "typed"],
  ];
  for (const [directory, name, mode] of angularConsumers) {
    const dependencies = { ...angularTooling };
    if (mode === "typed") dependencies["@types/node"] = "26.6.2";
    await writeConsumer(directory, name, tarballPath, "5.9.3", false, dependencies);
    await mkdir(join(directory, "src"), { recursive: true });
    const languageImport = mode === "typed"
      ? 'import typescriptTypeChecked from "@scope/js-style-guide/typescript-type-checked";'
      : "";
    const overlayImport = mode === "browser"
      ? 'import browser from "@scope/js-style-guide/browser";'
      : mode === "imports"
        ? 'import imports from "@scope/js-style-guide/imports";'
        : "";
    const overlays = mode === "browser" ? ", browser" : mode === "imports" ? ", imports" : "";
    const languagePreset = mode === "typed" ? "angular, typescriptTypeChecked, playwright" : `angular${overlays}, playwright`;
    await writeFile(join(directory, "eslint.config.js"), [
      'import { defineConfig } from "eslint/config";',
      'import angular from "@scope/js-style-guide/angular";',
      languageImport,
      overlayImport,
      'import playwright from "@scope/js-style-guide/playwright";',
      mode === "imports"
        ? 'export default defineConfig(angular, playwright, { files: ["src/imports.ts"], extends: [imports] });'
        : `export default defineConfig(${languagePreset});`,
      "",
    ].filter(Boolean).join("\n"));

    await writeFile(join(directory, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        experimentalDecorators: true,
        skipLibCheck: true,
      },
      include: ["src/**/*.ts"],
    }, null, 2));
    await writeFile(join(directory, "src/app.component.ts"), [
      'import { Component } from "@angular/core";',
      "@Component({ selector: 'sample-app', template: `@if (ready) { <img src='inline.png'> }` })",
      "export class AppComponent { ready = true; ngOnInit(): void {} }",
      mode === "typed" ? "export async function later(): Promise<void> {}\nlater();" : "",
      "",
    ].join("\n"));
    await writeFile(join(directory, "src/app.component.html"), "@for (item of items; track item.id) { <img [src]='item.src'> }\n");
    if (mode === "application") {
      await mkdir(join(directory, "e2e"));
      await writeFile(join(directory, "e2e/home.e2e.ts"), [
        'interface Page { goto(url: string): Promise<void>; getByRole(role: string): { toBeVisible(): Promise<void> } }',
        'interface Test { (title: string, callback: (ctx: { page: Page }) => Promise<void>): void; only: Test }',
        'declare const test: Test; declare function expect(locator: ReturnType<Page["getByRole"]>): { toBeVisible(): Promise<void> };',
        'test("angular page works", async ({ page }) => { await page.goto("/"); await expect(page.getByRole("main")).toBeVisible(); });',
        "",
      ].join("\n"));
    }
    if (mode === "browser") {
      await writeFile(join(directory, "src/client.ts"), "export const locationHref = window.location.href;\n");
    }
    if (mode === "application") {
      run("node", ["node_modules/eslint/bin/eslint.js", "e2e/home.e2e.ts"], directory);
    }
    if (mode === "imports") {
      await writeFile(join(directory, "src/value.ts"), "export const value = 42;\n");
      await writeFile(join(directory, "src/imports.ts"), 'import { value } from "./value.js";\nexport { value };\n');
    }

    const lintPaths = mode === "browser"
      ? ["src/app.component.ts", "src/app.component.html", "src/client.ts"]
      : mode === "imports"
        ? ["src/app.component.ts", "src/app.component.html", "src/imports.ts"]
        : ["src/app.component.ts", "src/app.component.html"];
    const lintResult = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "--format", "json", ...lintPaths], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.notEqual(lintResult.status, 0, `${name} should report intentional Angular violations`);
    const results = JSON.parse(lintResult.stdout);
    const ruleIds = results.flatMap(({ messages }) => messages.map(({ ruleId }) => ruleId));
    assert.ok(ruleIds.includes("@angular-eslint/no-empty-lifecycle-method"), `${name}: Angular TS rule`);
    assert.ok(ruleIds.includes("@angular-eslint/template/alt-text"), `${name}: accessibility in inline template`);
    assert.ok(ruleIds.includes("@angular-eslint/template/prefer-control-flow") === false, `${name}: modern template control flow`);
    if (mode === "browser") {
      const config = await readFile(join(directory, "eslint.config.js"), "utf8");
      assert.match(config, /browser/);
      const effective = spawnSync("node", ["--input-type=module", "-e", [
        'import { ESLint } from "eslint";',
        'const eslint = new ESLint({ overrideConfigFile: "eslint.config.js" });',
        'const config = await eslint.calculateConfigForFile("src/client.ts");',
        'if (!("window" in config.languageOptions.globals) || "process" in config.languageOptions.globals) process.exit(1);',
      ].join("\n")], { cwd: directory, encoding: "utf8" });
      assert.equal(effective.status, 0, `${name}: browser globals are explicit`);
    }
    if (mode === "imports") {
      const importsResult = results.find(({ filePath }) => filePath.endsWith("/src/imports.ts"));
      assert.ok(importsResult, `${name}: imports fixture was linted`);
      assert.ok(!importsResult.messages.some(({ ruleId }) => ruleId === "import-x/no-unresolved"), `${name}: relative import resolves`);
    }
    if (mode === "typed") assert.ok(ruleIds.includes("@typescript-eslint/no-floating-promises"), `${name}: Project Service typed rule`);
    const runtimeAbsent = spawnSync("node", [
      "--input-type=module",
      "-e",
      'for (const name of ["@angular/core", "@angular/compiler"]) await import(name).then(() => process.exit(1), (error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; });',
    ], { cwd: directory, encoding: "utf8" });
    assert.equal(runtimeAbsent.status, 0, `${name}: lint configuration does not require Angular runtime packages`);
  }

  console.log("Packed JavaScript/browser/Node/imports, React, Next, Angular, and Playwright compositions passed; Vitest remains deferred and non-framework root isolation passed.");
} finally {
  await Promise.all([
    rm(packDirectory, { recursive: true, force: true }),
    ...consumers.map((directory) => rm(directory, { recursive: true, force: true })),
  ]);
}
