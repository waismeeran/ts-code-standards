import type { Preset } from "../types.js";
import js from "@eslint/js";
import base from "../internal/base.js";

const javascriptFiles = ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.jsx"];

const javascript: Preset = [
  ...base,
  {
    ...js.configs.recommended,
    name: "@scope/js-style-guide/javascript",
    files: javascriptFiles,
    rules: {
      ...js.configs.recommended.rules,
      "prefer-const": "error",
    },
  },
  {
    name: "@scope/js-style-guide/javascript/jsx-syntax",
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
