# @scope/js-style-guide

A public JavaScript/TypeScript ESLint Flat Config package foundation. The current package name, `@scope/js-style-guide`, is provisional and will be finalized before publication.

## Status

Phases 0–7 are accepted. The dedicated Vitest adapter is deferred for Node compatibility. Phase 8 public package hardening is implemented and awaiting lead review; Phase 9 is not yet authorized. The package remains unpublished and its name is provisional.

### Available now

- ESM package metadata with Node >=20.19.0 engine guidance.
- ESLint 10 Flat Config architecture.
- TypeScript source compilation with declaration output.
- Root and language/environment subpath exports.
- A functional JavaScript preset using ESLint's recommended rules plus `prefer-const`, scoped to `.js`, `.mjs`, `.cjs`, and `.jsx`.
- Fast TypeScript and Project Service type-checked TypeScript presets, available through dedicated subpaths and scoped to `.ts`, `.tsx`, `.mts`, and `.cts`.
- Browser and Node environment overlays using maintained runtime-global data.
- An optional import-correctness overlay with TypeScript alias and package-export resolution.
- An optional React overlay with stable Hooks correctness and recommended JSX accessibility rules, available through `/react`.
- An optional Next.js overlay with internal React capability and Core Web Vitals rules, available through `/next`.
- A standalone Angular preset with TypeScript and external/inline template rules, available through `/angular`.
- An opt-in Playwright reliability overlay for conventional E2E files, available through `/playwright`.
- An internal, environment-neutral base composition boundary.
- Build, typecheck, test, tarball, and clean-consumer validation scripts.
- CI configuration for Node 20, 22, and 24.
- MIT license.

### Planned

The dedicated Vitest adapter is deferred because the current stable official lint plugin requires Node >=22; the package intentionally retains Node >=20.19.0. This does not prevent Vitest projects from using the package's other applicable presets. Playwright is implemented independently. See the [Playwright preset guide](./docs/presets/playwright.md) and [compatibility matrix](./docs/compatibility.md).

## Installation and compatibility

This package is not published yet, so the provisional `@scope/js-style-guide` identifier in examples cannot currently be installed from npm. The final package name and registry installation command are release decisions; no scope or name is implied by this placeholder.

ESLint `>=10 <11` is a required peer. Install only the optional lint tooling for the subpaths you use: TypeScript presets require TypeScript; `/react` requires `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y-x`; `/next` requires `@next/eslint-plugin-next`; `/angular` requires its three `@angular-eslint` peers; and `/playwright` requires `eslint-plugin-playwright`. Browser, Node, and imports are overlays and do not require framework peers. See the [compatibility and peer matrix](./docs/compatibility.md) before selecting presets. React, Next, Angular, and Playwright runtime/test-runner packages are not required by these lint presets.

Once the final package name is approved and the package is published, the minimal JavaScript setup will install ESLint and the package, then use the following config (replace the provisional specifier with the published package name):

~~~js
import { defineConfig } from "eslint/config";
import javascript from "@scope/js-style-guide/javascript";

export default defineConfig(javascript);
~~~

## Composition contract

Consumers will compose preset arrays as separate arguments to ESLint's defineConfig helper:

~~~js
import { defineConfig } from "eslint/config";
import { javascript } from "@scope/js-style-guide";

export default defineConfig(javascript);
~~~

The root exports the dependency-safe JavaScript preset and `Preset` type only. TypeScript presets are isolated behind their dedicated subpaths so root and JavaScript-only consumers do not need TypeScript installed. Ordinary nested arrays are not the supported composition API. The internal base preset is deliberately not a public export.

Environment, imports, and framework overlays are independent subpaths. For example, compose React with JavaScript without enabling browser globals:

~~~js
import { defineConfig } from "eslint/config";
import javascript from "@scope/js-style-guide/javascript";
import react from "@scope/js-style-guide/react";

export default defineConfig(javascript, react);
~~~

Browser globals are selected separately:

~~~js
import { defineConfig } from "eslint/config";
import { javascript } from "@scope/js-style-guide";
import browser from "@scope/js-style-guide/browser";

export default defineConfig(javascript, browser);
~~~

The Next.js preset includes React behavior; do not add `/react` separately. Choose the language explicitly:

~~~js
import { defineConfig } from "eslint/config";
import next from "@scope/js-style-guide/next";
import typescript from "@scope/js-style-guide/typescript";

export default defineConfig(typescript, next);
~~~

The Angular preset is standalone and includes the fast TypeScript baseline plus Angular component and template linting:

~~~js
import { defineConfig } from "eslint/config";
import angular from "@scope/js-style-guide/angular";

export default defineConfig(angular);
~~~

Angular does not imply browser or Node globals. Add environment overlays separately. See the [Angular preset guide](./docs/presets/angular.md) for compatibility, typed composition, and tooling details.

Choose one TypeScript preset, not both. The fast preset does not need a `tsconfig.json`; the type-checked preset uses Project Service and expects linted files to belong to a TypeScript project.

~~~js
import { defineConfig } from "eslint/config";
import imports from "@scope/js-style-guide/imports";
import node from "@scope/js-style-guide/node";
import typescriptTypeChecked from "@scope/js-style-guide/typescript-type-checked";

export default defineConfig(typescriptTypeChecked, node, imports);
~~~

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
See also the [browser](./docs/presets/browser.md), [Node](./docs/presets/node.md), [imports](./docs/presets/imports.md), [React](./docs/presets/react.md), [Next.js](./docs/presets/next.md), [Angular](./docs/presets/angular.md), and [Playwright](./docs/presets/playwright.md) guides.

## Development

The project uses npm-compatible package metadata and a single lockfile. The bundled development environment used for this foundation may invoke the npm CLI through its available runtime wrapper.

~~~sh
npm ci
npm run check
npm run clean
~~~

The repository self-lints TypeScript source, JavaScript scripts, and Node-based tests with language presets plus the Node and imports overlays after building. Generated `dist/` output is excluded. Formatting tooling remains separate, and no eslint-plugin-prettier dependency is used.

## Documentation

- [Compatibility and optional peer matrix](./docs/compatibility.md)
- [JavaScript preset](./docs/presets/javascript.md) · [TypeScript](./docs/presets/typescript.md) · [Browser](./docs/presets/browser.md) · [Node](./docs/presets/node.md) · [Imports](./docs/presets/imports.md)
- [React](./docs/presets/react.md) · [Next.js](./docs/presets/next.md) · [Angular](./docs/presets/angular.md) · [Playwright](./docs/presets/playwright.md)
- [Root export isolation decision](./docs/adr/0007-root-export-isolation.md) · [Vitest deferral decision](./docs/adr/0012-vitest-deferral-node-compatibility.md)
- [Contributing](./docs/contributing/CONTRIBUTING.md)

The package is licensed under MIT. The package identifier shown here is provisional until publication planning. Repository-only planning, audit, and agent workflow documents are intentionally not included in the package.

## Project structure

~~~text
src/                 TypeScript package source
  internal/          Private implementation details, including base
  presets/           Public language presets and browser/Node/imports/React/Next/Angular/Playwright overlays
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

## Contribution guidance

The source repository contains additional maintainer workflow and phase-validation instructions that are not distributed in the npm package. Contributions should follow the repository's current phase authorization and accepted architecture decisions.
