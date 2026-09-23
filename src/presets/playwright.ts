import playwrightPlugin from "eslint-plugin-playwright";
import type { Preset } from "../types.js";

const playwrightFiles = [
  "e2e/**/*.{js,jsx,ts,tsx}",
  "tests/e2e/**/*.{js,jsx,ts,tsx}",
  "playwright/**/*.{js,jsx,ts,tsx}",
  "**/*.e2e.{js,jsx,ts,tsx}",
];

const recommended = playwrightPlugin.configs["flat/recommended"];
const disabledRuntimeGlobals = Object.fromEntries(
  Object.keys(recommended.languageOptions?.globals ?? {}).map((name) => [name, "off"]),
);

const playwright: Preset = [
  {
    name: "@scope/js-style-guide/playwright/recommended",
    files: playwrightFiles,
    ...recommended,
    languageOptions: {
      ...recommended.languageOptions,
      globals: disabledRuntimeGlobals,
    },
    rules: {
      ...recommended.rules,
      // Formatting and whitespace remain the formatter's responsibility.
      "playwright/consistent-spacing-between-blocks": "off",
    },
  },
];

export default playwright;
