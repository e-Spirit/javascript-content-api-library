import { getFetchElementRoute, getFetchNavigationRoute } from '../routes'

describe('routes.ts', () => {
  describe('getFetchElementRoute', () => {
    it('should return mapped element route', () => {
      expect(getFetchElementRoute('foobar', 'de_DE', { test: 1 })).toEqual(
        `/elements/foobar?locale=de_DE&additionalParams={\"test\":1}`
      )
    })
  })

  describe('getFetchNavigationRoute', () => {
    it('should return mapped gca-pages route', () => {
      expect(getFetchNavigationRoute(null, 'de_DE')).toEqual(
        `/navigation?initialPath=&locale=de_DE`
      )
      expect(getFetchNavigationRoute('/', 'de_DE')).toEqual(
        `/navigation?initialPath=%2F&locale=de_DE`
      )
    })
  })
})
