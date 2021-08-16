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
import { FETCH_BY_FILTER_ROUTE, FETCH_NAVIGATION_ROUTE, FETCH_ELEMENT_ROUTE } from '../../routes'
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
      navigationService: 'navigationService',
      projectId: 'projectId',
      tenantId: 'tenantId'
    }
  })
  let fetchElementSpy: jest.SpyInstance,
    fetchNavigationSpy: jest.SpyInstance,
    fetchByFilterSpy: jest.SpyInstance

  beforeEach(() => {
    fetchElementSpy = jest
      .spyOn(remoteApi, 'fetchElement')
      .mockImplementation(async () => (({ foo: 'bar' } as any) as Page))
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

  describe(FETCH_ELEMENT_ROUTE, () => {
    it('should correctly map function params', async () => {
      await proxyApi.fetchElement('FOOBAR', 'de_DE')
      expect(fetchElementSpy).toHaveBeenCalledWith('FOOBAR', 'de_DE', {}, undefined)
      await proxyApi.fetchElement('FOOBAR', 'de_DE', { test: '1' })
      expect(fetchElementSpy).toHaveBeenCalledWith('FOOBAR', 'de_DE', { test: '1' }, undefined)
      await proxyApi.fetchElement('FOOBAR', 'de_DE', { test: '1' }, 'media')
      expect(fetchElementSpy).toHaveBeenCalledWith('FOOBAR', 'de_DE', { test: '1' }, 'media')
    })

    it('should return an error, when locale is not specified', async () => {
      expect(
        await (await fetch(`http://localhost:${PORT}/elements/foobar`, { method: 'POST' })).json()
      ).toEqual({
        error: ExpressRouterIntegrationErrors.MISSING_LOCALE
      })
    })

    it('should pass through response data', async () => {
      expect(await proxyApi.fetchElement('FOOBAR', 'de_DE', { test: '1' })).toEqual({ foo: 'bar' })
      expect(fetchElementSpy).toHaveBeenCalledWith('FOOBAR', 'de_DE', { test: '1' }, undefined)
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
      expect(
        await (await fetch(`http://localhost:${PORT}/navigation`, { method: 'POST' })).json()
      ).toEqual({
        error: ExpressRouterIntegrationErrors.MISSING_LOCALE
      })
    })

    it('should pass through response data', async () => {
      expect(await proxyApi.fetchNavigation(null, 'de_DE')).toEqual({ foo: 'bar' })
    })
  })

  describe(FETCH_BY_FILTER_ROUTE, () => {
    it('should correctly map function params', async () => {
      await proxyApi.fetchByFilter([], 'de_DE')
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(1)
      expect(fetchByFilterSpy).toHaveBeenCalledWith([], 'de_DE', 1, 100, {}, undefined)
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

      await proxyApi.fetchByFilter([], 'de_DE', 3, 30)
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(4)
      expect(fetchByFilterSpy.mock.calls[3][2]).toEqual(3)
      expect(fetchByFilterSpy.mock.calls[3][3]).toEqual(30)

      const additionalParams = { keys: ['1', '2', '3'], sort: '-age' }
      await proxyApi.fetchByFilter([], 'de_DE', 3, 30, additionalParams)
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(5)
      expect(fetchByFilterSpy.mock.calls[4][4]).toEqual(additionalParams)
    })

    it('should return an error, when locale is not specified', async () => {
      expect(
        await (await fetch(`http://localhost:${PORT}/filter`, { method: 'POST' })).json()
      ).toEqual({
        error: ExpressRouterIntegrationErrors.MISSING_LOCALE
      })
    })
  })

  describe('catch all route', () => {
    it('should return an error, when unknown route is called', async () => {
      expect(
        await (await fetch(`http://localhost:${PORT}/foobar`, { method: 'POST' })).json()
      ).toEqual({
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
