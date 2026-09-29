# JavaScript Content API Library — Testing Guidelines

Project-specific testing rules that complement the project overview in `CLAUDE.md`. Apply at write time, not only at review time.

## Test setup & resources

- **Runner**: Jest 30 with `ts-jest`, `testEnvironment: node`. Specs live next to their subject as `*.spec.ts`; `npm test` runs `./src` only.
- **HTTP**: `jest-fetch-mock`. Enable once per file with `require('jest-fetch-mock').enableFetchMocks()` and reset in `beforeEach` with `fetchMock.resetMocks()` (see `src/modules/FSXARemoteApi.spec.ts`).
- **Mapper tests**: `CaaSMapper.spec.ts` automocks the API with `jest.mock('./FSXARemoteApi')` and builds instances through a local `createApi()` helper. Use that helper rather than constructing a fresh mock inline, so shared stubs (such as the `isTrustedReferenceUrl` default) stay in one place.
- **Fixtures**: `src/testutils/` holds a factory per shape — `createPageRef`, `createPageRefBody`, `createSection`, `createDataset`, `createDatasetReference`, `createMediaPicture`, `createMediaPictureReference`, `createImageMap`, `createReferenceUrl`, `createFetchResponse`, `generateRandomConfig`. Use and extend them; do not paste raw CaaS JSON into a spec.
- **Randomness**: `@faker-js/faker` supplies ids and words in the factories. Never assert on a faker-generated value — capture it in a variable and assert against that variable.
- **Integration tests**: `integrationtests/` runs against a real CaaS tenant using `integrationtests/.env` (template in the same folder), via `CaasTestingClient` from `integrationtests/utils.ts`. Each test file generates a random `projectID` for isolation and deletes its collection afterwards. **Never run them unless explicitly asked** — see `CLAUDE.md`.

## Use the fixture factories, and add to them

**Rule:** Build test input from `src/testutils/` factories. When a test needs a shape no factory covers, add or extend a factory rather than inlining a literal — and export it from `src/testutils/index.ts`.

CaaS documents are deep and repetitive: a PageRef with a body, a section, and typed form data is fifty lines of literal. Inlined, it goes stale the moment `src/types.ts` changes, and it obscures the one field the test actually cares about. A factory takes the interesting field as a parameter and keeps the noise out of the assertion.

**Smell:** a spec that opens with forty lines of `as any as CaaSApi_Section` before the first `expect`, when `createSection()` plus one field override would do.

A factory parameter should make the *distinction under test* explicit. `createDatasetReference(id, remoteProjectId)` emitting a `url` only when a remote project is passed is the pattern to follow: local and remote fixtures differ in exactly the field the production code branches on.

## Assert exact values, not lower bounds

**Rule:** Default to `toEqual(expected)` and `toHaveLength(n)` for counts, sizes, and scalar results. `expect.any`, `toBeTruthy`, `not.toHaveLength(0)`, and `toBeGreaterThan(0)` are fallbacks, allowed only when the exact value genuinely cannot be computed from the fixture — and then justified inline.

An exact assert is a specification. A lower bound tolerates regressions in silence: a batch count drifting from 5 to 1 still passes `toBeGreaterThan(0)`. In this codebase the fixture owns every input, so nearly every count is known at write time — including request counts, registered reference paths, and mapped array lengths.

**Smell:** asserting `expect(fetchMock).toHaveBeenCalled()` for a change whose whole point was batching. Called once and called thirty times both pass; only the exact call count distinguishes them.

Where a value is unordered rather than unknown, keep the assert exact on content and explicit about order: `toHaveLength(n)` plus `expect.arrayContaining([...])`. Do not silently downgrade to a partial match — object key iteration order is a real dependency and `toEqual` on a fixed array asserts it. (Registered reference paths are the live example: `mapPageRef` maps `children` before `data`, so the section path is registered before the page path.)

## Assert on requests, not only on output

