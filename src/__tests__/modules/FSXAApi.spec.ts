import { FSXAApi, FSXAApiErrors, FSXAContentMode } from '../../modules'
import fetchMock, { FetchMock } from 'jest-fetch-mock'
import { FSXAConfiguration } from '../../types'

const configuration: FSXAConfiguration = {
  apiKey: 'apiKey',
  caas: 'caas',
  navigationService: 'navigationService',
  projectId: 'projectId',
  tenantId: 'tenantId'
}

describe('FSXAApi', () => {
  describe('validate configuration', () => {
    it('should throw an error if wrong content mode is set', () => {
      expect(
        () =>
          // @ts-ignore
          new FSXAApi('foobar', {
            config: configuration,
            mode: 'remote'
          })
      ).toThrowError(FSXAApiErrors.UNKNOWN_CONTENT_MODE)
    })

    it('should throw an error if an unknown api mode is passed', () => {
      expect(
        () =>
          new FSXAApi(FSXAContentMode.PREVIEW, {
            // @ts-ignore
            mode: 'foobar'
          })
      ).toThrowError(FSXAApiErrors.UNKNOWN_API_MODE)
    })

    it('should throw an error if no base url is passed in proxy mode', () => {
      expect(
        () =>
          // @ts-ignore
          new FSXAApi(FSXAContentMode.PREVIEW, {
            mode: 'proxy'
          })
      ).toThrowError(FSXAApiErrors.MISSING_BASE_URL)
    })

    it('should throw an error if no apiKey is passed via configuration', () => {
      expect(
        () =>
          new FSXAApi(FSXAContentMode.PREVIEW, {
            mode: 'remote',
            config: {
              ...configuration,
              apiKey: ''
            }
          })
      ).toThrowError(FSXAApiErrors.MISSING_API_KEY)
    })

    it('should throw an error if no caas url is passed via configuration', () => {
      expect(
        () =>
          new FSXAApi(FSXAContentMode.PREVIEW, {
            mode: 'remote',
            config: {
              ...configuration,
              caas: ''
            }
          })
      ).toThrowError(FSXAApiErrors.MISSING_CAAS_URL)
    })

    it('should throw an error if no navigationService url is passed via configuration', () => {
      expect(
        () =>
          new FSXAApi(FSXAContentMode.PREVIEW, {
            mode: 'remote',
            config: {
              ...configuration,
              navigationService: ''
            }
          })
      ).toThrowError(FSXAApiErrors.MISSING_NAVIGATION_SERVICE_URL)
    })

    it('should throw an error if no projectId is passed via configuration', () => {
      expect(
        () =>
          new FSXAApi(FSXAContentMode.PREVIEW, {
            mode: 'remote',
            config: {
              ...configuration,
              projectId: ''
            }
          })
      ).toThrowError(FSXAApiErrors.MISSING_PROJECT_ID)
    })

    it('should throw an error if no tenantId is passed via configuration', () => {
      expect(
        () =>
          new FSXAApi(FSXAContentMode.PREVIEW, {
            mode: 'remote',
            config: {
              ...configuration,
              tenantId: ''
            }
          })
      ).toThrowError(FSXAApiErrors.MISSING_TENANT_ID)
    })
  })

  describe('buildCaaSURl', () => {
    it('should return an empty string if proxy mode is set', () => {
      expect(
        new FSXAApi(FSXAContentMode.PREVIEW, { mode: 'proxy', baseUrl: 'localhost' }).buildCaaSUrl()
      ).toEqual('')
    })

    it('should create correct caas url schema', () => {
      expect(
        new FSXAApi(FSXAContentMode.PREVIEW, {
          mode: 'remote',
          config: configuration
        }).buildCaaSUrl()
      ).toEqual(
        `${configuration.caas}/tenantId/${configuration.projectId}.${FSXAContentMode.PREVIEW}.content`
      )
    })
  })

  describe('buildNavigationServiceUrl', () => {
    it('should return an empty string if proxy mode is set', () => {
      expect(
        new FSXAApi(FSXAContentMode.PREVIEW, {
          mode: 'proxy',
          baseUrl: 'localhost'
        }).buildNavigationServiceUrl()
      ).toEqual('')
    })

    it('should create correct navigationservice url schema', () => {
      expect(
        new FSXAApi(FSXAContentMode.PREVIEW, {
          mode: 'remote',
          config: configuration
        }).buildNavigationServiceUrl()
      ).toEqual(`${configuration.navigationService}/preview.${configuration.projectId}`)
    })
  })

  describe('buildAuthorizationHeaders', () => {
    it('should return an empty object if proxy mode is set', () => {
      expect(
        new FSXAApi(FSXAContentMode.PREVIEW, {
          mode: 'proxy',
          baseUrl: 'localhost'
        }).buildAuthorizationHeaders()
      ).toEqual({})
    })

    it('should create correct authorization headers object', () => {
      expect(
        new FSXAApi(FSXAContentMode.PREVIEW, {
          mode: 'remote',
          config: configuration
        }).buildAuthorizationHeaders()
      ).toEqual({ authorization: `apikey="${configuration.apiKey}"` })
    })
  })

  describe('fetchPage', async () => {
    it('should call local url in proxy-mode', async () => {
      await testForLocalUrl(api => api.fetchElement('foobar', 'de_DE'))
    })
  })

  describe('fetchNavigation', async () => {
    it('should call local url in proxy-mode', async () => {
      await testForLocalUrl(api => api.fetchNavigation(null, 'de_DE'))
    })

    it('should pass extraHeaders', async () => {
      await testForLocalUrl(
        api => api.fetchNavigation(null, 'de_DE', { 'x-test': 'foobar' }),
        fetch => {
          const request = fetch.mock.calls[0][1]
          const headers = request && request['headers']
          expect(headers && 'x-test' in headers && headers['x-test']).toBe('foobar')
        }
      )
    })
  })
})

const testForLocalUrl = async (
  method: (api: FSXAApi) => Promise<any>,
  validate?: (fetch: FetchMock) => void
) => {
  fetchMock.enableMocks()
  const api = new FSXAApi(FSXAContentMode.PREVIEW, {
    mode: 'proxy',
    baseUrl: 'http://localhost:3000'
  })
  const mockedFetch = fetch as FetchMock
  mockedFetch.mockReset()
  mockedFetch.mockResponseOnce(JSON.stringify({}))
  await method(api)
  expect(mockedFetch).toHaveBeenCalledTimes(1)
  expect(mockedFetch.mock.calls[0][0]).toMatch(/localhost/g)
  validate && validate(fetchMock)
  fetchMock.disableMocks()
}
