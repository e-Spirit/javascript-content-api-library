# JavaScript Content API Library — Architecture

Reference description of the project, its layout, the core modules, the request flow, and the CaaS storage model it reads from. Referenced from the project `CLAUDE.md`.

## Project overview

**fsxa-api** (the JavaScript Content API Library, a.k.a. Content API) is a published npm library — not an application. It reads content from the FirstSpirit **CaaS** (Content-as-a-Service) and from the **Navigation Service**, and maps the raw CaaS JSON into a stable, consumer-facing shape for PWAs and other frontends. It ships as CommonJS + ES5 bundles plus type declarations, and is consumed by Crownpeak PWA templates and by customer projects.

Because it is a library, its exported surface is the product. See "Public API surface" below.

## Layout

| Path | Description |
|------|-------------|
| `src/modules/` | The core: both API implementations, the mapper, the query builder, the event stream, logging |
| `src/integrations/` | Adapters for hosting the proxy backend — the Express router and the framework-agnostic wrapper |
| `src/types.ts` | Both sides of every mapping: `CaaSApi_*` (raw CaaS shapes) and the mapped consumer shapes |
| `src/enums.ts` | Error message enums, content mode, proxy routes, HTTP status |
| `src/routes.ts` | Proxy route paths and request body interfaces — the contract between proxy and remote side |
| `src/testutils/` | Fixture factories used by unit tests (`createPageRef`, `createDataset`, …) |
| `src/helpers/`, `src/utils.ts` | Small pure helpers (locale discovery, navigation-map pruning, regex validation, rich-text link merging) |
| `integrationtests/` | Tests against a real CaaS tenant — see the testing guidelines |
| `proxy/` | npm workspace publishing the proxy-only entry point |
| `dev/` | Local scratch harness (`npm run dev`) for hitting a real CaaS by hand |
| `docs/superpowers/plans/` | Implementation plans written by the `writing-plans` skill |

## The two API implementations

Both implement the same `FSXAApi` interface (`src/types.ts`) and expose `fetchElement`, `fetchByFilter`, `fetchNavigation`, `fetchProjectProperties`:

- **`FSXARemoteApi`** (`src/modules/FSXARemoteApi.ts`) — talks to CaaS and the Navigation Service directly. It holds the API key, so it only ever runs server-side. It owns URL construction (`buildCaaSUrl`, `buildNavigationServiceUrl`), the trust check for reference URLs (`isTrustedReferenceUrl`), and the config: `apikey`, `caasURL`, `navigationServiceURL`, `tenantID`, `projectID`, `contentMode`, `remotes` (deprecated), `maxReferenceDepth`, `customMapper`, `navigationItemFilter`, `caasItemFilter`.
- **`FSXAProxyApi`** (`src/modules/FSXAProxyApi.ts`) — same interface, but forwards each call as an HTTP POST to a backend that hosts an `FSXARemoteApi`. It carries no secrets and is the client-side implementation.

`FSXAApiSingleton` holds one process-wide instance. The proxy backend is built with `src/integrations/express.ts` (`getExpressRouter`) or, for other frameworks, `useEndpointIntegrationWrapper` in `src/integrations/endpointIntegrationWrapper.ts`. The routes and body shapes both sides agree on live in `src/routes.ts`.

**Consequence for any change to a fetch method:** a new parameter has to be threaded through `FSXAApi` (the interface), `FSXARemoteApi` (the implementation), `FSXAProxyApi` (serialize into the request body), `src/routes.ts` (the body interface), and the integration adapters (deserialize and validate). Changing only the remote side silently leaves proxy-mode consumers behind.

## CaaSMapper and reference resolution

`src/modules/CaaSMapper.ts` is the heart of the library and the file most work touches. It converts raw CaaS documents (`CaaSApi_PageRef`, `CaaSApi_Dataset`, `CaaSApi_Media`, …) into mapped items, walking the FirstSpirit document model: `PageRef` → `Page` → `Body` → `Section`, each carrying `formData` / `metaFormData` of typed input components (`CMS_INPUT_*`, `FS_REFERENCE`, `FS_DATASET`, `FS_INDEX`, `FS_CATALOG`, `CMS_INPUT_IMAGEMAP`, `Content2Section`).

