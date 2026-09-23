import { ESLint } from "eslint";
import typescript from "../dist/presets/typescript.js";

const eslint = new ESLint({
  overrideConfig: typescript,
  overrideConfigFile: true,
});

const results = await eslint.lintFiles(["src/**/*.ts"]);
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
  console.log(`Linted ${results.length} TypeScript source files.`);
}
