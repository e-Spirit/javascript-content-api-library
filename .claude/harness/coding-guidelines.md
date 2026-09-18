# JavaScript Content API Library — Coding Guidelines

Project-specific coding rules that complement the project overview in `CLAUDE.md`. Apply at write time, not only at review time.

## Code style & quality

- **Language**: TypeScript, `strict: true`, compiled to ES5 / CommonJS (`tsconfig.json`). No decorators in new code despite `experimentalDecorators` being on.
- **Formatting**: Prettier with `semi: false`, `singleQuote: true` (config lives in `package.json`). Committed code uses the Prettier 2 trailing-comma default — see the formatting section in `CLAUDE.md` before running Prettier at all.
- **Node**: `.nvmrc` pins 24.12.0; CI runs 24.x. `engines` still claims `>=14`, so do not use syntax or APIs newer than the declared floor in shipped code without raising `engines` deliberately.
- **No linter**: there is no ESLint and no `lint` script. Type errors are the only automated style signal, so run `npx tsc --noEmit` yourself — `npm test` will not surface a type error in a file no test imports.
- **Dependencies**: this is a library consumed in browsers. Prefer none. A new runtime dependency lands in every consumer's bundle and needs an explicit justification; heavy or server-only packages belong in `optionalDependencies` and must be lazily imported like `better-sse` is in `CaaSEventStreamLazy.ts`.

## Never break the published surface

**Rule:** Treat every symbol re-exported from `src/index.ts` — including every type in `src/types.ts` — as a public contract. Additive changes only: new optional fields, new optional parameters, widened return types. When behavior must change or a name must go, deprecate instead of removing.

This library is published to npm and consumed by PWA templates and customer projects that upgrade on their own schedule. A removed field or a narrowed type breaks builds in repositories you cannot see or fix. Removing something is also a release decision, not just a code decision: `release-it` reads Conventional Commits, so a `BREAKING CHANGE:` footer ships a major version.

**Smell:** renaming a field in a `CaaSApi_*` or mapped type "because nothing in `src/` uses the old name" — `src/` is not the consumer.

### How to deprecate

1. Keep the old symbol working, and keep it exported.
2. Add a `@deprecated` JSDoc tag naming the replacement and the README section that explains the migration.
3. Document the change in `README.md` under a stable heading (update notices link to those anchors).
4. Carry the deprecated path for at least one release before proposing removal — and propose it, do not do it unasked.

If a behavior change is unavoidable even while the old API keeps compiling (a value now derived from a different source, a config field now ignored), that is still a behavior change for existing applications: document it explicitly as such, not just in the changelog.

## Content data must never decide where a request goes

**Rule:** No value read from a CaaS document may determine the host, tenant, content mode, or locale of an outbound request that carries the API key. A URL found in content may supply one thing: the id of the project a reference points at — and only after that id has been found in the `remotes` configuration.

`FSXARemoteApi` holds the CaaS API key and runs server-side. A URL inside a document is editor-controlled data. If it selected the target host, a crafted document would make the server send its API key to an attacker's endpoint — a textbook SSRF with credential leak. The `remotes` allowlist is what prevents that: every request url is assembled from `caasURL`, `tenantID`, the configured project id and the configured content mode. The locale is excluded for a different reason — an editor cannot control which locale a reference url carries, so following it produces requests for documents that do not exist.

**Smell:** `fetch(reference.url, { headers: { Authorization: apikey } })`, passing a parsed `baseUrl` into `buildCaaSUrl`, or reading `ParsedReferenceUrl.locale` to decide what to fetch.

### Checklist when adding anything URL-derived

1. Parse with `ReferenceUrlParser` — do not hand-roll string splitting on CaaS URLs, and do not duplicate the layout knowledge it owns.
2. Take the project id from it and nothing else. Locale comes from `remotes`, content mode and host from the api configuration.
3. Look the project id up with `getRemoteConfigById` before anything is fetched.
4. On a project that is not configured, or an unparsable URL, log a warning and leave the reference unresolved — its placeholder stays in the payload. Do not fall back to "try it anyway".

## Mirror the change across parallel siblings

**Rule:** When you touch a method, branch, type, or route — whether fixing a bug, refactoring, or cleaning up — immediately scan the parallel siblings with the same pattern, test files included. If the same change on a sibling is structurally identical, include it in the same pass without asking, and flag it in the commit/PR message.

This codebase is built from mirrored pairs and families. Fixing one member ships the same bug under a different name in the others.

The sibling groups to check:

