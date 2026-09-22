import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(".");
const packDirectory = await mkdtemp(join(tmpdir(), "js-style-guide-pack-"));
const consumerDirectory = await mkdtemp(join(tmpdir(), "js-style-guide-consumer-"));

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error([
      command + " " + args.join(" ") + " failed with exit " + result.status,
      result.stdout,
      result.stderr,
    ].join("\n"));
  }

  return result.stdout;
}

try {
  const packager = process.env.PACKAGE_MANAGER ?? (process.env.npm_execpath ? "npm" : "pnpm");
  const useNpm = packager === "npm" || packager.endsWith("/npm");
  const packArgs = useNpm
    ? ["pack", "--json", "--ignore-scripts", "--pack-destination", packDirectory]
    : ["pack", "--pack-destination", packDirectory];

  run(packager, packArgs, root);

  const packedFiles = await readdir(packDirectory);
  const tarball = packedFiles.find((name) => name.endsWith(".tgz"));
  assert.ok(tarball, "a package tarball should be created");

  const tarballPath = join(packDirectory, tarball);
  const archiveListing = execFileSync("tar", ["-tzf", tarballPath], {
    encoding: "utf8",
  }).split("\n").filter(Boolean);

  assert.ok(archiveListing.includes("package/dist/index.js"));
  assert.ok(archiveListing.includes("package/dist/index.d.ts"));
  assert.ok(archiveListing.includes("package/README.md"));
  assert.ok(archiveListing.includes("package/docs/contributing/CONTRIBUTING.md"));
  assert.ok(archiveListing.includes("package/LICENSE"));
  assert.ok(archiveListing.includes("package/docs/adr/0001-flat-config-and-composition.md"));
  assert.ok(archiveListing.includes("package/docs/presets/javascript.md"));
  assert.ok(!archiveListing.includes("package/AGENTS.md"));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/tests/")));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/src/")));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/.github/")));
  assert.ok(!archiveListing.some((entry) => /(^|\/)(AGENTS\.md|CLAUDE\.md|copilot-instructions\.md)$/.test(entry)));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/docs/agents/")));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/docs/planning/")));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/docs/phases/")));
  assert.ok(!archiveListing.some((entry) => entry.startsWith("package/docs/audits/")));
  assert.ok(!archiveListing.some((entry) => /PHASE-0[AB].*REPORT\.md$/.test(entry)));
  assert.ok(!archiveListing.some((entry) => entry.includes("node_modules")));

  await writeFile(join(consumerDirectory, "package.json"), JSON.stringify({
    name: "foundation-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@scope/js-style-guide": "file:" + tarballPath,
      eslint: "10.11.0",
    },
  }, null, 2));

  await writeFile(join(consumerDirectory, "eslint.config.js"), [
    'import { defineConfig } from "eslint/config";',
    'import javascript from "@scope/js-style-guide/javascript";',
    "",
    "export default defineConfig(javascript, {",
    '  name: "consumer-overrides",',
    "});",
    "",
  ].join("\n"));

  await writeFile(join(consumerDirectory, "fixture.js"), "export default 42;\n");
  await writeFile(join(consumerDirectory, "invalid.js"), [
    "let answer = 42;",
    "function read() { return answer; }",
    "read();",
    "",
  ].join("\n"));

  const installArgs = useNpm
    ? ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false"]
    : ["install", "--ignore-scripts", "--no-frozen-lockfile", "--config.auto-install-peers=false"];
  run(packager, installArgs, consumerDirectory);

  const importCheck = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'import { javascript } from "@scope/js-style-guide"; import browser from "@scope/js-style-guide/browser"; if (!Array.isArray(javascript) || !Array.isArray(browser)) process.exit(1);',
  ], {
    cwd: consumerDirectory,
    encoding: "utf8",
  });
  assert.equal(importCheck.status, 0, importCheck.stderr);

  run(process.execPath, ["node_modules/eslint/bin/eslint.js", "fixture.js"], consumerDirectory);

  const invalidLint = spawnSync(process.execPath, [
    "node_modules/eslint/bin/eslint.js",
    "invalid.js",
  ], {
    cwd: consumerDirectory,
    encoding: "utf8",
  });
  assert.notEqual(invalidLint.status, 0, "invalid JavaScript should fail linting");
  assert.match(invalidLint.stdout + invalidLint.stderr, /prefer-const/);
} finally {
  await rm(packDirectory, { recursive: true, force: true });
  await rm(consumerDirectory, { recursive: true, force: true });
}
