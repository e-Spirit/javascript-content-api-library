import Faker from 'faker'
import { LogLevel } from '.'
import { FSXAContentMode } from '..'
import { FSXAApiErrors } from '../enums'
import { FetchResponse, QueryBuilderQuery, SortParams } from '../types'
import { FSXARemoteApi } from './FSXARemoteApi'
import { ArrayQueryOperatorEnum, ComparisonQueryOperatorEnum } from './QueryBuilder'

import 'jest-fetch-mock'
import { createDataEntry } from '../testutils'
require('jest-fetch-mock').enableFetchMocks()

const generateRandomConfig = () => {
  const API_KEY = Faker.datatype.uuid()
  const CAAS_URL = Faker.internet.url()
  const NAVIGATION_SERVICE_URL = Faker.internet.url()
  const TENANT_ID = Faker.internet.domainWord()
  const PROJECT_ID = Faker.datatype.uuid()
  const CONTENT_MODE: FSXAContentMode = Faker.datatype.boolean()
    ? FSXAContentMode.PREVIEW
    : FSXAContentMode.RELEASE
  const REMOTES = {
    remote: { id: Faker.datatype.uuid(), locale: Faker.locale },
    secondRemote: { id: Faker.datatype.uuid(), locale: Faker.locale },
  }

  return {
    apikey: API_KEY,
    caasURL: CAAS_URL,
    navigationServiceURL: NAVIGATION_SERVICE_URL,
    tenantID: TENANT_ID,
    projectID: PROJECT_ID,
    remotes: REMOTES,
    contentMode: CONTENT_MODE,
    logLevel: LogLevel.NONE,
  }
}

