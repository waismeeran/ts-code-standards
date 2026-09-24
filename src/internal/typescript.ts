import tseslint from "typescript-eslint";
import type { Linter } from "eslint";
import type { Preset } from "../types.js";
import base from "./base.js";

export const typescriptFiles = [
  "**/*.ts",
  "**/*.tsx",
  "**/*.mts",
  "**/*.cts",
];

function scopeUpstreamConfigs(configs: readonly unknown[]): Preset {
  // typescript-eslint v8's exported configs use its internal FlatConfig type;
  // ESLint 10's public Linter.Config type differs, but the runtime config shape
  // is the documented flat-config object validated by our ESLint consumers.
  return configs.map((config) => ({
    ...(config as Linter.Config),
    files: typescriptFiles,
  }));
}

const typescriptBaseline: Preset = [
  ...scopeUpstreamConfigs(tseslint.configs.recommended),
  {
    name: "@waismeeran/ts-code-standards/typescript/policy",
    files: typescriptFiles,
    rules: {
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
      }],
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "separate-type-imports",
      }],
    },
  },
];

export const typescriptPreset: Preset = [...base, ...typescriptBaseline];

// The final upstream config is the typed-only layer; the preceding entries
// would repeat the parser/base and ordinary recommended rules already present.
export const recommendedTypeCheckedOnly = scopeUpstreamConfigs(
  tseslint.configs.recommendedTypeCheckedOnly.slice(-1),
);
