import nextPlugin from "@next/eslint-plugin-next";
import { reactCapability } from "../internal/react.js";
import type { Preset } from "../types.js";

const nextSourceFiles = ["**/*.{js,jsx,ts,tsx}"];

const next: Preset = [
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  ...reactCapability,
  {
    ...nextPlugin.configs["core-web-vitals"],
    name: "@scope/js-style-guide/next/core-web-vitals",
    files: nextSourceFiles,
  },
];

export default next;
