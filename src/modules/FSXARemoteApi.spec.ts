import Faker from 'faker'
import { LogLevel } from '.'
import { FSXAContentMode } from '..'
import { FSXAApiErrors } from '../enums'
import { ComparisonFilter, FSXARemoteApiConfig, NavigationItem, QueryBuilderQuery } from '../types'
import { FSXARemoteApi } from './FSXARemoteApi'
import { ComparisonQueryOperatorEnum } from './QueryBuilder'
import 'jest-fetch-mock'
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
      expect(expectedAuthorizationHeaders).toStrictEqual(actualAuthorizationHeaders)
    })
  })
  describe('buildCaaSUrl', () => {
    it('should return the correct caas url', () => {
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl()
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?`
      expect(expectedCaaSUrl).toStrictEqual(actualCaaSUrl)
    })
    it('should return the correct caas url for a remote project', () => {
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const remoteProjectId = config.remotes.remote.id
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ remoteProject: 'remote' })
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${remoteProjectId}.${config.contentMode}.content?`
      expect(expectedCaaSUrl).toStrictEqual(actualCaaSUrl)
    })
    it('should return the correct caas url with a locale but no id', () => {
      const locale = Faker.locale
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ locale })
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?`
      expect(expectedCaaSUrl).toStrictEqual(actualCaaSUrl)
    })
    it('should return the correct caas url when an id is set', () => {
      const id = Faker.datatype.uuid()
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ id })
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content/${id}?`
      expect(expectedCaaSUrl).toStrictEqual(actualCaaSUrl)
    })
    it('should return the correct caas url when additionalParameter are set', () => {
      const additionalParams = { keys: { firstValue: 1, secondValue: 1 } }
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ additionalParams })
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?&keys={"firstValue":1}&keys={"secondValue":1}`
      expect(expectedCaaSUrl).toStrictEqual(actualCaaSUrl)
    })
    it('should return the correct caas url when id, locale and additionalParameter are set', () => {
      const id = Faker.datatype.uuid()
      const locale = Faker.locale
      const additionalParams = { keys: { firstValue: 1, secondValue: 1 }, sort: { firstName: 1 } }
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ id, locale, additionalParams })
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content/${id}.${locale}?&keys={"firstValue":1}&keys={"secondValue":1}&sort={"firstName":1}`
      expect(expectedCaaSUrl).toStrictEqual(actualCaaSUrl)
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
      const firstFilter = `&filter={"${firstField}":{"${firstOperator}":"${firstValue}"}}`
      const secondFilter = `&filter={"${secondField}":{"${secondOperator}":"${secondValue}"}}`
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?${firstFilter}${secondFilter}`
      expect(expectedCaaSUrl).toStrictEqual(actualCaaSUrl)
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
      const additionalParamsQuery = `&keys={"identifier":1}`
      const filterQuery = `&filter={"${filterField}":{"${filterOperator}":"${filterValue}"}}`
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?${additionalParamsQuery}${filterQuery}`
      expect(expectedCaaSUrl).toStrictEqual(actualCaaSUrl)
    })
    it('should return the correct caas url when page is set', () => {
      const page = Faker.datatype.number()
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ page })
      const pageQuery = `&page=${page}`
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?${pageQuery}`
      expect(expectedCaaSUrl).toStrictEqual(actualCaaSUrl)
    })
    it('should return the correct caas url when pagesize is set', () => {
      const pagesize = Faker.datatype.number()
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)
      const actualCaaSUrl = remoteApi.buildCaaSUrl({ pagesize })
      const pagesizeQuery = `&pagesize=${pagesize}`
      const expectedCaaSUrl = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?${pagesizeQuery}`
      expect(expectedCaaSUrl).toStrictEqual(actualCaaSUrl)
    })
    it('should throw an error for an invalid remote project', () => {
      const config = generateRandomConfig()
      const remoteApi = new FSXARemoteApi(config)

      expect(() => {
        remoteApi.buildCaaSUrl({ remoteProject: 'unknown project' })
      }).toThrow(FSXAApiErrors.UNKNOWN_REMOTE)
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
      const locale = Faker.locale
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
      locale = Faker.locale
      config = generateRandomConfig()
      remoteApi = new FSXARemoteApi(config)
    })
    it('should trigger the fetch method with the correct params', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      remoteApi.fetchElement({ id: uuid, locale })
      const actualURL = fetchMock.mock.calls[0][0]
      const expectedURL = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content/${uuid}.${locale}?`
      expect(expectedURL).toBe(actualURL)
    })
    it('should throw an not found error when the response is 404', () => {
      fetchMock.mockResponseOnce('', { status: 404 })
      const actualRequest = remoteApi.fetchElement({ id: uuid, locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_FOUND)
    })
    it('should throw an unauthorized error when the response is 401', () => {
      fetchMock.mockResponseOnce('', { status: 401 })
      const actualRequest = remoteApi.fetchElement({ id: uuid, locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_AUTHORIZED)
    })
    it('should throw an unknown error when the response is not ok', () => {
      fetchMock.mockResponseOnce('', { status: 400 })
      const actualRequest = remoteApi.fetchElement({ id: uuid, locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should return the response', async () => {
      const json = Faker.datatype.json()
      fetchMock.mockResponse(json)
      const actualRequest = await remoteApi.fetchElement({ id: uuid, locale })
      expect(actualRequest).toBeDefined()
      expect(actualRequest).toStrictEqual(JSON.parse(json))
    })
    it('should return a mapped response when additionalParams are set', async () => {
      const json = Faker.datatype.json()
      fetchMock.mockResponse(json)
      const actualRequest = await remoteApi.fetchElement({
        id: uuid,
        locale,
        additionalParams: { depth: 99 },
      })
      expect(actualRequest).toBeDefined()
      expect(actualRequest).toStrictEqual(JSON.parse(json))
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
    it('should trigger the fetch method with the correct params', () => {
      fetchMock.mockResponseOnce(JSON.stringify(json))
      remoteApi.fetchByFilter({ filters, locale })
      const actualURL = fetchMock.mock.calls[0][0]
      const expectedURL = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?&filter={"${filterField}":{"$eq":"${filterValue}"}}&filter={"locale.language":{"$eq":"${localeLanguage}"}}&filter={"locale.country":{"$eq":"${localeCountry}"}}&page=1&pagesize=30`
      expect(expectedURL).toBe(actualURL)
    })
    it('should throw an unauthorized error when the response is 401', () => {
      fetchMock.mockResponseOnce('', { status: 401 })
      const actualRequest = remoteApi.fetchByFilter({ filters, locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_AUTHORIZED)
    })
    it('should throw an unknown error when the response is not ok', () => {
      fetchMock.mockResponseOnce('', { status: 400 })
      const actualRequest = remoteApi.fetchByFilter({ filters, locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should return the response', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(json))
      const actualRequest = await remoteApi.fetchByFilter({ filters, locale })
      expect(actualRequest).toBeDefined()
      expect(actualRequest).toStrictEqual(json._embedded['rh:doc'])
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
      const locale = Faker.locale
      const initialPath = '/'
      remoteApi.fetchNavigation({ initialPath, locale })

      const actualURL = fetchMock.mock.calls[0][0]

      const expectedURL = `${config.navigationServiceURL}/${config.contentMode}.${config.projectID}?depth=99&format=caas&language=${locale}`
      expect(expectedURL).toBe(actualURL)
    })
    it('should trigger the fetch method with initialPath = /', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      const locale = Faker.locale
      remoteApi.fetchNavigation({ locale })

      const actualURL = fetchMock.mock.calls[0][0]

      const expectedURL = `${config.navigationServiceURL}/${config.contentMode}.${config.projectID}?depth=99&format=caas&language=${locale}`
      expect(expectedURL).toBe(actualURL)
    })
    it('should trigger the fetch method with initialPath', () => {
      fetchMock.mockResponseOnce(Faker.datatype.json())
      const locale = Faker.locale
      const initialPath = Faker.lorem.words(3).split(' ').join('/')

      remoteApi.fetchNavigation({ initialPath, locale })

      const actualURL = fetchMock.mock.calls[0][0]

      const expectedURL = `${config.navigationServiceURL}/${config.contentMode}.${config.projectID}/by-seo-route/${initialPath}?depth=99&format=caas`
      expect(expectedURL).toBe(actualURL)
    })
    it('should throw an not found error when the response is 404', () => {
      fetchMock.mockResponseOnce('', { status: 404 })
      const locale = Faker.locale
      const actualRequest = remoteApi.fetchNavigation({ locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.NOT_FOUND)
    })
    it('should throw an unknown error when the response is not ok', () => {
      fetchMock.mockResponseOnce('', { status: 400 })
      const locale = Faker.locale
      const actualRequest = remoteApi.fetchNavigation({ locale })
      expect(actualRequest).rejects.toThrow(FSXAApiErrors.UNKNOWN_ERROR)
    })
    it('should return the response', async () => {
      const expectedResponse = Faker.datatype.json()
      fetchMock.mockResponseOnce(JSON.stringify(expectedResponse))
      const locale = Faker.locale
      const actualResponse = await remoteApi.fetchNavigation({ locale })
      expect(expectedResponse).toEqual(actualResponse)
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

      const expectedURL = `${config.caasURL}/${config.tenantID}/${config.projectID}.${config.contentMode}.content?&filter={"fsType":{"$eq":"ProjectProperties"}}&filter={"locale.language":{"$eq":"${localeLanguage}"}}&filter={"locale.country":{"$eq":"${localeCountry}"}}&page=1&pagesize=30`
      expect(expectedURL).toBe(actualURL)
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
    describe('navigationFilter', () => {
      const navigationFilter = (route: NavigationItem): boolean =>
        route.label === firstlabel || route.label === secondlabel
      const config = { ...generateRandomConfig(), navigationFilter }
      const remoteApi = new FSXARemoteApi(config)
      let navigation: any
      beforeAll(async () => {
        fetchMock.mockResponseOnce(JSON.stringify(responseJSON))
        navigation = await remoteApi.fetchNavigation({ locale: Faker.locale })
      })
      it('should not be the same json', () => {
        expect(navigation).not.toEqual(responseJSON)
      })
      it('should have correctly filtered the idMap ', async () => {
        const idMapLength = Object.keys(navigation.idMap).length
        const firstEntry = navigation.idMap[firstId]
        const secondEntry = navigation.idMap[secondId]
        const thirdEntry = navigation.idMap[thirdId]
        expect(idMapLength).toEqual(2)
        expect(firstEntry).toBeTruthy()
        expect(secondEntry).toBeTruthy()
        expect(thirdEntry).toBeFalsy()
      })
      it('should have correctly filtered the seoRouteMap', async () => {
        const idMapLength = Object.keys(navigation.seoRouteMap).length
        const firstEntry = navigation.seoRouteMap[firstSeoRoute]
        const secondEntry = navigation.seoRouteMap[secondSeoRoute]
        const thirdEntry = navigation.seoRouteMap[thirdSeoRoute]

        expect(idMapLength).toEqual(2)
        expect(firstEntry).toBeTruthy()
        expect(secondEntry).toBeTruthy()
        expect(thirdEntry).toBeFalsy()
      })
      it('should have correctly filtered the structure', async () => {
        const idMapLength = navigation.structure.length
        const firstEntry = navigation.structure.find((item: any) => item.id === firstId)
        const secondEntry = firstEntry.children.find((item: any) => item.id === secondId)
        const thirdEntry = navigation.structure.find((item: any) => item.id === thirdId)

        expect(idMapLength).toEqual(1)
        expect(firstEntry).toBeTruthy()
        expect(secondEntry).toBeTruthy()
        expect(thirdEntry).toBeFalsy()
      })
    })
    describe('preFilterFetch', () => {
      it('should provide data which is accessable in navigationFilter', (done) => {
        const json = {
          idMap: {
            1: {},
          },
        }

        const randomJson = Faker.datatype.json()
        const navigationFilter = (_: any, __: any, data: any) => {
          try {
            expect(data).toBe(randomJson)
            done()
          } catch (e) {
            done(e)
          }
          return true
        }
        const preFilterFetch = (data: any) => Promise.resolve(data)
        const config = {
          ...generateRandomConfig(),
          navigationFilter,
          preFilterFetch,
        } as FSXARemoteApiConfig
        fetchMock.mockResponseOnce(JSON.stringify(json))
        const remoteApi = new FSXARemoteApi(config)
        remoteApi.fetchNavigation({
          locale: Faker.locale,
          authData: randomJson,
        })
      })
    })
  })
})
