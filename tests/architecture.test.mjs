import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { defineConfig } from "eslint/config";
import { ESLint } from "eslint";
import { tmpdir } from "node:os";

import * as root from "@waismeeran/ts-code-standards";
import browser from "@waismeeran/ts-code-standards/browser";
import angular from "@waismeeran/ts-code-standards/angular";
import imports from "@waismeeran/ts-code-standards/imports";
import javascript from "@waismeeran/ts-code-standards/javascript";
import next from "@waismeeran/ts-code-standards/next";
import node from "@waismeeran/ts-code-standards/node";
import playwright from "@waismeeran/ts-code-standards/playwright";
import react from "@waismeeran/ts-code-standards/react";
import typescript from "@waismeeran/ts-code-standards/typescript";
import typescriptTypeChecked from "@waismeeran/ts-code-standards/typescript-type-checked";
import { join, resolve } from "node:path";

const publicPresets = {
  browser,
  imports,
  javascript,
  node,
  playwright,
  react,
  typescript,
  typescriptTypeChecked,
  angular,
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
const javascriptReactLinter = new ESLint({
  overrideConfig: defineConfig(javascript, react),
  overrideConfigFile: true,
});
const typescriptReactLinter = new ESLint({
  overrideConfig: defineConfig(typescript, react),
  overrideConfigFile: true,
});
const typeCheckedReactLinter = new ESLint({
  overrideConfig: defineConfig(typescriptTypeChecked, react),
  overrideConfigFile: true,
});
const javascriptNextLinter = new ESLint({
  overrideConfig: defineConfig(javascript, next, {
    settings: { next: { rootDir: "tests/fixtures/next-project" } },
  }),
  overrideConfigFile: true,
});
const typescriptNextLinter = new ESLint({
  overrideConfig: defineConfig(typescript, next, {
    settings: { next: { rootDir: "tests/fixtures/next-project" } },
  }),
  overrideConfigFile: true,
});
const typeCheckedNextLinter = new ESLint({
  overrideConfig: defineConfig(typescriptTypeChecked, next, {
    settings: { next: { rootDir: "tests/fixtures/next-project" } },
  }),
  overrideConfigFile: true,
});
const angularLinter = new ESLint({
  overrideConfig: angular,
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

test("public preset subpaths resolve to typed arrays and only Playwright is exported", async () => {
  for (const [name, preset] of Object.entries(publicPresets)) {
    assert.equal(Array.isArray(preset), true, name);
  }

  assert.ok(javascript.length >= 2);
  assert.ok(browser.length > 0);
  assert.ok(node.length > 0);
  assert.ok(imports.length > 0);
  assert.ok(react.length > 0);
  assert.ok(next.length > react.length);
  assert.ok(typescript.length > 0);
  assert.ok(typescriptTypeChecked.length > typescript.length);
  assert.ok(angular.length > typescript.length);

  const packageMetadata = JSON.parse(await readFile(resolve("package.json"), "utf8"));
  assert.ok(packageMetadata.exports["./playwright"]);
  assert.equal(packageMetadata.exports["./vitest"], undefined);
});

test("Angular owns the TypeScript baseline and scopes template tooling without runtime globals", async () => {
  const tsConfig = await angularLinter.calculateConfigForFile("src/app.component.ts");
  assert.equal(tsConfig.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
  assert.equal(tsConfig.languageOptions.parserOptions?.projectService, undefined);
  assert.ok(tsConfig.plugins["@typescript-eslint"]);
  assert.ok(tsConfig.plugins["@angular-eslint"]);
  assert.ok(!tsConfig.plugins["@angular-eslint/template"]);
  for (const name of ["window", "document", "navigator", "process"]) {
    assert.ok(!(name in (tsConfig.languageOptions.globals ?? {})), name);
  }

  const htmlConfig = await angularLinter.calculateConfigForFile("src/external.component.html");
  assert.equal(htmlConfig.languageOptions.parser?.meta?.name, "angular-eslint/template-parser");
  assert.ok(htmlConfig.plugins["@angular-eslint/template"]);
  assert.ok(!htmlConfig.plugins["@typescript-eslint"]);
  assert.equal(htmlConfig.languageOptions.parserOptions?.projectService, undefined);
});

test("Angular lints recommended TypeScript rules plus external and inline modern templates", async () => {
  const [componentResult, externalTemplateResult] = await angularLinter.lintFiles([
    resolve("tests/fixtures/angular-project/src/external.component.ts"),
    resolve("tests/fixtures/angular-project/src/external.component.html"),
  ]);
  assert.ok(componentResult.messages.some((message) => message.ruleId === "@angular-eslint/no-empty-lifecycle-method"));
  assert.ok(externalTemplateResult.messages.some((message) => message.ruleId === "@angular-eslint/template/alt-text"));

  const [inlineResult] = await angularLinter.lintFiles([
    resolve("tests/fixtures/angular-project/src/app.component.ts"),
  ]);
  assert.ok(inlineResult.messages.some((message) => message.ruleId === "@angular-eslint/template/alt-text"));
  assert.ok(!inlineResult.messages.some((message) => message.fatal));
  assert.ok(!inlineResult.messages.some((message) => message.ruleId === "@angular-eslint/template/prefer-control-flow"));
});

test("Angular composes with browser, imports, and optional typed Project Service", async () => {
  const angularBrowser = new ESLint({
    overrideConfig: defineConfig(angular, browser),
    overrideConfigFile: true,
  });
  const angularNode = new ESLint({
    overrideConfig: defineConfig(angular, node),
    overrideConfigFile: true,
  });
  const noBrowserConfig = await angularLinter.calculateConfigForFile("src/app.component.ts");
  const browserConfig = await angularBrowser.calculateConfigForFile("src/app.component.ts");
  const nodeConfig = await angularNode.calculateConfigForFile("src/app.component.ts");
  assert.ok(!("window" in (noBrowserConfig.languageOptions.globals ?? {})));
  assert.ok("window" in browserConfig.languageOptions.globals);
  assert.ok("process" in nodeConfig.languageOptions.globals);
  assert.ok(!("window" in nodeConfig.languageOptions.globals));
  assert.ok(browserConfig.plugins["@angular-eslint"]);

  const angularImports = new ESLint({
    overrideConfig: defineConfig(angular, imports),
    overrideConfigFile: true,
  });
  const importsConfig = await angularImports.calculateConfigForFile("src/app.component.ts");
  assert.ok(importsConfig.plugins["@angular-eslint"]);
  assert.ok(importsConfig.plugins["import-x"]);
  assert.equal(Object.keys(importsConfig.plugins).filter((name) => name === "@angular-eslint").length, 1);

  const angularTypeChecked = new ESLint({
    overrideConfig: defineConfig(angular, typescriptTypeChecked),
    overrideConfigFile: true,
  });
  const typedConfig = await angularTypeChecked.calculateConfigForFile(
    resolve("tests/fixtures/angular-project/src/service.ts"),
  );
  assert.equal(typedConfig.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
  assert.equal(typedConfig.languageOptions.parserOptions?.projectService, true);
  const [typedAngularResult] = await angularTypeChecked.lintFiles([
    resolve("tests/fixtures/angular-project/src/external.component.ts"),
  ]);
  assert.ok(typedAngularResult.messages.some((message) => message.ruleId === "@angular-eslint/no-empty-lifecycle-method"));
});

test("Playwright scopes upstream reliability rules to conservative E2E files", async () => {
  const playwrightLinter = new ESLint({
    overrideConfig: defineConfig(typescript, playwright),
    overrideConfigFile: true,
  });
  const production = await playwrightLinter.calculateConfigForFile("src/application.ts");
  const unit = await playwrightLinter.calculateConfigForFile("src/ordinary.spec.ts");
  const e2e = await playwrightLinter.calculateConfigForFile("e2e/valid.e2e.ts");

  assert.ok(!production.plugins.playwright);
  assert.ok(!unit.plugins.playwright);
  assert.ok(e2e.plugins.playwright);
  assert.equal(e2e.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
  assert.equal(e2e.rules["playwright/no-focused-test"][0], 2);
  assert.equal(e2e.rules["playwright/no-skipped-test"][0], 1);
  assert.equal(e2e.rules["playwright/no-wait-for-timeout"][0], 1);
  assert.equal(e2e.rules["playwright/missing-playwright-await"][0], 2);
  assert.equal(e2e.rules["playwright/consistent-spacing-between-blocks"][0], 0);
  for (const globalName of ["window", "document", "navigator", "process"]) {
    assert.ok(
      e2e.languageOptions.globals?.[globalName] === undefined
      || e2e.languageOptions.globals[globalName] === "off",
      globalName,
    );
  }
  assert.ok(!Object.keys(e2e.rules).some((ruleName) => /prettier|format/i.test(ruleName)));

  const [valid] = await playwrightLinter.lintFiles([
    resolve("tests/fixtures/playwright-project/e2e/valid.e2e.ts"),
  ]);
  assert.deepEqual(valid.messages, []);

  const [invalid] = await playwrightLinter.lintFiles([
    resolve("tests/fixtures/playwright-project/e2e/invalid.e2e.ts"),
  ]);
  const invalidRules = invalid.messages.map((message) => message.ruleId);
  assert.ok(invalidRules.includes("playwright/no-focused-test"));
  assert.ok(invalidRules.includes("playwright/missing-playwright-await"));
  assert.ok(invalidRules.includes("playwright/no-wait-for-timeout"));

  const typedPlaywright = new ESLint({
    overrideConfig: defineConfig(typescriptTypeChecked, playwright),
    overrideConfigFile: true,
  });
  const typedConfig = await typedPlaywright.calculateConfigForFile(
    resolve("tests/fixtures/playwright-project/e2e/invalid.e2e.ts"),
  );
  assert.equal(typedConfig.languageOptions.parserOptions?.projectService, true);
  const [typedResult] = await typedPlaywright.lintFiles([
    resolve("tests/fixtures/playwright-project/e2e/invalid.e2e.ts"),
  ]);
  assert.ok(typedResult.messages.some((message) => message.ruleId === "playwright/no-focused-test"));
  assert.ok(typedResult.messages.some((message) => message.ruleId === "@typescript-eslint/no-floating-promises"));
});

test("Playwright composes with JavaScript, React, Next, Angular, Node, browser, and imports", async () => {
  const cases = [
    ["JavaScript", defineConfig(javascript, playwright), "e2e/valid.e2e.js", "espree"],
    ["React", defineConfig(typescript, react, playwright), "e2e/valid.e2e.tsx", "typescript-eslint/parser"],
    ["Next", defineConfig(typescript, next, playwright, {
      settings: { next: { rootDir: "tests/fixtures/next-project" } },
    }), "e2e/valid.e2e.ts", "typescript-eslint/parser"],
    ["Angular", defineConfig(angular, playwright), "e2e/valid.e2e.ts", "typescript-eslint/parser"],
    ["imports", defineConfig(typescript, playwright, imports), "e2e/valid.e2e.ts", "typescript-eslint/parser"],
    ["Node", defineConfig(typescript, playwright, node), "e2e/valid.e2e.ts", "typescript-eslint/parser"],
    ["browser", defineConfig(typescript, playwright, browser), "e2e/valid.e2e.ts", "typescript-eslint/parser"],
  ];

  for (const [name, configArray, filePath, parserName] of cases) {
    const linter = new ESLint({ overrideConfig: configArray, overrideConfigFile: true });
    const config = await linter.calculateConfigForFile(filePath);
    assert.ok(config.plugins.playwright, name);
    assert.equal(config.languageOptions.parser?.meta?.name ?? config.languageOptions.parser?.name, parserName, name);
    if (name !== "browser") assert.equal(config.languageOptions.globals?.window, undefined, name);
    if (name === "Node") assert.ok("process" in (config.languageOptions.globals ?? {}));
    if (name === "browser") assert.ok("window" in (config.languageOptions.globals ?? {}));
    if (name === "React") {
      assert.ok(config.plugins["react-hooks"]);
      assert.equal(Object.keys(config.plugins).filter((pluginName) => pluginName === "playwright").length, 1);
    }
    if (name === "Next") assert.ok(config.plugins["@next/next"]);
    if (name === "Angular") assert.ok(config.plugins["@angular-eslint"]);
    if (name === "imports") assert.ok(config.plugins["import-x"]);
  }

  for (const filePath of ["src/application.ts", "src/ordinary.spec.ts"]) {
    const nextLinter = new ESLint({
      overrideConfig: defineConfig(typescript, next, playwright, {
        settings: { next: { rootDir: "tests/fixtures/next-project" } },
      }),
      overrideConfigFile: true,
    });
    const config = await nextLinter.calculateConfigForFile(filePath);
    assert.ok(!config.plugins.playwright, filePath);
  }
});

test("Next owns React and Next.js rules without owning language or runtime globals", async () => {
  const nextOnlyLinter = new ESLint({ overrideConfig: next, overrideConfigFile: true });
  const nextOnlyTsConfig = await nextOnlyLinter.calculateConfigForFile("src/plain.ts");
  assert.equal(nextOnlyTsConfig.languageOptions.parser?.name ?? nextOnlyTsConfig.languageOptions.parser?.meta?.name, "espree");
  assert.equal(nextOnlyTsConfig.languageOptions.parserOptions?.projectService, undefined);
  assert.ok(!Object.keys(nextOnlyTsConfig.plugins ?? {}).includes("@typescript-eslint"));

  const jsConfig = await javascriptNextLinter.calculateConfigForFile("app/page.jsx");
  assert.ok(jsConfig.plugins["react-hooks"]);
  assert.ok(jsConfig.plugins["jsx-a11y-x"]);
  assert.ok(jsConfig.plugins["@next/next"]);
  for (const pluginName of ["react", "jsx-a11y", "import", "vitest", "playwright"]) {
    assert.ok(!(pluginName in jsConfig.plugins), pluginName);
  }
  assert.ok(!Object.keys(jsConfig.rules).some((ruleName) => /prettier|format/i.test(ruleName)));
  assert.equal(jsConfig.rules["@next/next/no-img-element"][0], 1);
  assert.equal(jsConfig.rules["@next/next/no-html-link-for-pages"][0], 2);
  assert.equal(jsConfig.languageOptions.globals, undefined);
  assert.equal(jsConfig.languageOptions.parser?.name ?? jsConfig.languageOptions.parser?.meta?.name, "espree");

  const tsConfig = await typescriptNextLinter.calculateConfigForFile("app/page.tsx");
  assert.equal(tsConfig.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
  assert.equal(tsConfig.languageOptions.parserOptions?.projectService, undefined);
  assert.ok(tsConfig.plugins["@next/next"]);
  for (const globalName of ["window", "document", "navigator", "process"]) {
    assert.ok(!(globalName in (tsConfig.languageOptions.globals ?? {})), globalName);
  }

  const typedConfig = await typeCheckedNextLinter.calculateConfigForFile(
    resolve("tests/fixtures/next-project/app/page.tsx"),
  );
  assert.equal(typedConfig.languageOptions.parserOptions?.projectService, true);
});

test("Next lints App Router, Pages Router, server/client components, and current Next behavior", async () => {
  const appPage = resolve("tests/fixtures/next-project/app/page.jsx");
  const pagesIndex = resolve("tests/fixtures/next-project/pages/index.jsx");
  const clientPage = resolve("tests/fixtures/next-project/app/client.jsx");
  const [appResult, pagesResult, clientResult] = await javascriptNextLinter.lintFiles([
    appPage,
    pagesIndex,
    clientPage,
  ]);
  assert.ok(appResult.messages.some((message) => message.ruleId === "@next/next/no-img-element"));
  assert.ok(pagesResult.messages.some((message) => message.ruleId === "@next/next/no-html-link-for-pages"));
  assert.ok(clientResult.messages.some((message) => message.ruleId === "no-undef" && message.message.includes("window")));
  assert.ok(!clientResult.messages.some((message) => message.ruleId === "@next/next/no-async-client-component"));

  const nextBrowserLinter = new ESLint({
    overrideConfig: defineConfig(typescript, next, browser, {
      settings: { next: { rootDir: "tests/fixtures/next-project" } },
    }),
    overrideConfigFile: true,
  });
  const browserConfig = await nextBrowserLinter.calculateConfigForFile("app/client.tsx");
  assert.ok("window" in browserConfig.languageOptions.globals);
  const [clientWithBrowser] = await nextBrowserLinter.lintText(
    "'use client'; export function Client() { return <button>{window.location.href}</button>; }",
    { filePath: "app/client.tsx" },
  );
  assert.ok(!clientWithBrowser.messages.some((message) => message.ruleId === "no-undef"));

  for (const generatedPath of ["next-env.d.ts", ".next/types/app.d.ts", "out/index.js", "build/client.js"]) {
    assert.equal(await javascriptNextLinter.isPathIgnored(generatedPath), true, generatedPath);
  }
});

test("Next composes with typed Project Service, imports, Node, and redundant React safely", async () => {
  const fixturePath = resolve("tests/fixtures/next-project/app/page.tsx");
  const [typedResult] = await typeCheckedNextLinter.lintFiles([fixturePath]);
  assert.ok(typedResult.messages.some((message) => message.ruleId === "@next/next/no-img-element"));
  assert.ok(typedResult.messages.some((message) => message.ruleId === "@typescript-eslint/no-floating-promises"));

  const aliasScript = [
    'import { ESLint } from "eslint";',
    'import { defineConfig } from "eslint/config";',
    'import typescript from "@waismeeran/ts-code-standards/typescript";',
    'import next from "@waismeeran/ts-code-standards/next";',
    'import imports from "@waismeeran/ts-code-standards/imports";',
    'const linter = new ESLint({ overrideConfig: defineConfig(typescript, next, imports), overrideConfigFile: true });',
    'const [result] = await linter.lintFiles(["app/page.tsx"]);',
    'process.stdout.write(JSON.stringify(result.messages.map(({ruleId}) => ruleId)));',
  ].join("\n");
  const aliasResult = spawnSync(process.execPath, ["--input-type=module", "-e", aliasScript], {
    cwd: resolve("tests/fixtures/next-project"),
    encoding: "utf8",
  });
  assert.equal(aliasResult.status, 0, aliasResult.stderr);
  const aliasRules = JSON.parse(aliasResult.stdout);
  assert.ok(!aliasRules.includes("import-x/no-unresolved"));

  for (const [preset, filePath] of [
    [javascript, "src/valid.js"],
    [typescriptTypeChecked, "tests/fixtures/next-project/app/page.tsx"],
  ]) {
    const nextWithImports = new ESLint({
      overrideConfig: defineConfig(preset, next, imports, {
        settings: { next: { rootDir: "tests/fixtures/next-project" } },
      }),
      overrideConfigFile: true,
    });
    const config = await nextWithImports.calculateConfigForFile(filePath);
    for (const pluginName of ["@next/next", "import-x", "react-hooks", "jsx-a11y-x"]) {
      assert.ok(config.plugins[pluginName], pluginName);
      assert.equal(Object.keys(config.plugins).filter((name) => name === pluginName).length, 1);
    }
    if (preset === typescriptTypeChecked) {
      assert.equal(config.languageOptions.parserOptions?.projectService, true);
    }
  }

  const nextNode = new ESLint({
    overrideConfig: defineConfig(typescript, next, node, {
      settings: { next: { rootDir: "tests/fixtures/next-project" } },
    }),
    overrideConfigFile: true,
  });
  const nodeConfig = await nextNode.calculateConfigForFile("app/route.ts");
  assert.ok("process" in nodeConfig.languageOptions.globals);
  assert.ok(!("window" in nodeConfig.languageOptions.globals));

  const reactNext = new ESLint({
    overrideConfig: defineConfig(typescript, react, next, {
      settings: { next: { rootDir: "tests/fixtures/next-project" } },
    }),
    overrideConfigFile: true,
  });
  const redundantConfig = await reactNext.calculateConfigForFile("app/page.tsx");
  assert.ok(redundantConfig.plugins["react-hooks"]);
  const [redundantResult] = await reactNext.lintFiles([fixturePath]);
  assert.ok(redundantResult.messages.some((message) => message.ruleId === "@next/next/no-img-element"));
});

test("React is an opt-in overlay with stable Hooks and recommended accessibility rules", async () => {
  const config = await javascriptReactLinter.calculateConfigForFile("src/component.jsx");
  assert.equal(
    config.languageOptions.parser?.name ?? config.languageOptions.parser?.meta?.name,
    "espree",
  );
  assert.equal(config.languageOptions.parserOptions?.ecmaFeatures?.jsx, true);
  assert.equal(config.languageOptions.globals, undefined);
  assert.ok(config.plugins["react-hooks"]);
  assert.ok(config.plugins["jsx-a11y-x"]);
  assert.equal(config.rules["react-hooks/rules-of-hooks"][0], 2);
  assert.equal(config.rules["react-hooks/exhaustive-deps"][0], 1);
  assert.equal(config.rules["jsx-a11y-x/alt-text"][0], 2);
  assert.equal(config.rules["jsx-a11y-x/no-static-element-interactions"][0], 2);
  assert.equal(config.rules["jsx/prop-types"], undefined);

  const tsxConfig = await typescriptReactLinter.calculateConfigForFile("src/component.tsx");
  assert.equal(tsxConfig.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
  assert.equal(tsxConfig.languageOptions.parserOptions?.projectService, undefined);
  assert.ok(tsxConfig.plugins["jsx-a11y-x"]);

  const tsConfig = await typescriptReactLinter.calculateConfigForFile("src/hook.ts");
  assert.equal(tsConfig.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
  assert.equal(tsConfig.languageOptions.parserOptions?.ecmaFeatures?.jsx, undefined);
  assert.ok(tsConfig.plugins["react-hooks"]);
  assert.ok(!tsConfig.plugins["jsx-a11y-x"]);
  assert.equal(tsConfig.languageOptions.globals, undefined);
  for (const globalName of ["window", "document", "navigator"]) {
    assert.equal(globalName in (tsConfig.languageOptions.globals ?? {}), false);
  }

  const reactOnlyTsConfig = await javascriptReactLinter.calculateConfigForFile("src/plain.ts");
  assert.equal(reactOnlyTsConfig.languageOptions.parserOptions?.ecmaFeatures?.jsx, undefined);
});

test("React JavaScript composition supports automatic JSX runtime and catches Hooks/a11y issues", async () => {
  const validComponent = await javascriptReactLinter.lintText(
    "function Badge() { return <span>New</span>; } export function Greeting({ name }) { return <><Badge /><img src='x.png' alt={name} /></>; }",
    { filePath: "Greeting.jsx" },
  );
  assert.deepEqual(validComponent[0].messages, []);

  const invalidHooks = await javascriptReactLinter.lintText(
    'import { useEffect } from "react"; export function Example({ condition }) { if (condition) { useEffect(() => {}); } return <main />; }',
    { filePath: "InvalidHooks.jsx" },
  );
  assert.ok(invalidHooks[0].messages.some((message) => message.ruleId === "react-hooks/rules-of-hooks"));

  const dependencyWarning = await javascriptReactLinter.lintText(
    'import { useEffect } from "react"; export function Example({ value }) { useEffect(() => { console.log(value); }, []); return <main />; }',
    { filePath: "MissingDependency.jsx" },
  );
  assert.ok(dependencyWarning[0].messages.some((message) => message.ruleId === "react-hooks/exhaustive-deps"));

  const invalidA11y = await javascriptReactLinter.lintText(
    "export function Example() { return <><img src='x.png' /><div onClick={() => {}} /></>; }",
    { filePath: "InvalidA11y.jsx" },
  );
  assert.ok(invalidA11y[0].messages.some((message) => message.ruleId === "jsx-a11y-x/alt-text"));
  assert.ok(invalidA11y[0].messages.some((message) => message.ruleId === "jsx-a11y-x/no-static-element-interactions"));

  const validHook = await javascriptReactLinter.lintText(
    'import { useState } from "react"; export function useCounter() { const [count, setCount] = useState(0); return [count, setCount]; }',
    { filePath: "useCounter.js" },
  );
  assert.deepEqual(validHook[0].messages, []);
});

test("React composes with TypeScript and typed Project Service without parser or rule loss", async () => {
  const fixturePath = resolve("tests/fixtures/typescript-project/src/react-cases.tsx");
  const [fastResult] = await typescriptReactLinter.lintFiles([fixturePath]);
  assert.ok(fastResult.messages.some((message) => message.ruleId === "react-hooks/rules-of-hooks"));
  assert.ok(fastResult.messages.some((message) => message.ruleId === "jsx-a11y-x/alt-text"));

  const [typedResult] = await typeCheckedReactLinter.lintFiles([fixturePath]);
  const typedRules = typedResult.messages.map((message) => message.ruleId);
  assert.ok(typedRules.includes("react-hooks/rules-of-hooks"));
  assert.ok(typedRules.includes("@typescript-eslint/no-floating-promises"));

  const typedConfig = await typeCheckedReactLinter.calculateConfigForFile(fixturePath);
  assert.equal(typedConfig.languageOptions.parser?.meta?.name, "typescript-eslint/parser");
  assert.equal(typedConfig.languageOptions.parserOptions?.projectService, true);
});

test("React does not imply browser globals and composes with browser and imports overlays", async () => {
  const reactOnly = await typescriptReactLinter.calculateConfigForFile("src/component.tsx");
  for (const globalName of ["window", "document", "navigator"]) {
    assert.ok(!(globalName in (reactOnly.languageOptions.globals ?? {})), globalName);
  }

  const reactBrowserLinter = new ESLint({
    overrideConfig: defineConfig(typescript, react, browser),
    overrideConfigFile: true,
  });
  const reactBrowser = await reactBrowserLinter.calculateConfigForFile("src/component.tsx");
  for (const globalName of ["window", "document", "navigator"]) {
    assert.ok(globalName in reactBrowser.languageOptions.globals, globalName);
  }
  const lintBrowserGlobals = await reactBrowserLinter.lintText(
    "export function Example() { return <main>{window.location.href}{navigator.userAgent}{document.title}</main>; }",
    { filePath: "src/Example.tsx" },
  );
  assert.deepEqual(lintBrowserGlobals[0].messages, []);

  for (const [language, preset, filePath] of [
    ["JavaScript", javascript, "src/component.jsx"],
    ["TypeScript", typescript, "src/component.tsx"],
  ]) {
    const importsReact = new ESLint({
      overrideConfig: defineConfig(preset, react, imports),
      overrideConfigFile: true,
    });
    const config = await importsReact.calculateConfigForFile(filePath);
    assert.ok(config.plugins["react-hooks"], language);
    assert.ok(config.plugins["jsx-a11y-x"], language);
    assert.ok(config.plugins["import-x"], language);
    assert.equal(Object.keys(config.plugins).filter((name) => name === "react-hooks").length, 1);
    assert.equal(Object.keys(config.plugins).filter((name) => name === "jsx-a11y-x").length, 1);
    if (language === "JavaScript") {
      const [resolvedImports] = await importsReact.lintFiles([
        resolve("tests/fixtures/imports-project/src/valid.js"),
      ]);
      assert.deepEqual(resolvedImports.messages, []);
    }
  }

  const rootReactIsolation = await javascriptLinter.calculateConfigForFile("src/component.jsx");
  assert.ok(!Object.keys(rootReactIsolation.plugins ?? {}).some((name) => /react|jsx-a11y/.test(name)));
  assert.ok(!rootReactIsolation.plugins?.playwright);
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
    'import typescript from "@waismeeran/ts-code-standards/typescript";',
    'import imports from "@waismeeran/ts-code-standards/imports";',
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
  const loadInternalBase = () => import("@waismeeran/ts-code-standards/base");
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
