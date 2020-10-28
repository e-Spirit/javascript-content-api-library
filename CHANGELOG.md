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
