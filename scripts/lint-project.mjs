import { ESLint } from "eslint";
import imports from "../dist/presets/imports.js";
import javascript from "../dist/presets/javascript.js";
import node from "../dist/presets/node.js";
import typescript from "../dist/presets/typescript.js";

const eslint = new ESLint({
  overrideConfig: [...javascript, ...typescript, ...node, ...imports],
  overrideConfigFile: true,
});

const files = ["src/**/*.ts", "scripts/**/*.mjs", "tests/**/*.mjs"];
const results = await eslint.lintFiles(files);
let errorCount = 0;

for (const result of results) {
  for (const message of result.messages) {
    const location = `${result.filePath}:${message.line ?? 1}:${message.column ?? 1}`;
    console.error(`${location} ${message.ruleId ?? "fatal"}: ${message.message}`);
    if (message.severity === 2) errorCount += 1;
  }
}

if (errorCount > 0) {
  process.exitCode = 1;
} else {
  console.log(`Linted ${results.length} TypeScript and Node.js source/test files.`);
}