**Rule:** For anything touching reference resolution, batching, locales, or remote projects, assert on the *calls* the mapper made — `remoteProject`, `locale`, and the id list of every `fetchByFilter` — in addition to the mapped result.

The mapped output can be right for the wrong reason. Grouping bugs, duplicate fetches, and a locale silently taken from configuration instead of the reference URL all produce a correct-looking result while issuing the wrong requests; that is a performance and correctness regression the output cannot see. The request list is the only place where "one batch per (projectId, locale) pair" and "a shared reference is fetched once" are observable.

**Smell:** a remote-reference test that asserts the resolved dataset appears at the right path and stops there. It passes whether the dataset was fetched once, twice, or in five separate single-id requests.

### Pattern

```typescript
const batches = (api.fetchByFilter as jest.Mock).mock.calls.map(([params]) => ({
  remoteProject: params.remoteProject,
  locale: params.locale,
  ids: params.filters[0].value,
}))

expect(batches).toHaveLength(5)
expect(batches).toEqual(
  expect.arrayContaining([
    { remoteProject: undefined, locale: 'de_DE', ids: [localDatasetId] },
    { remoteProject: 'media-project', locale: 'en_GB', ids: [mediaId] },
  ])
)
```

Include `locale` in the projection even when the test is nominally about projects. Without it, the test still passes when grouping falls back to project id alone.

## Pick inputs that prove the behavior

**Rule:** Choose the input that *discriminates* the intended behavior from "happens to work by accident". A test passes the wrong way when the intended code path and the most plausible broken alternative produce the same observable result for your chosen input.

This is about what you feed the system under test, not what you assert. Both failure modes look identical on a green bar.

**Smell:** testing "references from another project are grouped separately" with a fixture whose only reference is remote. One group is the correct answer *and* the answer you get if grouping is ignored entirely.

### Picking the discriminating input

1. Name the two paths you must tell apart — usually the intended behavior versus the plausible bug (grouping ignored, trust check skipped, locale taken from config, dedup missing, filter inverted).
2. Pick an input where those paths differ observably. For grouping: one local reference plus remotes in at least two different projects. For dedup: the *same* reference registered from two different places. For the trust check: one URL on the configured origin and one on a foreign origin.
3. If no single input can discriminate, split into a positive and a negative case. Avoid the only-positive trap — "untrusted URLs are dropped" needs a test with an untrusted URL.
4. Sanity check by mentally deleting the production code path. If the assert still passes, the input is not discriminating.

Recurring discrimination cases here: local versus remote references (include both); same-project-different-locale (the case that catches grouping by project id alone); a reference with no URL alongside one with a URL; preview versus release; a component type the mapper does not know mixed in with ones it does.

## Cover both API implementations

**Rule:** A change to a fetch method needs test coverage on both sides — `FSXARemoteApi.spec.ts` for URL construction, query translation, and response handling, and `FSXAProxyApi.spec.ts` for request-body serialization. If it adds or changes a route parameter, extend `src/integrations/express.spec.ts` and `parameterValidation.spec.ts` too.

The two implementations satisfy one interface but share no code. Remote-only coverage lets a parameter that never reaches the proxy body ship green: proxy-mode consumers then see the parameter silently ignored, with nothing failing anywhere.

**Smell:** a new `fetchByFilter` option with tests only in `FSXARemoteApi.spec.ts`. The proxy still posts the old body shape and no test notices.

## Type errors are not caught by the test run

**Rule:** Run `npx tsc --noEmit` after every change, before reporting it done. Do not treat a green `npm test` as verification on its own.

`ts-jest` only compiles the files a test actually imports, and `noEmitOnError` is `false`. A type error in an unimported file — or in a declaration only the build's `tsc` pass sees — survives a fully green test run and then breaks `npm run build` in CI or, worse, the published `.d.ts` files.

**Smell:** widening a signature in `src/modules/` and forgetting the mirrored declaration in `src/types.ts` (the `CustomMapper` utils are declared separately there). Tests pass; `npm run build:types` fails.
