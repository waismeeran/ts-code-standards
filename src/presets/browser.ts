import type { Preset } from "../types.js";
import globals from "globals";

const browserFiles = [
  "**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}",
];

const browser: Preset = [{
  name: "@waismeeran/ts-code-standards/browser/globals",
  files: browserFiles,
  languageOptions: {
    globals: globals.browser,
  },
}];

export default browser;
