import type { Preset } from "../types.js";

/**
 * Shared, internal composition boundary for language presets.
 *
 * Phase 1 deliberately leaves this empty: no non-opinionated configuration has
 * yet been shown to improve both JavaScript and future TypeScript consumers.
 * Keep language rules in their language preset and add shared behavior only
 * when a later phase has evidence for it.
 */
const base: Preset = [];

export default base;
