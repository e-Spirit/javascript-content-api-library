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
