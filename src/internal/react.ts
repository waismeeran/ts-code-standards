import jsxA11yX from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import type { Preset } from "../types.js";

const reactSourceFiles = ["**/*.{js,jsx,ts,tsx}"];
const reactJsFiles = ["**/*.{js,jsx}"];
const reactTsxFiles = ["**/*.tsx"];

export const reactCapability: Preset = [
  {
    ...reactHooks.configs.flat.recommended,
    name: "@waismeeran/ts-code-standards/react/hooks",
    files: reactSourceFiles,
  },
  {
    ...jsxA11yX.configs.recommended,
    name: "@waismeeran/ts-code-standards/react/jsx-accessibility-javascript",
    files: reactJsFiles,
    languageOptions: {
      ...jsxA11yX.configs.recommended.languageOptions,
      parserOptions: {
        ...jsxA11yX.configs.recommended.languageOptions?.parserOptions,
        ecmaFeatures: {
          ...jsxA11yX.configs.recommended.languageOptions?.parserOptions?.ecmaFeatures,
          jsx: true,
        },
      },
    },
  },
  {
    ...jsxA11yX.configs.recommended,
    name: "@waismeeran/ts-code-standards/react/jsx-accessibility-typescript",
    files: reactTsxFiles,
  },
];