Reference resolution is **two-phase**, and understanding this is a prerequisite for editing the mapper:

1. **Register.** While mapping, a reference is not fetched. `registerReferenceFromUrl` / `registerReferencedItem` record the referenced id together with the path in the output object where the resolved item must later be placed, and mapping returns a placeholder string. One id can be registered at many paths.
2. **Resolve.** `resolveAllReferences` walks the registered groups and calls `resolveReferencesForGroup` per group, which chunks ids (`REFERENCED_ITEMS_CHUNK_SIZE = 30`) and fetches them via `fetchByFilter`.
3. **Denormalize.** `MappingUtils.denormalizeResolvedReferences` writes each fetched item into every path registered for it — or, in normalized mode, the caller receives `items` plus a flat `referenceMap` instead.

Grouping is keyed by **(projectId, locale)** — `buildGroupKey` — because one CaaS filter query carries exactly one locale and one collection. Each disjoint pair therefore costs at least one request. `unifyId` namespaces ids as `projectId#uuid.locale` so items from different projects cannot collide in the cache or the reference map.

Which project and locale a reference belongs to is derived from the reference's own CaaS document URL by `deriveReferenceTarget`, using `src/modules/ReferenceUrlParser.ts`. `FSXARemoteApi.isTrustedReferenceUrl` gates this: a reference URL is only followed when its origin and tenant match the configured `caasURL`/`tenantID`. The `remotes` configuration is deprecated and no longer consulted for resolution — see the README section "Resolving references across projects".

Two guards bound the recursion: `maxReferenceDepth` (default `DEFAULT_MAX_REFERENCE_DEPTH = 2`) and `_processedItems`, which prevents re-fetching an id already handled.

**Sharp edge:** `setLocaleFromCaasItem` mutates `this.locale` per mapped item, and `unifyId` falls back to `this.locale`. For a reference that carries no URL, the resulting group key therefore depends on which item was mapped last. Do not rely on `this.locale` being stable across a `mapFilterResponse` call.

## Request flow (remote mode)

1. The consumer calls `fetchElement` / `fetchByFilter` / `fetchNavigation` / `fetchProjectProperties`.
2. `FSXARemoteApi` builds the URL (`buildCaaSUrl`) and, for filters, translates the query via `QueryBuilder` into the CaaS filter syntax; the requested locale becomes `locale.language` + `locale.country` filters.
3. The response is handed to `CaaSMapper`, which maps documents and registers references (phase 1).
4. References are resolved per group and denormalized into the result (phases 2 and 3).
5. Optional hooks run: `customMapper` per data entry, `caasItemFilter` on mapped items, `navigationItemFilter` on navigation items.

`CaaSEventStream` (lazily loaded via `CaaSEventStreamLazy` so `better-sse` stays out of browser bundles) is a separate path: it streams CaaS change events instead of fetching documents.

## CaaS storage model

A CaaS document URL is `baseURL / tenantID / collectionID / documentID`, for example:

```
https://enterprise-caas-api.e-spirit.cloud/enterprise-prod/3bb083df-446f-4cdd-af7e-514886c4dc20.preview.content/21f3109e-63b2-47e8-9728-5680c2decb02.en_US
```

- `collectionID` = `<project uuid>.<content mode>.content`
- `documentID` = `<document uuid>.<locale>`

Content lives in `preview.content` / `release.content`; binaries in `preview.files` / `release.files`. The **content mode never comes from content data** — it comes only from this library's configuration. Preserve that when touching URL construction or reference parsing.

## Public API surface

Everything re-exported from `src/index.ts` is published: the modules listed there, all of `src/enums.ts`, all of `src/types.ts`, the helpers, the exceptions, `ROUTES`, and the integration wrappers. A rename or a narrowed type in `src/types.ts` is a breaking change for consumers even if nothing inside `src/` notices.

`src/modules/index.ts` re-exports in a **deliberate order** to break a circular-dependency cycle. Do not reorder those export lines.