describe('FSXARemoteAPI', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })
  describe('The initialization', () => {
    let config: any
    let remoteApi: FSXARemoteApi
    beforeEach(() => {
      config = generateRandomConfig()
    })
    it('should get initialized', () => {
      remoteApi = new FSXARemoteApi(config)
      expect(remoteApi).not.toBeNull()
    })
    it('should throw an error if the API_KEY is not set', () => {
      delete config.apikey
      expect(() => {
        new FSXARemoteApi(config)
      }).toThrow(FSXAApiErrors.MISSING_API_KEY)
    })
    it('should throw an error if the CAAS_URL is not set', () => {
      delete config.caasURL
      expect(() => {
        new FSXARemoteApi(config)
      }).toThrow(FSXAApiErrors.MISSING_CAAS_URL)
    })
    it('should throw an error if the NAVIGATION_SERVICE_URL is not set', () => {
      delete config.navigationServiceURL
      expect(() => {
        new FSXARemoteApi(config)
      }).toThrow(FSXAApiErrors.MISSING_NAVIGATION_SERVICE_URL)
    })
    it('should throw an error if the PROJECT_ID is not set', () => {
      delete config.projectID
      expect(() => {
        new FSXARemoteApi(config)
      }).toThrow(FSXAApiErrors.MISSING_PROJECT_ID)
    })
    it('should throw an error if the TENANT_ID is not set', () => {
      delete config.tenantID
      expect(() => {
        new FSXARemoteApi(config)
      }).toThrow(FSXAApiErrors.MISSING_TENANT_ID)
    })
    it('should throw an error if remotes are provided without id', () => {
      delete config.remotes.remote.id
      expect(() => {
        new FSXARemoteApi(config)
      }).toThrow(FSXAApiErrors.MISSING_REMOTE_ID)
    })
    it('should throw an error if remotes are provided without locale', () => {
      delete config.remotes.remote.locale
      expect(() => {
        new FSXARemoteApi(config)
      }).toThrow(FSXAApiErrors.MISSING_REMOTE_LOCALE)
    })
    it('should throw an error if contentMode is not set', () => {
      delete config.contentMode
      expect(() => {
        new FSXARemoteApi(config)
      }).toThrow(FSXAApiErrors.UNKNOWN_CONTENT_MODE)
    })
    it('should throw an error if an invalid content mode is set', () => {
      config.contentMode = Faker.datatype.string()
      expect(() => {
        new FSXARemoteApi(config)
      }).toThrow(FSXAApiErrors.UNKNOWN_CONTENT_MODE)
    })
  })
  describe('buildAuthorizationHeaders', () => {
    it('should return the correct authorization object', () => {
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualAuthorizationHeaders = remoteApi.authorizationHeader
      const expectedAuthorizationHeaders = { authorization: `apikey="${config.apikey}"` }
      expect(actualAuthorizationHeaders).toStrictEqual(expectedAuthorizationHeaders)
    })
  })
  describe('buildCaaSUrl', () => {
    it('should return the correct caas url', () => {
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl()
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url for a remote project', () => {
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const remoteProjectId = config.remotes.remote.id
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ remoteProject: 'remote' })
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${remoteProjectId}.${config.contentMode}.content`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url with a locale but no id', () => {
      const locale = `${Faker.locale}_${Faker.locale}`
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ locale })
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url when an id is set', () => {
      const id = Faker.datatype.uuid()
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ id })
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content/${id}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url when additionalParameter are set', () => {
      const value = { firstValue: 1, secondValue: 1 }
      const additionalParams = { keys: value }
      const encodedValue = encodeURIComponent(JSON.stringify(value))
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ additionalParams })
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?keys=${encodedValue}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url when id, locale and additionalParameter are set', () => {
      const id = Faker.datatype.uuid()
      const locale = `${Faker.locale}_${Faker.locale}`
      const keysValue = { firstValue: 1, secondValue: 1 }
      const sortValue = { firstName: 1 }
      const additionalParams = { keys: keysValue, sort: sortValue }
      const encodedKeysValue = encodeURIComponent(JSON.stringify({ firstValue: 1, secondValue: 1 }))
      const encodedSortValue = encodeURIComponent(JSON.stringify({ firstName: 1 }))
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ id, locale, additionalParams })
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content/${id}.${locale}?keys=${encodedKeysValue}&sort=${encodedSortValue}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url when filters are set', () => {
      const firstValue = Faker.lorem.word()
      const secondValue = Faker.lorem.word()
      const firstField = Faker.lorem.word()
      const secondField = Faker.lorem.word()
      const firstOperator = ComparisonQueryOperatorEnum.EQUALS
      const secondOperator = ComparisonQueryOperatorEnum.EQUALS
      const filters: QueryBuilderQuery[] = [
        {
          value: firstValue,
          field: firstField,
          operator: firstOperator,
        },
        {
          value: secondValue,
          field: secondField,
          operator: secondOperator,
        },
      ]
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ filters })
      const encodedFirstFilterValue = encodeURIComponent(
        `{"${firstField}":{"${firstOperator}":"${firstValue}"}}`
      )
      const encodedSecondFilterValue = encodeURIComponent(
        `{"${secondField}":{"${secondOperator}":"${secondValue}"}}`
      )
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?filter=${encodedFirstFilterValue}&filter=${encodedSecondFilterValue}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url when filters and additionalParams are set', () => {
      const filterField = Faker.lorem.word()
      const filterValue = Faker.lorem.word()
      const filterOperator = ComparisonQueryOperatorEnum.EQUALS
      const filters: QueryBuilderQuery[] = [
        {
          value: filterValue,
          field: filterField,
          operator: filterOperator,
        },
      ]
      const additionalParams = {
        keys: {
          identifier: 1,
        },
      }
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ filters, additionalParams })
      const encodedAdditionalParamsValue = encodeURIComponent(`{"identifier":1}`)
      const encodedFilterValue = encodeURIComponent(
        `{"${filterField}":{"${filterOperator}":"${filterValue}"}}`
      )
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?keys=${encodedAdditionalParamsValue}&filter=${encodedFilterValue}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url when filters and complex additionalParams are set', () => {
      const filterField = Faker.lorem.word()
      const filterValue = Faker.lorem.word()
      const filterOperator = ComparisonQueryOperatorEnum.EQUALS
      const filters: QueryBuilderQuery[] = [
        {
          value: filterValue,
          field: filterField,
          operator: filterOperator,
        },
      ]
      const additionalParams = {
        keys: {
          identifier: 1,
        },
        filter: [{ schema: 'newsroom' }, { entityType: { $in: ['item', 'type'] } }],
      }
      const firstEncodedParamsValue = encodeURIComponent(JSON.stringify({ identifier: 1 }))
      const secondEncodedParamsValue = encodeURIComponent(JSON.stringify({ schema: 'newsroom' }))
      const thirdEncodedParamsValue = encodeURIComponent(
        JSON.stringify({ entityType: { $in: ['item', 'type'] } })
      )
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ filters, additionalParams })
      const additionalParamsQuery = `keys=${firstEncodedParamsValue}&filter=${secondEncodedParamsValue}&filter=${thirdEncodedParamsValue}`
      const encodedFilterValue = encodeURIComponent(
        `{"${filterField}":{"${filterOperator}":"${filterValue}"}}`
      )
      const filterQuery = `filter=${encodedFilterValue}`
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?${additionalParamsQuery}&${filterQuery}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url when page is set', () => {
      const page = Faker.datatype.number()
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ page })
      const pageQuery = `page=${page}`
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?${pageQuery}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url when pagesize is set', () => {
      const pagesize = Faker.datatype.number()
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ pagesize })
      const pagesizeQuery = `pagesize=${pagesize}`
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?${pagesizeQuery}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should throw an error for an invalid remote project', () => {
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)

      expect(() => {
        remoteApi.buildCaaSUrl({ remoteProject: 'unknown project' })
      }).toThrow(FSXAApiErrors.UNKNOWN_REMOTE)
    })
    it('should return the correct caas url when special chars are used in id, locale, page or pagesize', () => {
      const specialChars = "*_'();:@&=+$,?%#[]_*'();:@&=+$,?%#[]"
      const id = specialChars
      const locale = specialChars
      const page = specialChars
      const pagesize = specialChars
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({
        id,
        locale,
        // @ts-ignore
        page,
        // @ts-ignore
        pagesize,
      })
      const encodedId = encodeURIComponent(id)
      const encodedLocale = encodeURIComponent(locale)
      const encodedPage = encodeURIComponent(page)
      const encodedPagesize = encodeURIComponent(pagesize)
      const baseURL = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content/`
      const expectedCaaSUrl = `${baseURL}${encodedId}.${encodedLocale}?page=${encodedPage}&pagesize=${encodedPagesize}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url when special chars are used in additionalParams', () => {
      const specialChars = "*_'();:@&=+$,?%#[]_*'();:@&=+$,?%#[]"
      const additionalParams = {
        [specialChars]: [{ [specialChars]: specialChars }, { [specialChars]: specialChars }],
      }
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({
        additionalParams,
      })
      const encodedKey = encodeURIComponent(`${specialChars}`)
      const encodedValue = encodeURIComponent(JSON.stringify({ [specialChars]: specialChars }))
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?${encodedKey}=${encodedValue}&${encodedKey}=${encodedValue}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
    it('should return the correct caas url when special chars are used in filters or sort', () => {
      const specialChars = "*_'();:@&=+$,?%#[]_*'();:@&=+$,?%#[]"
      const locale = specialChars
      const filterOperator = ComparisonQueryOperatorEnum.EQUALS
      const filters: QueryBuilderQuery[] = [
        {
          value: `firstVal${specialChars}`,
          field: `firstField${specialChars}`,
          operator: filterOperator,
        },
        {
          value: `secondVal${specialChars}`,
          field: `secondField${specialChars}`,
          operator: filterOperator,
        },
      ]
      const sort: SortParams[] = [
        { name: specialChars, order: 'desc' },
        { name: specialChars, order: 'asc' },
      ]
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({
        locale,
        filters,
        sort,
      })
      const firstEncodedFilter = encodeURIComponent(
        `{"${`firstField${specialChars}`}":{"${filterOperator}":"${`firstVal${specialChars}`}"}}`
      )
      const secondEncodedFilter = encodeURIComponent(
        `{"${`secondField${specialChars}`}":{"${filterOperator}":"${`secondVal${specialChars}`}"}}`
      )
      const thirdEncodedFilter = encodeURIComponent(
        `{"locale.language":{"${filterOperator}":"${specialChars.split('_')[0]}"}}`
      )
      const fourthEncodedFilter = encodeURIComponent(
        `{"locale.country":{"${filterOperator}":"${specialChars.split('_')[1]}"}}`
      )
      const encodedSortName = encodeURIComponent(specialChars)
      const encodedSort = `sort=-${encodedSortName}&sort=${encodedSortName}`
      const baseURL = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content`
      const expectedCaaSUrl = `${baseURL}?filter=${firstEncodedFilter}&filter=${secondEncodedFilter}&filter=${thirdEncodedFilter}&filter=${fourthEncodedFilter}&${encodedSort}`
      expect(actualCaaSUrl).toStrictEqual(expectedCaaSUrl)
    })
  })
  describe('buildNavigationServiceUrl', () => {
    let remoteApi: FSXARemoteApi
    let config
    beforeEach(() => {
      config = generateRandomConfig()
      remoteApi = new FSXARemoteApi(config)
    })
    it('should return a correct url', () => {
      const correctURL =
        /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/g

      const navigationServiceApi = remoteApi.buildNavigationServiceUrl()

      expect(correctURL.test(navigationServiceApi)).toBe(true)
    })
    it('should return a correct url when passing the locale', () => {
      const locale = `${Faker.locale}_${Faker.locale}`
      const actualNavigationSericeUrl = remoteApi.buildNavigationServiceUrl({ locale })
      const expectedEndOfNavigationServiceUrl = `?depth=99&format=caas&language=${locale}`
      expect(actualNavigationSericeUrl.endsWith(expectedEndOfNavigationServiceUrl)).toBe(true)
    })
    it('should return a correct url when passing the initialPath', () => {
      const initialPath = Faker.lorem.words(3).split(' ').join('/')

      const actualNavigationSericeUrl = remoteApi.buildNavigationServiceUrl({ initialPath })
      const expectedEndOfNavigationServiceUrl = `/by-seo-route/${initialPath}?depth=99&format=caas`
      expect(actualNavigationSericeUrl.endsWith(expectedEndOfNavigationServiceUrl)).toBe(true)
    })
    it('should not return the seo-route url when initialPath is /', () => {
      const initialPath = '/'
      const actualNavigationSericeUrl = remoteApi.buildNavigationServiceUrl({ initialPath })
      const expectedEndOfNavigationServiceUrl = `/by-seo-route/${initialPath}?depth=99&format=caas&all`
      expect(actualNavigationSericeUrl.endsWith(expectedEndOfNavigationServiceUrl)).not.toBe(true)
    })
  })
  describe('fetchElement', () => {
    let remoteApi: FSXARemoteApi
    let config: any
    let uuid: string
    let locale: string
    beforeEach(() => {
      uuid = Faker.datatype.uuid()
      locale = `${Faker.locale}_${Faker.locale}`
      config = generateRandomConfig()
      remoteApi = new FSXARemoteApi(config)
    })
    it('should call fetchByFilter internally', async () => {
      const data = createDataEntry()
      fetchMock.mockResponseOnce(JSON.stringify(data))
      remoteApi.fetchByFilter = jest
        .fn()
        .mockResolvedValue({ page: 1, pagesize: 1, items: ['myItem'] as any } as FetchResponse)
      await remoteApi.fetchElement({
        id: data.identifier,
        locale,
        fetchOptions: {},
        additionalParams: {},
        filterContext: {},
      })
      expect(remoteApi.fetchByFilter).toHaveBeenCalledTimes(1)
      expect(remoteApi.fetchByFilter).toHaveBeenCalledWith({
        filters: [
          {
            operator: ComparisonQueryOperatorEnum.EQUALS,
            field: 'identifier',
            value: data.identifier,
          },
        ],
        additionalParams: {},
        fetchOptions: {},
        filterContext: {},
        normalized: true,
        remoteProject: undefined,
        locale,
      })
    })
    it('should throw an not found error when the response is 404', () => {
      remoteApi.fetchByFilter = jest
        .fn()
        .mockResolvedValue({ page: 1, pagesize: 1, items: [] } as FetchResponse)
      const actualRequest = remoteApi.fetchElement({ id: uuid, locale })
      return expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_FOUND)
    })
    it('should throw an unauthorized error when the response is 401', () => {
      fetchMock.mockResponseOnce('', { status: 401 })
      const actualRequest = remoteApi.fetchElement({ id: uuid, locale })
      return expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_AUTHORIZED)
    })
    it('should throw an unknown error when the response is not ok', () => {
      fetchMock.mockResponseOnce('', { status: 400 })
      const actualRequest = remoteApi.fetchElement({ id: uuid, locale })
      return expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should return the response', async () => {
      const caasApiItem = createDataEntry()
      const mockRes = {
        _embedded: {
          'rh:doc': [caasApiItem],
        },
      }
      fetchMock.mockResponse(JSON.stringify(mockRes))
      const actualRequest = await remoteApi.fetchElement({ id: uuid, locale })
      expect(actualRequest).toBeDefined()
      expect(actualRequest).toStrictEqual(caasApiItem)
    })
    it('should return a mapped response when additionalParams are set', async () => {
      const item = createDataEntry()
      const mockRes = {
        _embedded: {
          'rh:doc': [item],
        },
      }
      fetchMock.mockResponse(JSON.stringify(mockRes))
      const actualRequest = await remoteApi.fetchElement({
        id: uuid,
        locale,
        additionalParams: { depth: 99 },
      })
      expect(actualRequest).toBeDefined()
      expect(actualRequest).toStrictEqual(item)
    })
  })
  describe('fetchByFilter', () => {
    let remoteApi: FSXARemoteApi
    let config: any
    let filters: QueryBuilderQuery[]
    let filterValue: string
    let filterField: string
    let localeLanguage: string
    let localeCountry: string
    let locale: string
    let json: Record<string, any>
    beforeEach(() => {
      filterValue = Faker.lorem.word()
      filterField = Faker.lorem.word()
      filters = [
        {
          value: filterValue,
          field: filterField,
          operator: ComparisonQueryOperatorEnum.EQUALS,
        },
      ]
      localeLanguage = Faker.lorem.word(2).toLowerCase()
      localeCountry = Faker.lorem.word(2).toUpperCase()
      locale = localeLanguage + '_' + localeCountry
      config = generateRandomConfig()
      remoteApi = new FSXARemoteApi(config)
      json = {
        _embedded: {
          'rh:doc': Faker.datatype.array(),
        },
      }
    })
    it('should trigger the fetch method with the correct params', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(json))
      await remoteApi.fetchByFilter({ filters, locale })
      const actualURL = fetchMock.mock.calls[0][0]
      const firstEncodedFilterValue = encodeURIComponent(
        `{"${filterField}":{"$eq":"${filterValue}"}}`
      )
      const secondEncodedFilterValue = encodeURIComponent(
        `{"locale.language":{"$eq":"${localeLanguage}"}}`
      )
      const thirdEncodedFilterValue = encodeURIComponent(
        `{"locale.country":{"$eq":"${localeCountry}"}}`
      )
      const expectedURL = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?rep=hal&filter=${firstEncodedFilterValue}&filter=${secondEncodedFilterValue}&filter=${thirdEncodedFilterValue}&page=1&pagesize=30`
      expect(actualURL).toBe(expectedURL)
    })
    it('should trigger the fetch method with the sort param', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(json))
      const sort = [
        { name: 'displayName', order: 'asc' },
        { name: 'template.name', order: 'desc' },
      ] as SortParams[]
      await remoteApi.fetchByFilter({ filters, locale, sort })
      const actualURL = fetchMock.mock.calls[0][0]
      const firstEncodedFilterValue = encodeURIComponent(
        `{"${filterField}":{"$eq":"${filterValue}"}}`
      )
      const secondEncodedFilterValue = encodeURIComponent(
        `{"locale.language":{"$eq":"${localeLanguage}"}}`
      )
      const thirdEncodedFilterValue = encodeURIComponent(
        `{"locale.country":{"$eq":"${localeCountry}"}}`
      )
      const expectedURL = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?rep=hal&filter=${firstEncodedFilterValue}&filter=${secondEncodedFilterValue}&filter=${thirdEncodedFilterValue}&page=1&pagesize=30&sort=${sort[0].name}&sort=-${sort[1].name}`
      expect(actualURL).toBe(expectedURL)
    })
    it('should throw an unauthorized error when the response is 401', () => {
      fetchMock.mockResponseOnce('', { status: 401 })
      const actualRequest = remoteApi.fetchByFilter({ filters, locale })
      return expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_AUTHORIZED)
    })
    it('should throw an unknown error when the response is not ok', () => {
      fetchMock.mockResponseOnce('', { status: 400 })
      const actualRequest = remoteApi.fetchByFilter({ filters, locale })
      return expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should return the response', async () => {
      const items = [createDataEntry()]
      const caasApiItems = { _embedded: { 'rh:doc': items } }
      fetchMock.mockResponseOnce(JSON.stringify(caasApiItems))
      const actualRequest = await remoteApi.fetchByFilter({ filters, locale })
      expect(actualRequest).toBeDefined()
      expect(actualRequest).toStrictEqual({
        page: 1,
        pagesize: 30,
        size: undefined,
        totalPages: undefined,
        items,
      })
    })
    it('should return normalized response if normalized is switched on', async () => {
      const items = [createDataEntry()]
      const caasApiItems = { _embedded: { 'rh:doc': items } }
      fetchMock.mockResponseOnce(JSON.stringify(caasApiItems))
      const actualRequest = await remoteApi.fetchByFilter({
        filters,
        locale,
        normalized: true,
      })
      expect(actualRequest).toBeDefined()

      expect(actualRequest).toStrictEqual({
        page: 1,
        pagesize: 30,
        size: undefined,
        totalPages: undefined,
        items,
        referenceMap: {},
        resolvedReferences: { [items[0]._id]: items[0] },
      })
    })
    it('should return empty array on empty response', async () => {
      // CaaS API omits _embedded attribute in response for empty collections or
      // queries that don't match any documents.
      const emptyResponse = {}
      fetchMock.mockResponseOnce(JSON.stringify(emptyResponse))
      const actualRequest = await remoteApi.fetchByFilter({ filters, locale })
      expect(actualRequest).toBeDefined()
      expect(actualRequest).toStrictEqual({
        page: 1,
        pagesize: 30,
        size: undefined,
        totalPages: undefined,
        items: [],
      })
    })
    it('should return empty array on broken response', async () => {
      const brokenResponse = { _embedded: {} }
      fetchMock.mockResponseOnce(JSON.stringify(brokenResponse))
      const actualRequest = await remoteApi.fetchByFilter({ filters, locale })
      expect(actualRequest).toBeDefined()
      expect(actualRequest).toStrictEqual({
        page: 1,
        pagesize: 30,
        size: undefined,
        totalPages: undefined,
        items: [],
      })
    })
    it('boolean values pass the typecheck', async () => {
      const comparisonFilter: QueryBuilderQuery[] = [
        {
          value: true,
          field: filterField,
          operator: ComparisonQueryOperatorEnum.EQUALS,
        },
      ]
      const arrayFilter: QueryBuilderQuery[] = [
        {
          value: [true, false, true],
          field: filterField,
          operator: ArrayQueryOperatorEnum.ALL,
        },
      ]
      fetchMock.mockResponseOnce(JSON.stringify(json))
      await remoteApi.fetchByFilter({ filters: comparisonFilter, locale })
      fetchMock.mockResponseOnce(JSON.stringify(json))
      await remoteApi.fetchByFilter({ filters: arrayFilter, locale })
      expect(fetchMock).toBeCalledTimes(2)
    })
  })
  describe('fetchNavigation', () => {
    let remoteApi: FSXARemoteApi
    let config: any
    beforeEach(() => {
      config = generateRandomConfig()
      remoteApi = new FSXARemoteApi(config)
    })
    it('should trigger the fetch method with locale', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      const locale = `${Faker.locale}_${Faker.locale}`
      const initialPath = '/'
      remoteApi.fetchNavigation({ initialPath, locale })

      const actualURL = fetchMock.mock.calls[0][0]

      const expectedURL = `${config.navigationServiceURL}/${config.contentMode}.${config.projectID}?depth=99&format=caas&language=${locale}`
      expect(actualURL).toBe(expectedURL)
    })
    it('should trigger the fetch method with initialPath = /', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      const locale = `${Faker.locale}_${Faker.locale}`
      remoteApi.fetchNavigation({ locale })

      const actualURL = fetchMock.mock.calls[0][0]

      const expectedURL = `${config.navigationServiceURL}/${config.contentMode}.${config.projectID}?depth=99&format=caas&language=${locale}`
      expect(actualURL).toBe(expectedURL)
    })
    it('should trigger the fetch method with initialPath', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      const locale = `${Faker.locale}_${Faker.locale}`
      const initialPath = Faker.lorem.words(3).split(' ').join('/')

      remoteApi.fetchNavigation({ initialPath, locale })

      const actualURL = fetchMock.mock.calls[0][0]

      const expectedURL = `${config.navigationServiceURL}/${config.contentMode}.${config.projectID}/by-seo-route/${initialPath}?depth=99&format=caas&all`
      expect(actualURL).toBe(expectedURL)
    })
    it('should throw an not found error when the response is 404', () => {
      fetchMock.mockResponseOnce('', { status: 404 })
      const locale = `${Faker.locale}_${Faker.locale}`
      const actualRequest = remoteApi.fetchNavigation({ locale })
      return expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_FOUND)
    })
    it('should throw an unknown error when the response is not ok', () => {
      fetchMock.mockResponseOnce('', { status: 400 })
      const locale = `${Faker.locale}_${Faker.locale}`
      const actualRequest = remoteApi.fetchNavigation({ locale })
      return expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should return the response', async () => {
      const expectedResponse = Faker.datatype.json()
      fetchMock.mockResponseOnce(JSON.stringify(expectedResponse))
      const locale = `${Faker.locale}_${Faker.locale}`
      const actualResponse = await remoteApi.fetchNavigation({ locale })
      expect(actualResponse).toEqual(expectedResponse)
    })
    it('should throw an unknown error when ? is used in initial path', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      const locale = `${Faker.locale}_${Faker.locale}`
      const initialPath = Faker.lorem.words(3).split(' ').join('/') + '?'
      const actualRequest = remoteApi.fetchNavigation({ initialPath, locale })
      return expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should throw an unknown error when # is used in initial path', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      const locale = `${Faker.locale}_${Faker.locale}`
      const initialPath = Faker.lorem.words(3).split(' ').join('/') + '#'
      const actualRequest = remoteApi.fetchNavigation({ initialPath, locale })
      return expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should trigger the fetch method with encoded params when special chars are used in locale or initial path', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      const locale = "*_'();:@&=+$,?%#[]_*'();:@&=+$,?%#[]"
      const initialPath = "*_'();:@&=+$,%[]"
      remoteApi.fetchNavigation({ initialPath, locale })
      const encodedInitialPath = encodeURI(initialPath)
      const actualURL = fetchMock.mock.calls[0][0]
      const expectedURL = `${config.navigationServiceURL}/${config.contentMode}.${config.projectID}/by-seo-route/${encodedInitialPath}?depth=99&format=caas&all`
      expect(actualURL).toBe(expectedURL)
    })
  })
  describe('fetchProjectProperties', () => {
    let remoteApi: FSXARemoteApi
    let config: any
    beforeEach(() => {
      config = generateRandomConfig()
      remoteApi = new FSXARemoteApi(config)
    })
    it('should trigger fetchByFilter with correct params', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      const localeLanguage = Faker.lorem.word(2).toLowerCase()
      const localeCountry = Faker.lorem.word(2).toUpperCase()
      const locale = localeLanguage + '_' + localeCountry
      remoteApi.fetchProjectProperties({ locale })
      const actualURL = fetchMock.mock.calls[0][0]
      const firstEncodedFilterValue = encodeURIComponent(`{"fsType":{"$eq":"ProjectProperties"}}`)
      const secondEncodedFilterValue = encodeURIComponent(
        `{"locale.language":{"$eq":"${localeLanguage}"}}`
      )
      const thirdEncodedFilterValue = encodeURIComponent(
        `{"locale.country":{"$eq":"${localeCountry}"}}`
      )
      const expectedURL = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?rep=hal&filter=${firstEncodedFilterValue}&filter=${secondEncodedFilterValue}&filter=${thirdEncodedFilterValue}&page=1&pagesize=30`
      expect(actualURL).toBe(expectedURL)
    })
    it('should trigger fetchByFilter with encoded params when special chars in locale are used', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      const localeLanguage = "*'();:@&=+$,?%#[]"
      const localeCountry = "*'();:@&=+$,?%#[]"
      const locale = localeLanguage + '_' + localeCountry
      remoteApi.fetchProjectProperties({ locale })
      const actualURL = fetchMock.mock.calls[0][0]
      const firstEncodedFilterValue = encodeURIComponent(`{"fsType":{"$eq":"ProjectProperties"}}`)
      const secondEncodedFilterValue = encodeURIComponent(
        `{"locale.language":{"$eq":"${localeLanguage}"}}`
      )
      const thirdEncodeddFilterValue = encodeURIComponent(
        `{"locale.country":{"$eq":"${localeCountry}"}}`
      )
      const expectedURL = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?rep=hal&filter=${firstEncodedFilterValue}&filter=${secondEncodedFilterValue}&filter=${thirdEncodeddFilterValue}&page=1&pagesize=30`
      expect(actualURL).toBe(expectedURL)
    })
  })
  describe('additionalHooks', () => {
    const firstId = Faker.datatype.uuid()
    const firstlabel = Faker.datatype.string()
    const firstSeoRoute = `/${firstlabel}/`

    const secondId = Faker.datatype.uuid()
    const secondlabel = Faker.datatype.string()
    const secondSeoRoute = `/${secondlabel}/`

    const thirdId = Faker.datatype.uuid()
    const thirdlabel = Faker.datatype.string()
    const thirdSeoRoute = `/${thirdlabel}/`

    const responseJSON = {
      idMap: {
        [firstId]: {
          id: firstId,
          label: firstlabel,
          seoRoute: firstSeoRoute,
        },
        [secondId]: {
          id: secondId,
          label: secondlabel,
          seoRoute: secondSeoRoute,
        },
        [thirdId]: {
          id: thirdId,
          label: thirdlabel,
          seoRoute: thirdSeoRoute,
        },
      },
      seoRouteMap: {
        [firstSeoRoute]: firstId,
        [secondSeoRoute]: secondId,
        [thirdSeoRoute]: thirdId,
      },
      structure: [
        {
          id: firstId,
          children: [
            {
              id: secondId,
              children: [],
            },
          ],
        },
        {
          id: thirdId,
          children: [],
        },
      ],
    }
  })
})
