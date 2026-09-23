import type { Preset } from "../types.js";
import {
  recommendedTypeCheckedOnly,
  typescriptFiles,
  typescriptPreset,
} from "../internal/typescript.js";

const typescriptTypeChecked: Preset = [
  ...typescriptPreset,
  ...recommendedTypeCheckedOnly,
  {
    name: "@scope/js-style-guide/typescript-type-checked/project-service",
    files: typescriptFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
];

export default typescriptTypeChecked;
