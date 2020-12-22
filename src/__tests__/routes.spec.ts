import { getFetchElementRoute } from '../routes'

describe('routes.ts', () => {
  describe('getFetchElementRoute', () => {
    it('should return mapped element route', () => {
      expect(getFetchElementRoute('foobar')).toEqual(`/elements/foobar`)
    })
  })
})