1. **`FSXARemoteApi` ↔ `FSXAProxyApi`** — both implement `FSXAApi`. A changed parameter or behavior almost always needs the proxy counterpart, plus the body interface in `src/routes.ts`, plus the Express router in `src/integrations/express.ts` and `endpointIntegrationWrapper.ts`, plus `parameterValidation.ts`.
2. **The `mapDataEntry` component branches** — `FS_REFERENCE`, `FS_DATASET`, `FS_INDEX`, `FS_CATALOG`, `CMS_INPUT_IMAGEMAP` all register references; a fix to one registration site usually applies to the others.
3. **The `map*` family** — `mapPageRef`, `mapDataset`, `mapGCAPage`, `mapMedia*`, `mapProjectProperties`.
4. **Raw ↔ mapped types** — a new field on a `CaaSApi_*` type usually needs its counterpart on the mapped type, and vice versa.
5. **preview ↔ release** content modes.

**Scope:** the sweep covers every file changed on the current branch, committed and uncommitted alike. Do not leave a half-applied edit in the working tree.

A structurally identical mirror change is bounded — apply it inline. A mirror that needs real per-sibling design judgment is separate scope — name it and leave it, rather than silently widening the diff.

## Register-then-resolve: never fetch during mapping

**Rule:** Mapping code (`mapDataEntry`, `map*`) must not issue a fetch for a referenced item. Register the reference and return the placeholder; let `resolveAllReferences` do the I/O.

The two-phase design is what makes reference loading batched: one request per (projectId, locale) group of up to 30 ids instead of one request per reference. A single `await api.fetchElement(...)` inside a mapping branch turns a page with 50 images into 50 sequential round-trips, and it bypasses both `_processedItems` dedup and the `maxReferenceDepth` guard.

**Smell:** an `await this.api.fetch…` inside a `case 'FS_…'` branch, or building a result object that already contains a resolved item rather than the id returned by `registerReferencedItem`.

### Checklist when adding a new referencing component type

1. Add the branch to `mapDataEntry` and register via `registerReference` with the reference's own CaaS URL, so the project is derived, not guessed.
2. Return the placeholder `registerReference` gives you. It always returns one, including for a project that is not configured — that reference is deliberately left unresolved rather than dropped.
3. Confirm the new id ends up in the right group: assert on the group key and on the resulting `fetchByFilter` calls, not just on the mapped output.
4. Add the raw shape to `src/types.ts` and a factory to `src/testutils/`.

## Comments must add information not derivable from the code

**Rule:** Default to writing no comments. A comment is only justified when it adds information not derivable from the code under it — a hidden constraint, a workaround for a specific bug, a non-obvious invariant, behavior that would surprise a reader. If unsure whether a comment adds information: delete it.

This applies at write time and at all times after — write no useless comment in the first place, and remove any useless comment you come across, even one you just wrote. Comment hygiene is never deferred to a cleanup pass. It applies to test code exactly as to production code.

Never write comments that:

1. Restate what the code does — a well-named identifier, signature, or return type already says it.
2. Reference the current task, ticket, or caller ("added for CAAS-123", "used by the proxy") — that belongs in the commit message and the PR description.
3. Mark removed code (`// removed foo`).
4. Explain a parameter whose meaning is obvious from its type and name.

**Judge against the code, not a snippet:** evaluate a comment by reading it together with the full declaration and body it sits on, never from a `git diff` hunk or a `grep` match in isolation.

Conversely, keep comments that encode a decision the code cannot show. This repo has several that earn their place: why `src/modules/index.ts` fixes its export order (circular dependency), why `CaaSEventStream` is loaded lazily (browser bundle size), why a reference URL is only trusted after an origin check. Documentation of the public API is different in kind — JSDoc on exported symbols is consumer-facing and welcome.

## Errors: reuse the enums, stay actionable

**Rule:** User-facing failure messages belong in `FSXAApiErrors` / `CaaSMapperErrors` / `QueryBuilderErrors`, not inline in a `throw`. Before adding a case, check whether one already covers it.

Consumers assert on these strings and match on them in their own error handling, which makes the enum values part of the public surface — editing an existing message is a breaking change for someone. Add a new member instead.

Choose deliberately between throwing and warning. A misconfiguration the consumer must fix (missing API key, invalid locale) throws at construction or call time. Bad *content* — an unparsable reference URL, a broken reference, a component the mapper does not know — must not take down a page render: log through `this._logger` / `this.logger` and degrade, as the mapper already does for dropped references. Never use bare `console.log`; the `Logger` respects the configured `logLevel`.
