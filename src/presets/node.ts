import type { Preset } from "../types.js";
import globals from "globals";

const esmAndAmbiguousNodeFiles = [
  "**/*.{js,mjs,jsx,ts,tsx,mts}",
];
const commonJsNodeFiles = ["**/*.{cjs,cts}"];

const node: Preset = [
  {
    name: "@scope/js-style-guide/node/runtime-globals",
    files: esmAndAmbiguousNodeFiles,
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
  {
    name: "@scope/js-style-guide/node/commonjs-wrapper-globals",
    files: commonJsNodeFiles,
    languageOptions: {
      globals: globals.node,
    },
  },
];

export default node;
