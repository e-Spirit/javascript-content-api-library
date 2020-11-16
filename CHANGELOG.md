## [3.3.1](https://github.com/e-Spirit/fsxa-api/compare/v3.3.0...v3.3.1) (2020-11-16)


### Bug Fixes

* **mapper:** fix error, where only one item per object was returned ([74e0f38](https://github.com/e-Spirit/fsxa-api/commit/74e0f38dd630a764bbc2965a846d886f876813b8))

# [3.3.0](https://github.com/e-Spirit/fsxa-api/compare/v3.2.0...v3.3.0) (2020-11-13)


### Bug Fixes

* **fetchbyfilter:** fix warning about missing rh:doc property error ([ec00790](https://github.com/e-Spirit/fsxa-api/commit/ec007903fc078bcbe2f926f023237d3de7bf2644))


### Features

* **custom-mapper:** we've added a customMapper option that will override the default mapping ([0849e73](https://github.com/e-Spirit/fsxa-api/commit/0849e738dd878b8b8890a7f3564459e9b992a3ef))

# [3.2.0](https://github.com/e-Spirit/fsxa-api/compare/v3.1.0...v3.2.0) (2020-11-02)


### Features

* **sectionreference:** added SectionReference support ([0a78e98](https://github.com/e-Spirit/fsxa-api/commit/0a78e984bbfa8abf67a84067e33c629e79bd4b0b))

# [3.1.0](https://github.com/e-Spirit/fsxa-api/compare/v3.0.1...v3.1.0) (2020-10-28)


### Features

* **logger, mapping:** enable setting loglevel from outside and add new mapped types ([0ab7cf6](https://github.com/e-Spirit/fsxa-api/commit/0ab7cf6273c34cb46a28a7c98300c6a4f76387fb))

## [3.0.1](https://github.com/e-Spirit/fsxa-api/compare/v3.0.0...v3.0.1) (2020-10-14)


### Bug Fixes

* **typescript / bundle:** fixed ts defs and broken bundles ([d293680](https://github.com/e-Spirit/fsxa-api/commit/d2936802c424bc10df344a7ffffc15bfa69b4b94))

# [3.0.0](https://github.com/e-Spirit/fsxa-api/compare/v2.0.0...v3.0.0) (2020-10-12)


### Features

* **datasources, misc:** added datasource support + misc ([4f0c439](https://github.com/e-Spirit/fsxa-api/commit/4f0c4391045259ff7a9c4ff0431a4f88b712b224))


### BREAKING CHANGES

* **datasources, misc:** - tenantId in configuration object is now required
- we slightly changed the
interface of the urls used in remote / proxy mode for compatibility reasons and a better integration
into the express router. Please use the exposed routes and route-generators in future
implementations

# [2.0.0](https://github.com/e-Spirit/fsxa-api/compare/v1.1.0...v2.0.0) (2020-09-17)


### Features

* **navigation:** we added support for multi-language projects ([2430896](https://github.com/e-Spirit/fsxa-api/commit/24308969e54cf55ef94a83f0d6268795ea2adbbd))


### BREAKING CHANGES

* **navigation:** the interface of the fetchNavigation changed. You now have to pass the initial path
of your application and a fallback defaultLocale to the method.

# Changelog

## 0.1.25

Breaking Changes:

- We removed Axios as request-library and switched to fetch.
  - We recommend to use (cross-fetch)[https://www.npmjs.com/package/cross-fetch] to polyfill fetch on the server side and to make this library work in SSR-Context.
