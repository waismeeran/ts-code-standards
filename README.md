# @scope/js-style-guide

A planned public JavaScript/TypeScript ESLint Flat Config package. The current package name, `@scope/js-style-guide`, is provisional and will be finalized before publication.

## Status

The Phase 0B foundation, including documentation consolidation and first-commit preparation, is complete. The exported presets are intentionally empty placeholders, Phase 1 has not been authorized, and no production lint rules have been implemented. The package is not ready for production use.

### Available now

- ESM package metadata with Node >=20.19.0 engine guidance.
- ESLint 10 Flat Config architecture.
- TypeScript source compilation with declaration output.
- Root and language/environment subpath exports.
- Empty typed preset arrays for architecture and packaging validation.
- Build, typecheck, test, tarball, and clean-consumer validation scripts.
- CI configuration for Node 20, 22, and 24.
- MIT license.

### Planned

The implementation plan covers JavaScript, TypeScript, type-aware TypeScript, browser, Node, imports, React, Next.js, Angular, Vitest, and Playwright integrations. Those presets will be implemented in later phases and are not represented by the current empty exports.

## Composition contract

Consumers will compose preset arrays as separate arguments to ESLint's defineConfig helper:

~~~js
import { defineConfig } from "eslint/config";
import javascript from "@scope/js-style-guide/javascript";
import browser from "@scope/js-style-guide/browser";

export default defineConfig(javascript, browser);
~~~

Ordinary nested arrays are not the supported composition API. The internal base preset is deliberately not a public export.

The TypeScript presets are intended to be mutually exclusive in normal consumer configuration:

- typescript: fast, non-type-aware TypeScript support.
- typescript-type-checked: the TypeScript baseline plus future Project Service typed rules.

The current placeholders do not enable either rule set.

## Development

The project uses npm-compatible package metadata and a single lockfile. The bundled development environment used for this foundation may invoke the npm CLI through its available runtime wrapper.

~~~sh
npm ci
npm run check
npm run clean
~~~

The repository does not self-lint yet. ESLint self-linting is intentionally deferred until the first functional JavaScript/TypeScript preset exists; typechecking, tests, build validation, and package validation are the Phase 0B quality gate. Formatting tooling is also deferred, and no eslint-plugin-prettier dependency is used.

## Documentation

- [Agent instructions](./AGENTS.md)
- [Architecture decisions](./docs/adr/)
- [Implementation plan](./docs/planning/implementation-plan.md)
- [Phase reports](./docs/phases/)
- [Technical audits](./docs/audits/)
- [Contributing](./docs/contributing/CONTRIBUTING.md)

The package is licensed under MIT. The package identifier shown here is provisional until publication planning.

## Project structure

~~~text
src/                 TypeScript package source
  internal/          Private implementation details, including base
  presets/           Public placeholder preset modules
tests/               Package architecture tests
scripts/             Build cleanup and tarball consumer validation
docs/adr/             Accepted architecture decision records
docs/agents/          Workflow guidance and task/handoff templates
docs/audits/          Historical technical investigations
docs/contributing/    Contributor guidance
docs/phases/          Phase evidence and reports
docs/planning/        Roadmap and implementation planning
.github/workflows/   Node compatibility CI
AGENTS.md             Canonical operational guide for agents and contributors
~~~

The internal base is not a public package export. Agent workflow docs are repository development materials and are excluded from the npm package.

## AI-assisted development

This repository supports human and AI-assisted contributions. [AGENTS.md](AGENTS.md) is the sole authoritative repository instruction source; [docs/agents/workflow.md](docs/agents/workflow.md) is supplemental guidance that cannot override it. Accepted decisions live in `docs/adr/`, and each implementation phase has explicit scope. Contributors use the deterministic commands above and may delegate bounded research or review through the specialist workflow. Human review remains authoritative.
