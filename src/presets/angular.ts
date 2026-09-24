import angularPlugin from "@angular-eslint/eslint-plugin";
import angularTemplatePlugin from "@angular-eslint/eslint-plugin-template";
import angularTemplateParser from "@angular-eslint/template-parser";
import type { Linter } from "eslint";
import type { Preset } from "../types.js";
import { typescriptPreset } from "../internal/typescript.js";

const angularTypeScriptFiles = ["**/*.ts"];
const angularTemplateFiles = ["**/*.html"];
type FlatConfigPlugin = NonNullable<Linter.Config["plugins"]>[string];
const angularTemplateProcessor = angularTemplatePlugin.processors[
  "extract-inline-html"
] as unknown as Linter.Processor;

const angularPreset: Preset = [
  ...typescriptPreset,
  {
    name: "@waismeeran/ts-code-standards/angular/typescript",
    files: angularTypeScriptFiles,
    plugins: {
      "@angular-eslint": angularPlugin as unknown as FlatConfigPlugin,
    },
    processor: angularTemplateProcessor,
    rules: angularPlugin.configs.recommended.rules as Linter.RulesRecord,
  },
  {
    name: "@waismeeran/ts-code-standards/angular/templates",
    files: angularTemplateFiles,
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      "@angular-eslint/template": angularTemplatePlugin as unknown as FlatConfigPlugin,
    },
    rules: {
      ...(angularTemplatePlugin.configs.recommended.rules as Linter.RulesRecord),
      ...(angularTemplatePlugin.configs.accessibility.rules as Linter.RulesRecord),
    },
  },
];

export default angularPreset;
