import express from 'express'
import { Server } from 'http'
import {
  FSXAApi,
  FSXAContentMode,
  ComparisonQueryOperatorEnum,
  LogicalQueryOperatorEnum
} from '../../modules'
import getExpressRouter, {
  ExpressRouterIntegrationErrors,
  getMappedFilters
} from '../../integrations/express'
import {
  FETCH_BY_FILTER_ROUTE,
  FETCH_GCA_PAGES_ROUTE,
  FETCH_NAVIGATION_ROUTE,
  FETCH_PAGE_ROUTE
} from '../../routes'
import 'cross-fetch/polyfill'
import { Page, QueryBuilderQuery, NavigationData } from '../../types'

const PORT = 3125

describe('Express-Integration', () => {
  const app = express()
  const remoteApi = new FSXAApi(FSXAContentMode.PREVIEW, {
    mode: 'remote',
    config: {
      apiKey: 'apiKey',
      caas: 'caas',
      mapDataQuery: query => [],
      navigationService: 'navigationService',
      projectId: 'projectId',
      tenantId: 'tenantId'
    }
  })
  let fetchPageSpy: jest.SpyInstance,
    fetchGCAPagesSpy: jest.SpyInstance,
    fetchNavigationSpy: jest.SpyInstance,
    fetchByFilterSpy: jest.SpyInstance

  beforeEach(() => {
    fetchPageSpy = jest
      .spyOn(remoteApi, 'fetchPage')
      .mockImplementation(async () => (({ foo: 'bar' } as any) as Page))
    fetchGCAPagesSpy = jest
      .spyOn(remoteApi, 'fetchGCAPages')
      .mockImplementation(async (locale, uid) => (!uid ? [{ foo: 'bar' }] : { foo: 'bar' }))
    fetchNavigationSpy = jest
      .spyOn(remoteApi, 'fetchNavigation')
      .mockImplementation(async () => (({ foo: 'bar' } as any) as NavigationData))
    fetchByFilterSpy = jest.spyOn(remoteApi, 'fetchByFilter').mockImplementation(async () => [])
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  app.use(getExpressRouter({ api: remoteApi }))

  const proxyApi = new FSXAApi(FSXAContentMode.PREVIEW, {
    mode: 'proxy',
    baseUrl: `http://localhost:${PORT}`
  })
  let server: Server

  beforeAll(done => {
    server = app.listen(PORT, done)
  })

  afterAll(() => {
    server.close()
  })

  describe(FETCH_PAGE_ROUTE, () => {
    it('should correctly map function params', async () => {
      await proxyApi.fetchPage('FOOBAR', 'de_DE')
      expect(fetchPageSpy).toHaveBeenCalledTimes(1)
      expect(fetchPageSpy).toHaveBeenCalledWith('FOOBAR', 'de_DE')
    })

    it('should return an error, when locale is not specified', async () => {
      expect(await (await fetch(`http://localhost:${PORT}/pages/foobar`)).json()).toEqual({
        error: ExpressRouterIntegrationErrors.MISSING_LOCALE
      })
    })

    it('should pass through response data', async () => {
      expect(await proxyApi.fetchPage('FOOBAR', 'de_DE')).toEqual({ foo: 'bar' })
    })
  })

  describe(FETCH_GCA_PAGES_ROUTE, () => {
    it('should correctly map function params', async () => {
      await proxyApi.fetchGCAPages('de_DE')
      expect(fetchGCAPagesSpy).toHaveBeenCalledTimes(1)
      expect(fetchGCAPagesSpy).toHaveBeenCalledWith('de_DE', undefined)
      await proxyApi.fetchGCAPages('de_DE', 'foo')
      expect(fetchGCAPagesSpy).toHaveBeenCalledTimes(2)
      expect(fetchGCAPagesSpy).toHaveBeenCalledWith('de_DE', 'foo')
    })

    it('should return an error, when locale is not specified', async () => {
      expect(await (await fetch(`http://localhost:${PORT}/gca-pages/foobar`)).json()).toEqual({
        error: ExpressRouterIntegrationErrors.MISSING_LOCALE
      })
    })

    it('should pass through response data', async () => {
      expect(await proxyApi.fetchGCAPages('de_DE')).toEqual([{ foo: 'bar' }])
      expect(await proxyApi.fetchGCAPages('de_DE', 'foobar')).toEqual({ foo: 'bar' })
    })
  })

  describe(FETCH_NAVIGATION_ROUTE, () => {
    it('should correctly map function params', async () => {
      await proxyApi.fetchNavigation(null, 'de_DE')
      expect(fetchNavigationSpy).toHaveBeenCalledTimes(1)
      expect(fetchNavigationSpy).toHaveBeenCalledWith(null, 'de_DE')
      await proxyApi.fetchNavigation('/', 'de_DE')
      expect(fetchNavigationSpy).toHaveBeenCalledTimes(2)
      expect(fetchNavigationSpy).toHaveBeenCalledWith(null, 'de_DE')
      await proxyApi.fetchNavigation('', 'de_DE')
      expect(fetchNavigationSpy).toHaveBeenCalledTimes(3)
      expect(fetchNavigationSpy).toHaveBeenCalledWith(null, 'de_DE')
      await proxyApi.fetchNavigation('/foobar', 'de_DE')
      expect(fetchNavigationSpy).toHaveBeenCalledTimes(4)
      expect(fetchNavigationSpy).toHaveBeenCalledWith('/foobar', 'de_DE')
    })

    it('should return an error, when locale is not specified', async () => {
      expect(await (await fetch(`http://localhost:${PORT}/navigation`)).json()).toEqual({
        error: ExpressRouterIntegrationErrors.MISSING_LOCALE
      })
    })

    it('should pass through response data', async () => {
      expect(await proxyApi.fetchNavigation(null, 'de_DE')).toEqual({ foo: 'bar' })
    })
  })

  describe(FETCH_BY_FILTER_ROUTE, async () => {
    it('should correctly map function params', async () => {
      await proxyApi.fetchByFilter([], 'de_DE')
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(1)
      expect(fetchByFilterSpy).toHaveBeenCalledWith([], 'de_DE')
      const filters_2: QueryBuilderQuery[] = [
        {
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: 'bar',
          field: 'foo'
        }
      ]
      await proxyApi.fetchByFilter(filters_2, 'de_DE')
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(2)
      expect(fetchByFilterSpy.mock.calls[1][0]).toEqual(filters_2)
      const filters_3: QueryBuilderQuery[] = [
        {
          operator: LogicalQueryOperatorEnum.AND,
          filters: [
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              value: 'foo',
              field: 'bar'
            },
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              value: 'bar',
              field: 'foo'
            }
          ]
        }
      ]
      await proxyApi.fetchByFilter(filters_3, 'de_DE')
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(3)
      expect(fetchByFilterSpy.mock.calls[2][0]).toEqual(filters_3)
    })

    it('should return an error, when locale is not specified', async () => {
      expect(await (await fetch(`http://localhost:${PORT}/filter`)).json()).toEqual({
        error: ExpressRouterIntegrationErrors.MISSING_LOCALE
      })
    })
  })

  describe('catch all route', () => {
    it('should return an error, when unknown route is called', async () => {
      expect(await (await fetch(`http://localhost:${PORT}/foobar`)).json()).toEqual({
        error: ExpressRouterIntegrationErrors.UNKNOWN_ROUTE
      })
    })
  })

  describe('getMappedFilters', () => {
    it('should return an array when only a string is passed', () => {
      expect(
        getMappedFilters({
          operator: '$and',
          value: 'bar',
          field: 'foo'
        })
      ).toEqual([
        {
          operator: '$and',
          value: 'bar',
          field: 'foo'
        }
      ])
    })

    it('should return an array when only an array of strings is passed', () => {
      expect(
        getMappedFilters([
          {
            operator: '$and',
            value: 'bar',
            field: 'foo'
          },
          {
            operator: '$and',
            value: 'bar',
            field: 'foo'
          }
        ])
      ).toEqual([
        {
          operator: '$and',
          value: 'bar',
          field: 'foo'
        },
        {
          operator: '$and',
          value: 'bar',
          field: 'foo'
        }
      ])
    })
  })
})
