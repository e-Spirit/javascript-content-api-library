import express from 'express'
import { Server } from 'http'
import {
  FSXARemoteApi,
  FSXAProxyApi,
  ComparisonQueryOperatorEnum,
  LogicalQueryOperatorEnum,
} from '../modules'
import getExpressRouter, { ExpressRouterIntegrationErrors, getMappedFilters } from './express'
import { FETCH_BY_FILTER_ROUTE, FETCH_NAVIGATION_ROUTE, FETCH_ELEMENT_ROUTE } from '../routes'
import 'cross-fetch/polyfill'
import { Page, QueryBuilderQuery, NavigationData } from '../types'
import { FSXAContentMode } from '../enums'
import Faker from 'faker'

const PORT = 3125

describe('Express-Integration', () => {
  const app = express()
  const remoteApi = new FSXARemoteApi({
    apikey: 'apiKey',
    caasURL: 'caas',
    navigationServiceURL: 'navigationService',
    projectID: 'projectId',
    tenantID: 'tenantId',
    contentMode: FSXAContentMode.PREVIEW,
  })
  let fetchElementSpy: jest.SpyInstance,
    fetchNavigationSpy: jest.SpyInstance,
    fetchByFilterSpy: jest.SpyInstance

  beforeEach(() => {
    fetchElementSpy = jest
      .spyOn(remoteApi, 'fetchElement')
      .mockImplementation(async () => ({ foo: 'bar' } as any as Page))
    fetchNavigationSpy = jest
      .spyOn(remoteApi, 'fetchNavigation')
      .mockImplementation(async () => ({ foo: 'bar' } as any as NavigationData))
    fetchByFilterSpy = jest.spyOn(remoteApi, 'fetchByFilter').mockImplementation(async () => [])
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  app.use(getExpressRouter({ api: remoteApi }))

  const proxyApi = new FSXAProxyApi(`http://localhost:${PORT}`)
  let server: Server

  beforeAll((done) => {
    server = app.listen(PORT, done)
  })

  afterAll(() => {
    server.close()
  })

  describe(FETCH_ELEMENT_ROUTE, () => {
    it('should correctly map function params', async () => {
      await proxyApi.fetchElement({ id: 'FOOBAR', locale: 'de_DE' })
      expect(fetchElementSpy).toHaveBeenCalledWith({
        additionalParams: {},
        id: 'FOOBAR',
        locale: 'de_DE',
        remoteProject: undefined,
      })
      await proxyApi.fetchElement({
        id: 'FOOBAR',
        locale: 'de_DE',
        additionalParams: { test: '1' },
      })
      expect(fetchElementSpy).toHaveBeenCalledWith({
        additionalParams: { test: '1' },
        id: 'FOOBAR',
        locale: 'de_DE',
        remoteProject: undefined,
      })
      await proxyApi.fetchElement({
        id: 'FOOBAR',
        locale: 'de_DE',
        additionalParams: { test: '1' },
        remoteProject: 'media',
      })
      expect(fetchElementSpy).toHaveBeenCalledWith({
        additionalParams: { test: '1' },
        id: 'FOOBAR',
        locale: 'de_DE',
        remoteProject: 'media',
      })
    })

    it('should return an error, when locale is not specified', async () => {
      expect(
        await (await fetch(`http://localhost:${PORT}/elements/foobar`, { method: 'POST' })).json()
      ).toEqual({
        error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
      })
    })

    it('should pass through response data', async () => {
      expect(
        await proxyApi.fetchElement({
          id: 'FOOBAR',
          locale: 'de_DE',
          additionalParams: { test: '1' },
        })
      ).toEqual({ foo: 'bar' })
      expect(fetchElementSpy).toHaveBeenCalledWith({
        additionalParams: { test: '1' },
        id: 'FOOBAR',
        locale: 'de_DE',
        remoteProject: undefined,
      })
    })
  })

  describe(FETCH_NAVIGATION_ROUTE, () => {
    it('should correctly map function params', async () => {
      await proxyApi.fetchNavigation({ initialPath: '/', locale: 'de_DE' })
      expect(fetchNavigationSpy).toHaveBeenCalledTimes(1)
      expect(fetchNavigationSpy).toHaveBeenCalledWith({
        authData: undefined,
        initialPath: '/',
        locale: 'de_DE',
      })
      await proxyApi.fetchNavigation({ initialPath: '', locale: 'de_DE' })
      expect(fetchNavigationSpy).toHaveBeenCalledTimes(2)
      expect(fetchNavigationSpy).toHaveBeenCalledWith({
        authData: undefined,
        initialPath: '/',
        locale: 'de_DE',
      })
      await proxyApi.fetchNavigation({ initialPath: '/foobar', locale: 'de_DE' })
      expect(fetchNavigationSpy).toHaveBeenCalledTimes(3)
      expect(fetchNavigationSpy).toHaveBeenCalledWith({
        authData: undefined,
        initialPath: '/foobar',
        locale: 'de_DE',
      })
      const json = Faker.datatype.json()
      await proxyApi.fetchNavigation({ initialPath: '/', locale: 'de_DE', authData: json })
      expect(fetchNavigationSpy).toHaveBeenCalledTimes(4)
      expect(fetchNavigationSpy).toHaveBeenCalledWith({
        authData: json,
        initialPath: '/',
        locale: 'de_DE',
      })
    })

    it('should return an error, when locale is not specified', async () => {
      expect(
        await (await fetch(`http://localhost:${PORT}/navigation`, { method: 'POST' })).json()
      ).toEqual({
        error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
      })
    })

    it('should pass through response data', async () => {
      expect(await proxyApi.fetchNavigation({ initialPath: '/', locale: 'de_DE' })).toEqual({
        foo: 'bar',
      })
    })
  })

  describe(FETCH_BY_FILTER_ROUTE, () => {
    it('should correctly map function params', async () => {
      await proxyApi.fetchByFilter({ filters: [], locale: 'de_DE' })
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(1)
      expect(fetchByFilterSpy).toHaveBeenCalledWith({
        additionalParams: {},
        filters: [],
        locale: 'de_DE',
        page: 1,
        pagesize: 30,
        remoteProject: undefined,
      })
      const filters_2: QueryBuilderQuery[] = [
        {
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: 'bar',
          field: 'foo',
        },
      ]
      await proxyApi.fetchByFilter({ filters: filters_2, locale: 'de_DE' })
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(2)
      expect(fetchByFilterSpy.mock.calls[1][0].filters).toEqual(filters_2)
      const filters_3: QueryBuilderQuery[] = [
        {
          operator: LogicalQueryOperatorEnum.AND,
          filters: [
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              value: 'foo',
              field: 'bar',
            },
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              value: 'bar',
              field: 'foo',
            },
          ],
        },
      ]
      await proxyApi.fetchByFilter({ filters: filters_3, locale: 'de_DE' })
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(3)
      expect(fetchByFilterSpy.mock.calls[2][0].filters).toEqual(filters_3)

      await proxyApi.fetchByFilter({ filters: [], locale: 'de_DE', page: 3, pagesize: 30 })
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(4)
      expect(fetchByFilterSpy.mock.calls[3][0].page).toEqual(3)
      expect(fetchByFilterSpy.mock.calls[3][0].pagesize).toEqual(30)

      const additionalParams = { keys: ['1', '2', '3'], sort: '-age' }
      await proxyApi.fetchByFilter({
        filters: [],
        locale: 'de_DE',
        page: 3,
        pagesize: 30,
        additionalParams,
      })
      expect(fetchByFilterSpy).toHaveBeenCalledTimes(5)
      expect(fetchByFilterSpy.mock.calls[4][0].additionalParams).toEqual(additionalParams)
    })

    it('should return an error, when locale is not specified', async () => {
      expect(
        await (await fetch(`http://localhost:${PORT}/filter`, { method: 'POST' })).json()
      ).toEqual({
        error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
      })
    })
  })

  describe('catch all route', () => {
    it('should return an error, when unknown route is called', async () => {
      expect(
        await (await fetch(`http://localhost:${PORT}/foobar`, { method: 'POST' })).json()
      ).toEqual({
        error: ExpressRouterIntegrationErrors.UNKNOWN_ROUTE,
      })
    })
  })

  describe('getMappedFilters', () => {
    it('should return an array when only a string is passed', () => {
      expect(
        getMappedFilters({
          operator: '$and',
          value: 'bar',
          field: 'foo',
        })
      ).toEqual([
        {
          operator: '$and',
          value: 'bar',
          field: 'foo',
        },
      ])
    })

    it('should return an array when only an array of strings is passed', () => {
      expect(
        getMappedFilters([
          {
            operator: '$and',
            value: 'bar',
            field: 'foo',
          },
          {
            operator: '$and',
            value: 'bar',
            field: 'foo',
          },
        ])
      ).toEqual([
        {
          operator: '$and',
          value: 'bar',
          field: 'foo',
        },
        {
          operator: '$and',
          value: 'bar',
          field: 'foo',
        },
      ])
    })
  })
})
