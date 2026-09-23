# @scope/js-style-guide

A public JavaScript/TypeScript ESLint Flat Config package foundation. The current package name, `@scope/js-style-guide`, is provisional and will be finalized before publication.

## Status

Phases 0–2 are implemented. The package remains unpublished and its name is provisional. Later phases cover environment, import, framework, and test presets.

### Available now

- ESM package metadata with Node >=20.19.0 engine guidance.
- ESLint 10 Flat Config architecture.
- TypeScript source compilation with declaration output.
- Root and language/environment subpath exports.
- A functional JavaScript preset using ESLint's recommended rules plus `prefer-const`, scoped to `.js`, `.mjs`, `.cjs`, and `.jsx`.
- Fast TypeScript and Project Service type-checked TypeScript presets, available through dedicated subpaths and scoped to `.ts`, `.tsx`, `.mts`, and `.cts`.
- An internal, environment-neutral base composition boundary.
- Build, typecheck, test, tarball, and clean-consumer validation scripts.
- CI configuration for Node 20, 22, and 24.
- MIT license.

### Planned

Later phases cover browser, Node, imports, React, Next.js, Angular, Vitest, and Playwright.

## Composition contract

Consumers will compose preset arrays as separate arguments to ESLint's defineConfig helper:

~~~js
import { defineConfig } from "eslint/config";
import { javascript } from "@scope/js-style-guide";

export default defineConfig(javascript);
~~~

The root exports the dependency-safe JavaScript preset and `Preset` type only. TypeScript presets are isolated behind their dedicated subpaths so root and JavaScript-only consumers do not need TypeScript installed. Ordinary nested arrays are not the supported composition API. The internal base preset is deliberately not a public export.

Choose one TypeScript preset, not both. The fast preset does not need a `tsconfig.json`; the type-checked preset uses Project Service and expects linted files to belong to a TypeScript project.

~~~js
import { defineConfig } from "eslint/config";
import typescript from "@scope/js-style-guide/typescript";

export default defineConfig(typescript);
~~~

~~~js
import { defineConfig } from "eslint/config";
import typescriptTypeChecked from "@scope/js-style-guide/typescript-type-checked";

export default defineConfig(typescriptTypeChecked);
~~~

See the [JavaScript preset guide](./docs/presets/javascript.md) and [TypeScript preset guide](./docs/presets/typescript.md) for rule policies and intentional omissions.

## Development

The project uses npm-compatible package metadata and a single lockfile. The bundled development environment used for this foundation may invoke the npm CLI through its available runtime wrapper.

~~~sh
npm ci
npm run check
npm run clean
~~~

The repository self-lints its TypeScript source with the untyped preset after building; JavaScript scripts and tests are not self-linted because no Node environment overlay exists yet. Formatting tooling remains separate, and no eslint-plugin-prettier dependency is used.

## Documentation

- [Agent instructions](./AGENTS.md)
- [Architecture decisions](./docs/adr/)
- [JavaScript preset rationale](./docs/presets/javascript.md)
- [TypeScript preset guidance](./docs/presets/typescript.md)
- [Implementation plan](./docs/planning/implementation-plan.md)
- [Phase reports](./docs/phases/)
- [Technical audits](./docs/audits/)
- [Contributing](./docs/contributing/CONTRIBUTING.md)

The package is licensed under MIT. The package identifier shown here is provisional until publication planning.

## Project structure

~~~text
src/                 TypeScript package source
  internal/          Private implementation details, including base
  presets/           Public JavaScript/TypeScript presets and environment placeholders
tests/               Package architecture tests
scripts/             Build cleanup and tarball consumer validation
docs/adr/             Accepted architecture decision records
docs/agents/          Workflow guidance and task/handoff templates
docs/audits/          Historical technical investigations
docs/contributing/    Contributor guidance
docs/phases/          Phase evidence and reports
docs/planning/        Roadmap and implementation planning
docs/presets/         Preset rationale and usage guidance
.github/workflows/   Node compatibility CI
AGENTS.md             Canonical operational guide for agents and contributors
~~~

The internal base is not a public package export. Agent workflow docs are repository development materials and are excluded from the npm package.

## AI-assisted development

This repository supports human and AI-assisted contributions. [AGENTS.md](AGENTS.md) is the sole authoritative repository instruction source; [docs/agents/workflow.md](docs/agents/workflow.md) is supplemental guidance that cannot override it. Accepted decisions live in `docs/adr/`, and each implementation phase has explicit scope. Contributors use the deterministic commands above and may delegate bounded research or review through the specialist workflow. Human review remains authoritative.
