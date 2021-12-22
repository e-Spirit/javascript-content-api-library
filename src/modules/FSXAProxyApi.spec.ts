import { ComparisonQueryOperatorEnum } from './QueryBuilder'
import { QueryBuilderQuery } from './../types'
import { FSXAApiErrors, FSXAProxyRoutes } from '../enums'
import { FSXAProxyApi } from './FSXAProxyApi'
import Faker from 'faker'
import { LogLevel } from '.'
import 'jest-fetch-mock'
require('jest-fetch-mock').enableFetchMocks()

describe('FSXAProxyAPI', () => {
  let id: string
  let locale: string
  beforeEach(() => {
    fetchMock.resetMocks()
    id = Faker.datatype.uuid()
    locale = Faker.locale
  })
  describe('The initialization', () => {
    it('should throw an error if the BASEURL is empty', () => {
      expect(() => {
        new FSXAProxyApi('', LogLevel.NONE)
      }).toThrow(FSXAApiErrors.MISSING_BASE_URL)
    })
    it('should throw an error if the BASEURL contains only empty spaces', () => {
      expect(() => {
        new FSXAProxyApi('    ', LogLevel.NONE)
      }).toThrow(FSXAApiErrors.MISSING_BASE_URL)
    })
    it('should get initialized correctly', () => {
      const baseURL = Faker.internet.url()
      const proxyApi = new FSXAProxyApi(baseURL, LogLevel.NONE)
      expect(proxyApi).not.toBeNull()
      expect(proxyApi.baseUrl).toBe(baseURL)
    })
    it('should throw an error if the baseURL is set manually with an empty string', () => {
      const baseURL = ' '
      expect(() => {
        new FSXAProxyApi(baseURL, LogLevel.NONE)
      }).toThrow(FSXAApiErrors.MISSING_BASE_URL)
    })
  })
  describe('fetchElement', () => {
    let proxyApi: FSXAProxyApi
    const baseURL = Faker.internet.url()
    beforeAll(() => {
      proxyApi = new FSXAProxyApi(baseURL, LogLevel.NONE)
    })
    it('should make a fetch request to retrieve given id', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ test: 'name' }))

      proxyApi.fetchElement({ id, locale })

      const fetchMockBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)

      const actualRequestUrl = fetchMock.mock.calls[0][0]
      const expectedRequestUrl = `${baseURL}${FSXAProxyRoutes.FETCH_ELEMENT_ROUTE}`

      expect(expectedRequestUrl).toEqual(actualRequestUrl)

      const actualRequestId = fetchMockBody.id

      expect(id).toEqual(actualRequestId)

      const actualRequestLocale = fetchMockBody.locale

      expect(locale).toEqual(actualRequestLocale)
    })

    it('should throw an not found error when the response is 404', async () => {
      fetchMock.mockResponseOnce('', { status: 404 })
      const actualRequest = proxyApi.fetchElement({ id, locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_FOUND)
    })
    it('should throw an unauthorized error when the response is 401', () => {
      fetchMock.mockResponseOnce('', { status: 401 })
      const actualRequest = proxyApi.fetchElement({ id, locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_AUTHORIZED)
    })
    it('should throw an unknown error when the response is not ok', () => {
      fetchMock.mockResponseOnce('', { status: 400 })
      const actualRequest = proxyApi.fetchElement({ id, locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should return the response', async () => {
      const expectedResponse = Faker.datatype.json()
      fetchMock.mockResponseOnce(JSON.stringify(expectedResponse))

      const actualResponse = await proxyApi.fetchElement({ id, locale })
      expect(expectedResponse).toEqual(actualResponse)
    })
  })
  describe('fetchByFilter', () => {
    let proxyApi: FSXAProxyApi
    const baseURL = Faker.internet.url()
    const defaultFilters = [
      { value: '', operator: ComparisonQueryOperatorEnum.EQUALS, field: '' },
    ] as QueryBuilderQuery[]
    beforeAll(() => {
      proxyApi = new FSXAProxyApi(baseURL, LogLevel.NONE)
    })
    it('should trigger the fetch method with the correct standard params', () => {
      fetchMock.mockResponseOnce('{}')
      proxyApi.fetchByFilter({
        filters: defaultFilters,
        locale,
      })
      const actualBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      const actualURL = fetchMock.mock.calls[0][0]
      const expectedURL = `${baseURL}${FSXAProxyRoutes.FETCH_BY_FILTER_ROUTE}`

      expect(expectedURL).toEqual(actualURL)
      expect(actualBody.locale).toEqual(locale)
      expect(actualBody.filter).toStrictEqual(defaultFilters)
    })
    it('should trigger the fetch method with the correct extended params', () => {
      fetchMock.mockResponseOnce('{}')

      const page = 2
      const pagesize = 10
      const additionalParams = { keys: { identifier: 1 } }
      const remoteProject = 'remote'
      const fetchOptions = { referrer: '' } as RequestInit

      proxyApi.fetchByFilter({
        filters: defaultFilters,
        locale,
        page,
        pagesize,
        additionalParams,
        remoteProject,
        fetchOptions,
      })
      const actualBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      const actualReferrer = fetchMock.mock.calls[0][1]?.referrer
      const actualURL = fetchMock.mock.calls[0][0]
      const expectedURL = `${baseURL}${FSXAProxyRoutes.FETCH_BY_FILTER_ROUTE}`

      expect(expectedURL).toEqual(actualURL)
      expect(actualBody.filter).toStrictEqual(defaultFilters)
      expect(actualBody.locale).toEqual(locale)
      expect(actualBody.page).toEqual(page)
      expect(actualBody.pagesize).toEqual(pagesize)
      expect(actualBody.additionalParams).toStrictEqual(additionalParams)
      expect(actualBody.remote).toEqual(remoteProject)
      expect(actualReferrer).toEqual('')
    })
    it('should automatically set the pagesize to 1 when the pagesize is too low', () => {
      fetchMock.mockResponseOnce('{}')

      proxyApi.fetchByFilter({
        filters: defaultFilters,
        locale,
        pagesize: Faker.datatype.number(0),
      })

      const actualBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      expect(actualBody.pagesize).toEqual(1)
    })
    it('should automatically set the pagesize to 100 when the pagesize is too high', () => {
      fetchMock.mockResponseOnce('{}')

      proxyApi.fetchByFilter({
        filters: defaultFilters,
        locale,
        page: Faker.datatype.number({ max: Number.MAX_SAFE_INTEGER, min: 100 }),
      })

      const actualBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      expect(actualBody.page).toEqual(100)
    })
    it('should automatically set the pagesize to 1 when the page is too low', () => {
      fetchMock.mockResponseOnce('{}')

      proxyApi.fetchByFilter({
        filters: defaultFilters,
        locale,
        page: Faker.datatype.number(0),
      })

      const actualBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      expect(actualBody.page).toEqual(1)
    })
    it('should throw an unauthorized error when the response is 401', () => {
      fetchMock.mockResponseOnce('', { status: 401 })
      const actualRequest = proxyApi.fetchByFilter({
        filters: defaultFilters,
        locale,
      })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_AUTHORIZED)
    })
    it('should throw an unknown error when the response is not ok', () => {
      fetchMock.mockResponseOnce('', { status: 400 })
      const actualRequest = proxyApi.fetchByFilter({
        filters: defaultFilters,
        locale,
      })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })

    it('should return the response', async () => {
      const expectedResponse = Faker.datatype.array()
      fetchMock.mockResponseOnce(JSON.stringify(expectedResponse))

      const actualResponse = await proxyApi.fetchByFilter({
        filters: defaultFilters,
        locale,
      })
      expect(expectedResponse).toEqual(actualResponse)
    })
  })
  describe('fetchNavigation', () => {
    let proxyApi: FSXAProxyApi
    const baseURL = Faker.internet.url()
    const initialPath = '/'
    beforeAll(() => {
      proxyApi = new FSXAProxyApi(baseURL, LogLevel.NONE)
    })
    it('should trigger the fetch method with the correct params', () => {
      fetchMock.mockResponseOnce('{}')
      const authData = Faker.datatype.json()
      proxyApi.fetchNavigation({ initialPath, locale, authData })
      const actualBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      const actualURL = fetchMock.mock.calls[0][0]
      const expectedURL = `${baseURL}${FSXAProxyRoutes.FETCH_NAVIGATION_ROUTE}`

      expect(expectedURL).toEqual(actualURL)
      expect(actualBody.locale).toEqual(locale)
      expect(actualBody.initialPath).toEqual(initialPath)
      expect(actualBody.authData).toEqual(authData)
    })
    it('should throw an not found error when the response is 404', () => {
      fetchMock.mockResponseOnce('', { status: 404 })
      const actualRequest = proxyApi.fetchNavigation({ initialPath, locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_FOUND)
    })
    it('should throw an unknown error when the response is not ok', () => {
      fetchMock.mockResponseOnce('', { status: 400 })
      const actualRequest = proxyApi.fetchNavigation({ initialPath, locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should return the response', async () => {
      const expectedResponse = Faker.datatype.json()
      fetchMock.mockResponseOnce(JSON.stringify(expectedResponse))

      const actualResponse = await proxyApi.fetchNavigation({ initialPath, locale })
      expect(expectedResponse).toEqual(actualResponse)
    })
  })
  describe('fetchProjectProperties', () => {
    let proxyApi: FSXAProxyApi
    const baseURL = Faker.internet.url()
    beforeAll(() => {
      proxyApi = new FSXAProxyApi(baseURL, LogLevel.NONE)
    })
    it('should trigger the fetch method with the correct params', () => {
      fetchMock.mockResponseOnce('{}')
      proxyApi.fetchProjectProperties({ locale })
      const actualBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      const actualURL = fetchMock.mock.calls[0][0]
      const expectedURL = `${baseURL}${FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE}`

      expect(expectedURL).toEqual(actualURL)
      expect(actualBody.locale).toEqual(locale)
    })
    it('should trigger the fetch method with the correct optional params', () => {
      fetchMock.mockResponseOnce('{}')
      const resolver = ['Media']
      const options = { referrer: '' } as RequestInit
      proxyApi.fetchProjectProperties({ locale, resolver, fetchOptions: options })
      const actualBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      const actualReferrer = fetchMock.mock.calls[0][1]?.referrer
      const actualURL = fetchMock.mock.calls[0][0]
      const expectedURL = `${baseURL}${FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE}`

      expect(expectedURL).toEqual(actualURL)
      expect(actualReferrer).toEqual(options.referrer)
      expect(actualBody.locale).toEqual(locale)
      expect(actualBody.resolver).toStrictEqual(resolver)
    })
    it('should throw an not found error when the response is 404', () => {
      fetchMock.mockResponseOnce('', { status: 404 })
      const actualRequest = proxyApi.fetchProjectProperties({ locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_FOUND)
    })
    it('should throw an unknown error when the response is not ok', () => {
      fetchMock.mockResponseOnce('', { status: 400 })
      const actualRequest = proxyApi.fetchProjectProperties({ locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should return the response', async () => {
      const expectedResponse = Faker.datatype.json()
      fetchMock.mockResponseOnce(JSON.stringify(expectedResponse))

      const actualResponse = await proxyApi.fetchProjectProperties({ locale })
      expect(expectedResponse).toEqual(actualResponse)
    })
  })
})
