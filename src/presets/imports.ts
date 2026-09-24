import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import type { Preset } from "../types.js";

const javascriptFiles = ["**/*.{js,mjs,cjs,jsx}"];
const typescriptFiles = ["**/*.{ts,tsx,mts,cts}"];
const extensions = [".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts"];

const imports: Preset = [
  {
    name: "@waismeeran/ts-code-standards/imports/plugin",
    files: javascriptFiles,
    plugins: {
      "import-x": importX,
    },
    rules: {
      "import-x/no-duplicates": "error",
      "import-x/no-unresolved": ["error", { commonjs: true }],
      "import-x/named": "error",
    },
  },
  {
    name: "@waismeeran/ts-code-standards/imports/typescript",
    files: typescriptFiles,
    plugins: {
      "import-x": importX,
    },
    rules: {
      "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
      "import-x/no-unresolved": ["error", { commonjs: true }],
    },
  },
  {
    name: "@waismeeran/ts-code-standards/imports/javascript-resolution",
    files: javascriptFiles,
    settings: {
      "import-x/extensions": extensions,
      "import-x/resolver-next": [createNodeResolver()],
    },
  },
  {
    name: "@waismeeran/ts-code-standards/imports/typescript-resolution",
    files: typescriptFiles,
    settings: {
      "import-x/extensions": extensions,
      "import-x/external-module-folders": ["node_modules", "node_modules/@types"],
      "import-x/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx", ".mts", ".cts"],
      },
      "import-x/resolver-next": [
        createTypeScriptImportResolver(),
        createNodeResolver(),
      ],
    },
  },
];

export default imports;
