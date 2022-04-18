# [8.4.0](https://github.com/e-Spirit/fsxa-api/compare/v8.3.1...v8.4.0) (2022-03-24)


### Features

* provide context to NavigationFilter and PreFilterFetch ([#90](https://github.com/e-Spirit/fsxa-api/issues/90)) ([8b63f23](https://github.com/e-Spirit/fsxa-api/commit/8b63f238316ceca6d9fe13f86d4cfa89ca4bf6de))

## [8.3.1](https://github.com/e-Spirit/fsxa-api/compare/v8.3.0...v8.3.1) (2022-03-02)


### Bug Fixes

* **fetchprojectproperties:** reduce mutliple sequential CaaS calls to a single call ([#88](https://github.com/e-Spirit/fsxa-api/issues/88)) ([fce32bb](https://github.com/e-Spirit/fsxa-api/commit/fce32bb9dd10c404f34a68d67a560ab14eef8a09))

# [8.3.0](https://github.com/e-Spirit/fsxa-api/compare/v8.2.1...v8.3.0) (2022-02-25)


### Features

* **caasmapper:** enrich permission entries with group id attribute ([#84](https://github.com/e-Spirit/fsxa-api/issues/84)) ([575422f](https://github.com/e-Spirit/fsxa-api/commit/575422fff951a0ef7044782964ea6a5761756efb))

## [8.2.1](https://github.com/e-Spirit/fsxa-api/compare/v8.2.0...v8.2.1) (2022-02-21)


### Bug Fixes

* **fetchbyfilter:** fix return value on empty response ([#85](https://github.com/e-Spirit/fsxa-api/issues/85)) ([3ea579b](https://github.com/e-Spirit/fsxa-api/commit/3ea579b7401a1b2c161fa98bcea2c1d310e95efd))

# [8.2.0](https://github.com/e-Spirit/fsxa-api/compare/v8.1.0...v8.2.0) (2022-02-15)


### Features

* **caas:** Expose CaaS changes (WS) via Server-sent events ([#61](https://github.com/e-Spirit/fsxa-api/issues/61)) ([1a384bf](https://github.com/e-Spirit/fsxa-api/commit/1a384bf84dc97b168334d7b8b730646c8f629c91))

### Bug Fixes

* **CaaSMapper:** Resolve remote references in CaaSMapper

# [8.1.0](https://github.com/e-Spirit/fsxa-api/compare/v8.0.0...v8.1.0) (2022-02-11)


### Features

* **FS_Reference:** add optional section to reference types ([fbedc26](https://github.com/e-Spirit/fsxa-api/commit/fbedc26c4cbdc81ba4afa7789d3d5ae1edb41da9))

# [8.0.0](https://github.com/e-Spirit/fsxa-api/compare/v7.1.0...v8.0.0) (2022-02-08)


### Features

* **apiSingleton:** create api singleton and add type parameter ([#78](https://github.com/e-Spirit/fsxa-api/issues/78)) ([2acc38e](https://github.com/e-Spirit/fsxa-api/commit/2acc38e1fb6a063752ef41c697378be688b769c8)), closes [#74](https://github.com/e-Spirit/fsxa-api/issues/74)


### BREAKING CHANGES

* **apiSingleton:** "type" attribute needs to be added if objects of changed public interfaces are created in user code.
Following interfaces have changed:
* PageBody
* Page
* Reference
* Option
* Link
* Card
* ImageMap
* GCAPage
* ProjectProperties
* Section
* Dataset
* Image
* File

Example: "Option" interface contains a "type" parameter. If your code uses the interface, you need to add the parameter "type". 

compliant:
```typescript
const anOption: Option = {
  type: 'Option',
  key: 'awesome',
  value: 'example'
}
```

non-compliant:
```typescript
const anOption: Option = {
  key: 'true',
  value: 'example'
}
```

Also interfaces for `FSXAProxyApiConfig` and `CaaSApi_FSReference` have changed. If you are using them in your code, make sure to be compliant to the current implementation.
Examples for compliant usages:

compliant:
```typescript
const config: FSXAProxyApiConfig = {
  clientUrl: '/someUrl',
  serverUrl: 'localhost',
  logLevel: LogLevel.0,
  contentMode: FSXAContentMode.PREVIEW
}
```

compliant:
```typescript
const reference: CaaSApi_FSReference = {
  fsType: 'FS_REFERENCE',
  name: 'some name',
  value: null
}
```

# [7.1.0](https://github.com/e-Spirit/fsxa-api/compare/v7.0.2...v7.1.0) (2022-02-04)


### Features

* **caasmapper:** support image maps ([#72](https://github.com/e-Spirit/fsxa-api/issues/72)) ([0a8af2d](https://github.com/e-Spirit/fsxa-api/commit/0a8af2d5b0f7be78fe568be3f849f0bdb6f21e9b))

## [7.0.2](https://github.com/e-Spirit/fsxa-api/compare/v7.0.1...v7.0.2) (2022-01-20)


### Bug Fixes

* **tests:** provide CaaSMapper tests ([6c7389c](https://github.com/e-Spirit/fsxa-api/commit/6c7389c3c261c3e07e57d8064802cb719c023346))

## [7.0.1](https://github.com/e-Spirit/fsxa-api/compare/v7.0.0...v7.0.1) (2022-01-14)


### Bug Fixes

* **FSXARemoteApi:** fix parameter parsing and projectProperties ([#67](https://github.com/e-Spirit/fsxa-api/issues/67)) ([edeaf13](https://github.com/e-Spirit/fsxa-api/commit/edeaf13e05f04c2dfbf50772e9d2c5d9e27a54ac))

# [7.0.0](https://github.com/e-Spirit/fsxa-api/compare/v6.1.0...v7.0.0) (2022-01-11)


### Features

* add pagination data to response structure of fetchByFilter ([#64](https://github.com/e-Spirit/fsxa-api/issues/64)) ([8536e9d](https://github.com/e-Spirit/fsxa-api/commit/8536e9d7214abfce8b7dc61246a85b296ffc83a0))


### BREAKING CHANGES

* Previously fetchByFilter directly returned an array of returned items. Now this
data is wrapped in an 'items' property. The returned object also includes pagination data now.

### BREAKING CHANGE

Previously fetchByFilter directly returned an array of returned items. Now this
data is wrapped in an "items" property.

Example:
```typescript
const { items } = fetchByFilter({...}) as { items: any[] }
```

The returned object also includes pagination data ("page" and "pagesize") now.
If you are using "additionalParams" you can extend the pagination data with "totalPages" and "size" by passing `count: true`. Using "count" has performance implication for it involves querying the collection twice: once for counting and once of actually retrieving the data;

# [6.1.0](https://github.com/e-Spirit/fsxa-api/compare/v6.0.1...v6.1.0) (2021-12-23)

### Features

- **caasmapper:** add customizable media url builder, to add revision in preview mode ([#63](https://github.com/e-Spirit/fsxa-api/issues/63)) ([88e6c45](https://github.com/e-Spirit/fsxa-api/commit/88e6c45492a2e7e9774c19a72742e8a3bc48a806))

### UPDATE NOTICE

If you are using a CustomMapper to handle CaaS requests, you need to implement following method signature in the mapper's utils object:

```typescript
buildMediaUrl: (url: string, rev?: number) => string
```

This method can be used to change returning URLs of CaaSApi_Media_Picture.

## [6.0.1](https://github.com/e-Spirit/fsxa-api/compare/v6.0.0...v6.0.1) (2021-12-21)

### Bug Fixes

- **types:** add FSXAProxyApiConfig type for explicit definition of proxy api config ([#62](https://github.com/e-Spirit/fsxa-api/issues/62)) ([1d4144c](https://github.com/e-Spirit/fsxa-api/commit/1d4144c0ad744727e05616b5b7929ff25afa1253))

# [6.0.0](https://github.com/e-Spirit/fsxa-api/compare/v5.4.2...v6.0.0) (2021-12-07)

### Bug Fixes

- fix version number ([#60](https://github.com/e-Spirit/fsxa-api/issues/60)) ([5e8b3d0](https://github.com/e-Spirit/fsxa-api/commit/5e8b3d0d0212a43e204ca1dd81778aeb185f7c3c))

### Features

- add FSXAProxy, FSXARemoteApi and navigationFilter utilities ([#58](https://github.com/e-Spirit/fsxa-api/issues/58)) ([e909dc0](https://github.com/e-Spirit/fsxa-api/commit/e909dc0e9e49a45ec5da966fabf460fa0a3d9fb2)), closes [#44](https://github.com/e-Spirit/fsxa-api/issues/44) [#55](https://github.com/e-Spirit/fsxa-api/issues/55) [#57](https://github.com/e-Spirit/fsxa-api/issues/57) [#47](https://github.com/e-Spirit/fsxa-api/issues/47) [#49](https://github.com/e-Spirit/fsxa-api/issues/49)

### BREAKING CHANGES

- The FSXAApi class was removed and new classes FSXAProxyApi and FSXARemoteApi was
  added. Please read the [migration guide in the CHANGELOG](https://github.com/e-Spirit/fsxa-api/blob/alpha/CHANGELOG.md#migration-guide) for more details.

### Migration Guide

Since the FSXAApi class has been seperated into two different API classes,
the usage of the component needs to be adjusted.

#### API Calls

API calls like `fetchElement()`, `fetchByFilter()`, `fetchNavigation()` and `fetchProjectProperties()` now have a different method signatures.
The parameters are now typed objects and some entries can even be omitted, due to the new default values.
To be compliant to the new signature, you can wrap the parameters of your method calls inside objects and add the corresponding key to your them.

_Example_:

```typescript
api.fetchElement(req.body.id, req.body.locale, req.body?.additionalParams, req.body?.remote)
```

_does not compile_

```typescript
api.fetchElement({
  id: req.body.id,
  locale: req.body.locale,
  additionalParams: req.body?.additionalParams,
  remoteProject: req.body?.remote,
})
```

_new compliant solution_

#### Usages of FSXAApi with mode = proxy

FSXAApi has been removed.
If you were using the FSXAApi in with `mode: 'proxy'` you should switch to the new FSXAProxyApi.
The FSXAContentMode can be omitted.
_Example_:

```typescript
new FSXAApi(
  FSXAContentMode.PREVIEW,
  {
    mode: 'proxy',
    baseUrl: BASE_URL,
  },
  3
)
```

_does not compile_

```typescript
new FSXAProxyApi(BASE_URL, LogLevel.INFO)
```

_new compliant solution_

#### Usages of FSXAApi with mode = remote

FSXAApi has been removed.
If you were using the FSXAApi with `mode: 'remote'` you should switch to the new FSXARemoteApi.

_Example_:

```typescript
new FSXAApi(FSXAContentMode.PREVIEW, {
  mode: 'remote',
  config: {
    apiKey: API_KEY,
    caas: CAAS_URL,
    navigationService: NAVIGATION_SERVICE_URL,
    tenantId: TENANT_ID,
    projectId: PROJECT_ID,
    remotes: REMOTES,
  },
})
```

_does not compile_

```typescript
new FSXARemoteApi({
  apikey: API_KEY,
  caasURL: CAAS_URL,
  navigationServiceURL: NAVIGATION_SERVICE_URL,
  tenantID: TENANT_ID,
  projectID: PROJECT_ID,
  remotes: REMOTES,
  contentMode: CONTENT_MODE,
})
```

_new compliant solution_

#### Updated Endpoints

The endpoint of `/elements/:id` has changed.
The `:id` will no longer be parsed.
_Instead:_
Provide the _id_ in the POST request's body.

## [5.4.1](https://github.com/e-Spirit/fsxa-api/compare/v5.4.0...v5.4.1) (2021-11-18)

### Bug Fixes

- **release management:** deprecate an old release ([8709044](https://github.com/e-Spirit/fsxa-api/commit/8709044235fce838a93f044602de1fee499b73fe))

### Reverts

- "feat(caasmapper): added type names to interfaces used by mapper" ([#53](https://github.com/e-Spirit/fsxa-api/issues/53)) ([0dd34f2](https://github.com/e-Spirit/fsxa-api/commit/0dd34f214b6ec613ea716e40ef8801af556b976b))

# [5.4.0](https://github.com/e-Spirit/fsxa-api/compare/v5.3.3...v5.4.0) (2021-11-18)

### Features

- **caasmapper:** added type names to interfaces used by mapper ([8a7bca0](https://github.com/e-Spirit/fsxa-api/commit/8a7bca0827e427d465de0bb994ff753d5b11b940))

## [5.3.3](https://github.com/e-Spirit/fsxa-api/compare/v5.3.2...v5.3.3) (2021-10-13)

### Bug Fixes

- fix nullable record entries bug for FS_INDEX ([#45](https://github.com/e-Spirit/fsxa-api/issues/45)) ([4722f68](https://github.com/e-Spirit/fsxa-api/commit/4722f68ec888a9073176d9f5bb1fa9c3bd72a033))

## [5.3.2](https://github.com/e-Spirit/fsxa-api/compare/v5.3.1...v5.3.2) (2021-08-24)

### Bug Fixes

- remove &nbps regex and add tests to the XMLParser ([#39](https://github.com/e-Spirit/fsxa-api/issues/39)) ([5b98087](https://github.com/e-Spirit/fsxa-api/commit/5b980870ec10f7333665f73b5f0dce8eb7b22c1c))

## [5.3.1](https://github.com/e-Spirit/fsxa-api/compare/v5.3.0...v5.3.1) (2021-08-16)

### Bug Fixes

- update dependencies ([#36](https://github.com/e-Spirit/fsxa-api/issues/36)) ([223a00d](https://github.com/e-Spirit/fsxa-api/commit/223a00d9c5aad11f5f82f51fbf9c3461bf8cce80))

# [5.3.0](https://github.com/e-Spirit/fsxa-api/compare/v5.2.1...v5.3.0) (2021-06-29)

### Bug Fixes

- **querybuilder:** fix ComparisonQueryOperatorEnum.IN request with empty array ([a60925c](https://github.com/e-Spirit/fsxa-api/commit/a60925cce4fb19377956b2e423d987c1911f5b9d))

### Features

- enabled usage of remote media ([#30](https://github.com/e-Spirit/fsxa-api/issues/30)) ([85b2806](https://github.com/e-Spirit/fsxa-api/commit/85b2806e85511ec2347e2a1610f633b8dc3e92d5))

## [5.2.1](https://github.com/e-Spirit/fsxa-api/compare/v5.2.0...v5.2.1) (2021-06-11)

### Bug Fixes

- **express.ts:** fix the body request locale error message ([#26](https://github.com/e-Spirit/fsxa-api/issues/26)) ([7c53fb4](https://github.com/e-Spirit/fsxa-api/commit/7c53fb4ab4545b664fa2f02a6c2e65e86d4d024a))
- **express.ts:** fix the deprecated method ([#28](https://github.com/e-Spirit/fsxa-api/issues/28)) ([c237cd4](https://github.com/e-Spirit/fsxa-api/commit/c237cd45ea3d5a5b6fb548a1a9278da6ec3742f0))

# [5.2.0](https://github.com/e-Spirit/fsxa-api/compare/v5.1.1...v5.2.0) (2021-04-22)

### Features

- **custom mapper:** simplify custom mapper usage ([#20](https://github.com/e-Spirit/fsxa-api/issues/20)) ([9208eb5](https://github.com/e-Spirit/fsxa-api/commit/9208eb525e18f849ad2e78b0b939e5e5e02e8802))
- **navigation / pass extra headers:** allow passing of extra headers to navigation service ([#22](https://github.com/e-Spirit/fsxa-api/issues/22)) ([62b749d](https://github.com/e-Spirit/fsxa-api/commit/62b749d1670eeab15fbe0aaed25e4074b6d4ed16))

## [5.1.1](https://github.com/e-Spirit/fsxa-api/compare/v5.1.0...v5.1.1) (2021-03-22)

### Bug Fixes

- **locale:** fix error, where country part of locale would not be used correctly ([77d976d](https://github.com/e-Spirit/fsxa-api/commit/77d976d2c2d7b7f39f0f7b359f4ef243be60c314))

# [5.1.0](https://github.com/e-Spirit/fsxa-api/compare/v5.0.2...v5.1.0) (2021-03-11)

### Features

- **caasmapper:** format section and link templates in FS_CATALOG entries to match section ([b19fd63](https://github.com/e-Spirit/fsxa-api/commit/b19fd6382ce2b3a6eba1e99f7596c42315a44257))

## [5.0.2](https://github.com/e-Spirit/fsxa-api/compare/v5.0.1...v5.0.2) (2021-03-09)

### Bug Fixes

- 🐛 fixed additionalParams in fetchElement ([#15](https://github.com/e-Spirit/fsxa-api/issues/15)) ([9d0ea37](https://github.com/e-Spirit/fsxa-api/commit/9d0ea37383d7daf8ce04344403d45844924aaff7))

## [5.0.1](https://github.com/e-Spirit/fsxa-api/compare/v5.0.0...v5.0.1) (2021-03-03)

### Bug Fixes

- **caasmapper:** enable RichText mapping for the CMS_INPUT_DOMTABLE as well ([#14](https://github.com/e-Spirit/fsxa-api/issues/14)) ([31436ed](https://github.com/e-Spirit/fsxa-api/commit/31436edcb8c19d7259e6995fdeca10ba5ab3bb21))
- 🐛 fixed additionalParams for fetchByFilter ([#12](https://github.com/e-Spirit/fsxa-api/issues/12)) ([7d694c8](https://github.com/e-Spirit/fsxa-api/commit/7d694c8d83564d157105f98413d49f75f113af1c))
- **caasmapper:** map FILE entries ([#5](https://github.com/e-Spirit/fsxa-api/issues/5)) ([33872d8](https://github.com/e-Spirit/fsxa-api/commit/33872d815728754c1611a4af33a285a02042eec7))

# [5.0.0](https://github.com/e-Spirit/fsxa-api/compare/v4.1.1...v5.0.0) (2021-02-25)

### Features

- **fetchprojectproperties:** added fetchProjectProperties method and better development enviroment ([7e15cf4](https://github.com/e-Spirit/fsxa-api/commit/7e15cf4e45fcb1d655b3e2394d23c3abe55e5fff))

### BREAKING CHANGES

- **fetchprojectproperties:** - This version only works with CaaSConnect module version 3.3.0 onwards.

## [4.1.1](https://github.com/e-Spirit/fsxa-api/compare/v4.1.0...v4.1.1) (2021-02-11)

### Bug Fixes

- **xml-parser:** add block type to RichTextElement ([a261bd5](https://github.com/e-Spirit/fsxa-api/commit/a261bd5ef05fb70b62be959f9a9174a5d3547149))
- **xml-parser:** map div tag to block type ([4467e83](https://github.com/e-Spirit/fsxa-api/commit/4467e833d8c348af004a56f339d3485051165784))
- **xml-parser:** map div tag to block type ([f0ced59](https://github.com/e-Spirit/fsxa-api/commit/f0ced5954c7adb169c9e26c8ef5bfd5bc07628f9))

# [4.1.0](https://github.com/e-Spirit/fsxa-api/compare/v4.0.7...v4.1.0) (2021-01-21)

### Features

- Add description to Image when mapping CaaS data ([#3](https://github.com/e-Spirit/fsxa-api/issues/3)) ([428e8fd](https://github.com/e-Spirit/fsxa-api/commit/428e8fddbb203ce7b4c86282836e61bacb29a4ac))

## [4.0.7](https://github.com/e-Spirit/fsxa-api/compare/v4.0.6...v4.0.7) (2021-01-21)

### Bug Fixes

- Add seoRouteRegex to interface of NavigationItem ([#4](https://github.com/e-Spirit/fsxa-api/issues/4)) ([1e42b9a](https://github.com/e-Spirit/fsxa-api/commit/1e42b9a1c1730e563e8d4072dca2413bc11355af))

## [4.0.6](https://github.com/e-Spirit/fsxa-api/compare/v4.0.5...v4.0.6) (2021-01-18)

### Bug Fixes

- **caasmapper:** pass through unknown media-types as is ([d85f2e7](https://github.com/e-Spirit/fsxa-api/commit/d85f2e71f6bc65a6f187da6c67fd7344e1851ef3))

## [4.0.5](https://github.com/e-Spirit/fsxa-api/compare/v4.0.4...v4.0.5) (2020-12-22)

### Bug Fixes

- **proxy:** switch to POST-Requests to fix encoding issues. Parameters will be transferred as body ([62b8a83](https://github.com/e-Spirit/fsxa-api/commit/62b8a8334a351e42f0027655921791ada0f87d0b))

## [4.0.4](https://github.com/e-Spirit/fsxa-api/compare/v4.0.3...v4.0.4) (2020-12-22)

### Bug Fixes

- **proxy:** fix error, where stringified JSON was not encoded ([bdb4b4f](https://github.com/e-Spirit/fsxa-api/commit/bdb4b4fb105943198d76e38acb61b1673711c202))

## [4.0.3](https://github.com/e-Spirit/fsxa-api/compare/v4.0.2...v4.0.3) (2020-12-22)

### Bug Fixes

- **proxy:** fix bug, where params will all be stringified, when proxy mode is used ([23c512a](https://github.com/e-Spirit/fsxa-api/commit/23c512a6ad110318091b4827b27f3258e2aca86d))

## [4.0.2](https://github.com/e-Spirit/fsxa-api/compare/v4.0.1...v4.0.2) (2020-12-14)

### Bug Fixes

- **fetchnavigation:** we fixed an error, where special chars in the initialPath would lead to errors ([2cebd30](https://github.com/e-Spirit/fsxa-api/commit/2cebd30d1106c93fe951046beebc2788230b5018))

## [4.0.1](https://github.com/e-Spirit/fsxa-api/compare/v4.0.0...v4.0.1) (2020-12-14)

### Bug Fixes

- **references:** fix unresolved referenes issue, when using fetchElement ([6c26854](https://github.com/e-Spirit/fsxa-api/commit/6c268541c4f06ba908033e424e71c851fa95043d))

# [4.0.0](https://github.com/e-Spirit/fsxa-api/compare/v3.4.0...v4.0.0) (2020-12-13)

### Code Refactoring

- **removed fetchgcapages:** we removed fetchGCAPages to remove redundancy in our API ([dbeabbc](https://github.com/e-Spirit/fsxa-api/commit/dbeabbc2775598c6c795a1ca3e9287cc1b848d06))

### Features

- **caas-mapper:** meta-data from images is now available ([23458b2](https://github.com/e-Spirit/fsxa-api/commit/23458b288c91a442f14b181f0f18410fa0ceca25))
- **errors:** we are now throwing 404 and 401 errors / renamed fetchPage to fetchElement ([48cde97](https://github.com/e-Spirit/fsxa-api/commit/48cde9783adc0f8f425300677e81c3fe1cf6dc77))
- **richtext / dataset-query:** richText will now be returned as json, obsolete mapDataQuery removed ([82743df](https://github.com/e-Spirit/fsxa-api/commit/82743dff2c6203737309a5d4aed89a9637be158f))

### BREAKING CHANGES

- **removed fetchgcapages:** - removed fetchGCAPages, use fetchByFilter instead
- **errors:** - renamed fetchPage to fetchElement. This method will now return mapped GCAPage /
  Image / Dataset as well
  -Methods will now throw errors, when an element is not found or the request
  was not authorized
- **richtext / dataset-query:** - RichText values are now returned as JSON

* Configuration Parameter
  `mapDataQuery` was removed

# [3.4.0](https://github.com/e-Spirit/fsxa-api/compare/v3.3.2...v3.4.0) (2020-12-02)

### Bug Fixes

- **auto-resolve:** fix bug, where urls got too long, when referended items where batch loaded ([5a30ca6](https://github.com/e-Spirit/fsxa-api/commit/5a30ca6ed34640b9c5deaa235568050429e78781))
- **mapper:** fix static referenceId in FS_REFERENCE ([dfdb397](https://github.com/e-Spirit/fsxa-api/commit/dfdb39737a795acdf09144c76af1b4328b889116))

### Features

- **pagination:** added pagination support in fetchByFilter-method ([631dd5b](https://github.com/e-Spirit/fsxa-api/commit/631dd5bd60f3090139f10cd75188d30ac9ea43e4))

## [3.3.2](https://github.com/e-Spirit/fsxa-api/compare/v3.3.1...v3.3.2) (2020-11-16)

### Bug Fixes

- **mapper:** fix error, where Promise is returned for data-entries instead of resolved values ([20c17b7](https://github.com/e-Spirit/fsxa-api/commit/20c17b7eb20d5e093fddb72c50bc69937fc2f958))

## [3.3.1](https://github.com/e-Spirit/fsxa-api/compare/v3.3.0...v3.3.1) (2020-11-16)

### Bug Fixes

- **mapper:** fix error, where only one item per object was returned ([74e0f38](https://github.com/e-Spirit/fsxa-api/commit/74e0f38dd630a764bbc2965a846d886f876813b8))

# [3.3.0](https://github.com/e-Spirit/fsxa-api/compare/v3.2.0...v3.3.0) (2020-11-13)

### Bug Fixes

- **fetchbyfilter:** fix warning about missing rh:doc property error ([ec00790](https://github.com/e-Spirit/fsxa-api/commit/ec007903fc078bcbe2f926f023237d3de7bf2644))

### Features

- **custom-mapper:** we've added a customMapper option that will override the default mapping ([0849e73](https://github.com/e-Spirit/fsxa-api/commit/0849e738dd878b8b8890a7f3564459e9b992a3ef))

# [3.2.0](https://github.com/e-Spirit/fsxa-api/compare/v3.1.0...v3.2.0) (2020-11-02)

### Features

- **sectionreference:** added SectionReference support ([0a78e98](https://github.com/e-Spirit/fsxa-api/commit/0a78e984bbfa8abf67a84067e33c629e79bd4b0b))

# [3.1.0](https://github.com/e-Spirit/fsxa-api/compare/v3.0.1...v3.1.0) (2020-10-28)

### Features

- **logger, mapping:** enable setting loglevel from outside and add new mapped types ([0ab7cf6](https://github.com/e-Spirit/fsxa-api/commit/0ab7cf6273c34cb46a28a7c98300c6a4f76387fb))

## [3.0.1](https://github.com/e-Spirit/fsxa-api/compare/v3.0.0...v3.0.1) (2020-10-14)

### Bug Fixes

- **typescript / bundle:** fixed ts defs and broken bundles ([d293680](https://github.com/e-Spirit/fsxa-api/commit/d2936802c424bc10df344a7ffffc15bfa69b4b94))

# [3.0.0](https://github.com/e-Spirit/fsxa-api/compare/v2.0.0...v3.0.0) (2020-10-12)

### Features

- **datasources, misc:** added datasource support + misc ([4f0c439](https://github.com/e-Spirit/fsxa-api/commit/4f0c4391045259ff7a9c4ff0431a4f88b712b224))

### BREAKING CHANGES

- **datasources, misc:** - tenantId in configuration object is now required

* we slightly changed the
  interface of the urls used in remote / proxy mode for compatibility reasons and a better integration
  into the express router. Please use the exposed routes and route-generators in future
  implementations

# [2.0.0](https://github.com/e-Spirit/fsxa-api/compare/v1.1.0...v2.0.0) (2020-09-17)

### Features

- **navigation:** we added support for multi-language projects ([2430896](https://github.com/e-Spirit/fsxa-api/commit/24308969e54cf55ef94a83f0d6268795ea2adbbd))

### BREAKING CHANGES

- **navigation:** the interface of the fetchNavigation changed. You now have to pass the initial path
  of your application and a fallback defaultLocale to the method.

# Changelog

## 0.1.25

Breaking Changes:

- We removed Axios as request-library and switched to fetch.
  - We recommend to use (cross-fetch)[https://www.npmjs.com/package/cross-fetch] to polyfill fetch on the server side and to make this library work in SSR-Context.
