# TS Code Standards

JavaScript and TypeScript code standards for modern web applications, delivered as a modular ESLint Flat Config package.

## Status

The package is published publicly on npm as [`@waismeeran/ts-code-standards`](https://www.npmjs.com/package/@waismeeran/ts-code-standards). Install the latest release with:

~~~sh
npm install --save-dev @waismeeran/ts-code-standards
~~~

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
- A local release-readiness check, read-only manual verifier, and GitHub Actions release publisher using npm Trusted Publishing/OIDC.
- MIT license.

### Planned

The dedicated Vitest adapter is deferred because the current stable official lint plugin requires Node >=22; the package intentionally retains Node >=20.19.0. This does not prevent Vitest projects from using the package's other applicable presets. Playwright is implemented independently.

## Installation and compatibility

Install ESLint and the package from npm:

~~~sh
npm install --save-dev 'eslint@>=10.0.0 <11.0.0' '@waismeeran/ts-code-standards'
~~~

ESLint `>=10 <11` is a required peer. The integrations below are optional peers at the package level, so consumers who do not import a subpath do not need its tooling. Install the listed peers when using that subpath; when combining integrations, install the union of their peers.

| Subpath | Additional packages required for this subpath | Composition |
|---|---|---|
| `/typescript`, `/typescript-type-checked` | `typescript@>=4.8.4 <6.1.0` | Use exactly one TypeScript preset. The type-checked preset also requires linted files to belong to a TypeScript project. |
| `/imports` | None beyond the language preset's requirements; the import resolver is included with this package. | Add as an overlay to the language preset(s) you use. |
| `/react` | `eslint-plugin-react-hooks@^7.1.1`, `eslint-plugin-jsx-a11y-x@^0.2.0` | Add to exactly one JavaScript or TypeScript language preset. |
| `/next` | `@next/eslint-plugin-next@^16.3.6`, `eslint-plugin-react-hooks@^7.1.1`, `eslint-plugin-jsx-a11y-x@^0.2.0` | Add to exactly one JavaScript or TypeScript language preset. `/next` includes this package's React capability; do not also add `/react`. |
| `/angular` | `typescript@>=4.8.4 <6.1.0`, `@angular-eslint/eslint-plugin@^21.4.0`, `@angular-eslint/eslint-plugin-template@^21.4.0`, `@angular-eslint/template-parser@^21.4.0` | Standalone preset; it owns Angular's TypeScript and template setup. |
| `/playwright` | `eslint-plugin-playwright@^2.12.0` | Add as an overlay to the language preset(s) used for E2E tests. |
| `/browser`, `/node` | None | Add the globals overlay only to files for that environment. |

The peers listed above are required when importing their corresponding subpath even though they are marked optional in `package.json`. The package does not require React, Next.js, Angular, or Playwright runtime/test-runner packages just to load these lint presets. `/next` uses `@next/eslint-plugin-next` directly; it does not require `eslint-config-next`.

With ESLint and the package installed, use the following config:

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

The Next.js preset includes React Hooks and JSX accessibility behavior; install all of `/next`'s peers listed above. Next.js, React, and React DOM runtime packages are not needed just to load the lint preset. Choose the language explicitly and do not add `/react` separately:

~~~sh
npm install --save-dev 'eslint@>=10.0.0 <11.0.0' '@waismeeran/ts-code-standards' 'typescript@>=4.8.4 <6.1.0' '@next/eslint-plugin-next@^16.3.6' 'eslint-plugin-react-hooks@^7.1.1' 'eslint-plugin-jsx-a11y-x@^0.2.0'
~~~

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
