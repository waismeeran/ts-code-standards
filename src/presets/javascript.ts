import type { Preset } from "../types.js";
import js from "@eslint/js";
import base from "../internal/base.js";

const javascriptFiles = ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.jsx"];

const javascript: Preset = [
  ...base,
  {
    ...js.configs.recommended,
    name: "@waismeeran/ts-code-standards/javascript",
    files: javascriptFiles,
    rules: {
      ...js.configs.recommended.rules,
      "prefer-const": "error",
    },
  },
  {
    name: "@waismeeran/ts-code-standards/javascript/jsx-syntax",
    files: ["**/*.jsx"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
];

export default javascript;
