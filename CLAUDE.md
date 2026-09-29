# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It is an index — detailed reference lives in the linked documents.

## Architecture

Read [`.claude/harness/architecture.md`](./.claude/harness/architecture.md) before searching for any code — it tells you where a feature lives, how data flows through reference resolution, and how the two API implementations relate, so you know where to look.

## Coding Guidelines

Read [`.claude/harness/coding-guidelines.md`](./.claude/harness/coding-guidelines.md) before writing or changing any code, production or test. Its rules are mandatory — obey them both at write time and at review time.

## Testing Guidelines

Read [`.claude/harness/testing-guidelines.md`](./.claude/harness/testing-guidelines.md) before writing or modifying tests. Its rules are mandatory and additive on top of the coding guidelines — obey them both at write time and at review time.

## Build & Development Commands

```bash
# Unit tests — the default signal. Runs only ./src, no network, no credentials needed.
npm test

# Run a single spec file, or a single test by name
npx jest src/modules/CaaSMapper.spec.ts
npx jest src/modules/CaaSMapper.spec.ts -t 'should resolve remote references'

# Type check without emitting. Run this after every change — jest (ts-jest) does not
# fail on type errors in files no test imports.
npx tsc --noEmit

# Build the library (types via tsc, bundles via esbuild)
npm run build

# Local install artifact for testing against a consuming app
npm run build:local

# Integration tests — NEVER run unless explicitly asked ("run the tests" does NOT authorize it)
npm run test:integration
```

The restriction on `npm run test:integration` is not stylistic: those tests read `integrationtests/.env` and write to, then delete from, a real CaaS tenant. Without that file they fail with confusing auth errors; with it they mutate a shared external system. Ask before running them, and state explicitly when you did not run them rather than implying full verification.

`npm run test:prod` is broken — it calls `npm run lint`, which does not exist in `package.json`. Do not use it and do not "fix" it by inventing a lint script; use `npm test` plus `npx tsc --noEmit`.

## Formatting

Do not run `npx prettier --write` over the repository or over whole files you did not otherwise change. The committed code was formatted by Prettier 2 (`trailingComma: "es5"`); the installed Prettier 3 defaults to `"all"`, so a bare run reformats hundreds of untouched lines and buries the real diff. If you must format, scope it to the files you changed and pass the old default explicitly:

```bash
npx prettier --write --trailing-comma es5 src/modules/CaaSMapper.ts
```

`lint-staged` runs `prettier --write` on staged `{src,test}/**/*.ts` at commit time, so files outside that glob (`README.md`, `integrationtests/`) are not Prettier-clean on master and must not be normalized as a side effect of an unrelated change.

## Commits & releases

Commit messages follow Conventional Commits and are validated by commitlint. `release-it` derives the next version and the changelog from them, so the commit type is a release decision: `fix` ships a patch, `feat` a minor, a `BREAKING CHANGE:` footer a major. Never add that footer casually — see the public API rules in the coding guidelines.
