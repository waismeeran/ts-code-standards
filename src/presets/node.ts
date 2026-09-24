import type { Preset } from "../types.js";
import globals from "globals";

const esmAndAmbiguousNodeFiles = [
  "**/*.{js,mjs,jsx,ts,tsx,mts}",
];
const commonJsNodeFiles = ["**/*.{cjs,cts}"];

const node: Preset = [
  {
    name: "@waismeeran/ts-code-standards/node/runtime-globals",
    files: esmAndAmbiguousNodeFiles,
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
  {
    name: "@waismeeran/ts-code-standards/node/commonjs-wrapper-globals",
    files: commonJsNodeFiles,
    languageOptions: {
      globals: globals.node,
    },
  },
];

export default node;
