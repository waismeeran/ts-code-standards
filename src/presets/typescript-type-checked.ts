import type { Preset } from "../types.js";
import typescript from "./typescript.js";

/**
 * Public placeholder only. Future typed rules will include the TypeScript
 * baseline here so consumers normally choose this preset or typescript.
 */
const typescriptTypeChecked: Preset = [...typescript];

export default typescriptTypeChecked;
