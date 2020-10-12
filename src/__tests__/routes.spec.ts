import { getFetchGCAPagesRoute, getFetchPageRoute, getFetchNavigationRoute } from '../routes'

describe('routes.ts', () => {
  describe('getFetchPageRoute', () => {
    it('should return mapped page route', () => {
      expect(getFetchPageRoute('foobar', 'de_DE')).toEqual(`/pages/foobar?locale=de_DE`)
    })
  })

  describe('getFetchGCAPagesRoute', () => {
    it('should return mapped gca-pages route', () => {
      expect(getFetchGCAPagesRoute('de_DE')).toEqual(`/gca-pages?locale=de_DE`)
      expect(getFetchGCAPagesRoute('de_DE', 'foobar')).toEqual(`/gca-pages/foobar?locale=de_DE`)
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
