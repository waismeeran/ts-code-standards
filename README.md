# TS Code Standards

JavaScript and TypeScript code standards for modern web applications, delivered as a modular ESLint Flat Config package.

## Status

The package is prepared for its initial release but is not yet available on npm. Check the package registry before using the installation examples below.

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
- CI configuration for Node 20.19.0, 22, and 24.
- A local release-readiness check, read-only manual verifier, and prepared GitHub Release/OIDC publisher; canonical repository metadata is set.
- MIT license.

### Planned

The dedicated Vitest adapter is deferred because the current stable official lint plugin requires Node >=22; the package intentionally retains Node >=20.19.0. This does not prevent Vitest projects from using the package's other applicable presets. Playwright is implemented independently.

## Installation and compatibility

This package is not published yet, so `@waismeeran/ts-code-standards` cannot currently be installed from npm. Check the npm registry before using the installation example.

ESLint `>=10 <11` is a required peer. Install only the optional lint tooling for the subpaths you use: TypeScript presets require TypeScript; `/react` requires `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y-x`; `/next` requires `@next/eslint-plugin-next`; `/angular` requires its three `@angular-eslint` peers; and `/playwright` requires `eslint-plugin-playwright`. Browser, Node, and imports are overlays and do not require framework peers. React, Next, Angular, and Playwright runtime/test-runner packages are not required by these lint presets.

After the package is published, install ESLint and `@waismeeran/ts-code-standards`, then use the following config:

~~~js
import { defineConfig } from "eslint/config";
import javascript from "@waismeeran/ts-code-standards/javascript";

export default defineConfig(javascript);
~~~

## Composition contract

Consumers will compose preset arrays as separate arguments to ESLint's defineConfig helper:

~~~js
import { defineConfig } from "eslint/config";
import { javascript } from "@waismeeran/ts-code-standards";

export default defineConfig(javascript);
~~~

The root exports the dependency-safe JavaScript preset and `Preset` type only. TypeScript presets are isolated behind their dedicated subpaths so root and JavaScript-only consumers do not need TypeScript installed. Ordinary nested arrays are not the supported composition API. The internal base preset is deliberately not a public export.

Environment, imports, and framework overlays are independent subpaths. For example, compose React with JavaScript without enabling browser globals:

~~~js
import { defineConfig } from "eslint/config";
import javascript from "@waismeeran/ts-code-standards/javascript";
import react from "@waismeeran/ts-code-standards/react";

export default defineConfig(javascript, react);
~~~

Browser globals are selected separately:

~~~js
import { defineConfig } from "eslint/config";
import { javascript } from "@waismeeran/ts-code-standards";
import browser from "@waismeeran/ts-code-standards/browser";

export default defineConfig(javascript, browser);
~~~

The Next.js preset includes React behavior; do not add `/react` separately. Choose the language explicitly:

~~~js
import { defineConfig } from "eslint/config";
import next from "@waismeeran/ts-code-standards/next";
import typescript from "@waismeeran/ts-code-standards/typescript";

export default defineConfig(typescript, next);
~~~

The Angular preset is standalone and includes the fast TypeScript baseline plus Angular component and template linting:

~~~js
import { defineConfig } from "eslint/config";
import angular from "@waismeeran/ts-code-standards/angular";

export default defineConfig(angular);
~~~

Angular does not imply browser or Node globals. Add environment overlays separately.

Choose one TypeScript preset, not both. The fast preset does not need a `tsconfig.json`; the type-checked preset uses Project Service and expects linted files to belong to a TypeScript project.

~~~js
import { defineConfig } from "eslint/config";
import imports from "@waismeeran/ts-code-standards/imports";
import node from "@waismeeran/ts-code-standards/node";
import typescriptTypeChecked from "@waismeeran/ts-code-standards/typescript-type-checked";

export default defineConfig(typescriptTypeChecked, node, imports);
~~~

~~~js
import { defineConfig } from "eslint/config";
import typescript from "@waismeeran/ts-code-standards/typescript";

export default defineConfig(typescript);
~~~

~~~js
import { defineConfig } from "eslint/config";
import typescriptTypeChecked from "@waismeeran/ts-code-standards/typescript-type-checked";

export default defineConfig(typescriptTypeChecked);
~~~

## Development

The project uses npm-compatible package metadata and a single lockfile. The bundled development environment used for this foundation may invoke the npm CLI through its available runtime wrapper.

~~~sh
npm ci
npm run check
npm run clean
~~~

The repository self-lints TypeScript source, JavaScript scripts, and Node-based tests with language presets plus the Node and imports overlays after building. Generated `dist/` output is excluded. Formatting tooling remains separate, and no eslint-plugin-prettier dependency is used.

The package is licensed under MIT. Its approved public identity is [GitHub `waismeeran/ts-code-standards`](https://github.com/waismeeran/ts-code-standards) and npm `@waismeeran/ts-code-standards`.

## Project structure

~~~text
src/                 TypeScript package source
  internal/          Private implementation details, including base
  presets/           Public language presets and browser/Node/imports/React/Next/Angular/Playwright overlays
tests/               Package architecture tests
scripts/             Build cleanup and tarball consumer validation
.github/workflows/   Node compatibility CI
AGENTS.md             Canonical operational guide for agents and contributors
~~~

The internal base is not a public package export.

## Contribution guidance

Contributions should preserve the documented preset composition contract, keep optional integrations isolated behind their public subpaths, and pass `npm ci` followed by `npm run check`.
