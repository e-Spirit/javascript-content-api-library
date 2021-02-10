import { CaaSMapper, QueryBuilder, ComparisonQueryOperatorEnum, Logger, LogLevel } from './'
import { getFetchElementRoute, FETCH_BY_FILTER_ROUTE } from '../routes'
import {
  CaasApi_FilterResponse,
  Dataset,
  FSXAApiParams,
  FSXAConfiguration,
  GCAPage,
  Image,
  LogicalFilter,
  NavigationData,
  Page,
  QueryBuilderQuery
} from '../types'
import { stringify } from 'qs'

export enum FSXAContentMode {
  PREVIEW = 'preview',
  RELEASE = 'release'
}

export enum FSXAApiErrors {
  UNKNOWN_CONTENT_MODE = 'The content mode must be preview or release.',
  UNKNOWN_API_MODE = 'The api mode must be remote or proxy.',
  UNKNOWN_ERROR = 'An unknown error occured. Please check the logs for more information',
  MISSING_BASE_URL = 'You do need to specify a baseUrl in proxy mode.',
  MISSING_API_KEY = 'No CaaS-ApiKey was passed via the configuration. [apiKey]',
  MISSING_CAAS_URL = 'No CaaS-URL was passed via the configuration. [caas]',
  MISSING_NAVIGATION_SERVICE_URL = 'No CaaS-URL was passed via the configuration. [navigationService]',
  MISSING_PROJECT_ID = 'No projectId was passed via the configuration. [projectId]',
  MISSING_TENANT_ID = 'No tenantId was passed via the configuration. [tenantId]',
  ILLEGAL_PAGE_SIZE = 'The pagesize parameter must be between 1 and 1000.',
  ILLEGAL_PAGE_NUMBER = 'Given page number must be larger than 0',
  NOT_AUTHORIZED = 'Your passed ApiKey has no access to the requested resource',
  NOT_FOUND = 'Resource could not be found'
}

export class FSXAApi {
  public logger: Logger
  public mode!: FSXAContentMode
  protected params!: FSXAApiParams
  protected queryBuilder: QueryBuilder

  constructor(mode: FSXAContentMode, params: FSXAApiParams, logLevel: LogLevel = LogLevel.ERROR) {
    this.logger = new Logger(logLevel)
    this.queryBuilder = new QueryBuilder(this.logger)
    this.setConfiguration(mode, params)
  }

  setConfiguration(mode: FSXAContentMode, params: FSXAApiParams) {
    // validate configuration
    if (!Object.values(FSXAContentMode).includes(mode))
      throw new Error(FSXAApiErrors.UNKNOWN_CONTENT_MODE)
    if (params.mode === 'proxy') {
      if (!params.baseUrl) throw new Error(FSXAApiErrors.MISSING_BASE_URL)
    } else if (params.mode === 'remote') {
      if (!params.config.apiKey) throw new Error(FSXAApiErrors.MISSING_API_KEY)
      if (!params.config.caas) throw new Error(FSXAApiErrors.MISSING_CAAS_URL)
      if (!params.config.navigationService)
        throw new Error(FSXAApiErrors.MISSING_NAVIGATION_SERVICE_URL)
      if (!params.config.projectId) throw new Error(FSXAApiErrors.MISSING_PROJECT_ID)
      if (!params.config.tenantId) throw new Error(FSXAApiErrors.MISSING_TENANT_ID)
    } else throw new Error(FSXAApiErrors.UNKNOWN_API_MODE)

    // set configuration
    this.mode = mode
    this.params = params
  }

  get config(): FSXAConfiguration | null {
    if (this.params.mode === 'proxy') return null
    return this.params.config
  }

  buildAuthorizationHeaders(): {} {
    if (this.params.mode === 'proxy') return {}
    return {
      authorization: `apikey="${this.params.config.apiKey}"`
    }
  }

  buildCaaSUrl(): string {
    return this.params.mode === 'proxy'
      ? ''
      : `${this.params.config.caas}/${this.params.config.tenantId}/${this.params.config.projectId}.${this.mode}.content`
  }

  buildNavigationServiceUrl(): string {
    return this.params.mode === 'proxy'
      ? ''
      : `${this.params.config.navigationService}/${this.mode}.${this.params.config.projectId}`
  }

  async fetchElement(
    id: string,
    locale: string,
    additionalParams: Record<'keys' | string, any> = {},
    maxReferenceDepth: number = 3
  ): Promise<Page | GCAPage | Dataset | Image | any | null> {
    /**
     * If we are in proxy mode (client-side), we only want to pipe the input through to the "local" api (server-side) that is able to
     * request and map data from the caas
     */
    if (this.params.mode === 'proxy') {
      const url = `${this.params.baseUrl}${getFetchElementRoute(id)}`
      this.logger.info('[Proxy][fetchElement] Requesting:', url, {
        id,
        locale,
        additionalParams
      })
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locale,
          additionalParams
        })
      })
      if (!response.ok) {
        if (response.status === 404) {
          this.logger.error(`[Proxy][fetchElement] Error: ${FSXAApiErrors.NOT_FOUND}`)
          throw new Error(FSXAApiErrors.NOT_FOUND)
        } else if (response.status === 401) {
          this.logger.error(`[Proxy][fetchElement] Error: ${FSXAApiErrors.NOT_AUTHORIZED}.`)
          throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
        } else {
          this.logger.error(
            `[Proxy][fetchElement] Error: ${FSXAApiErrors.UNKNOWN_ERROR}.`,
            response.status,
            response.statusText,
            await response.text()
          )
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
        }
      }
      return response.json()
    }

    const mapper = new CaaSMapper(
      this,
      locale,
      {
        customMapper: this.params.config.customMapper
      },
      this.logger
    )
    const url = `${this.buildCaaSUrl()}/${id}.${locale}?${
      additionalParams ? stringify(this.buildRestheartParams(additionalParams)) : ''
    }`
    this.logger.info('[Remote][fetchElement] Requesting: ', url, {
      id,
      locale,
      additionalParams
    })
    const response = await fetch(url, {
      headers: this.buildAuthorizationHeaders()
    })
    if (!response.ok) {
      if (response.status === 404) {
        this.logger.error(`[Remote][fetchElement] Error: ${FSXAApiErrors.NOT_FOUND}`)
        throw new Error(FSXAApiErrors.NOT_FOUND)
      } else if (response.status === 401) {
        this.logger.error(`[Remote][fetchElement] Error: ${FSXAApiErrors.NOT_AUTHORIZED}.`)
        throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
      } else {
        this.logger.error(
          `[Remote][fetchElement] Error: ${FSXAApiErrors.UNKNOWN_ERROR}.`,
          response.status,
          response.statusText,
          await response.text()
        )
        throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }
    // we only can map the response if the keys parameter is not specified
    return additionalParams.keys
      ? response.json()
      : mapper.mapElementResponse(await response.json(), maxReferenceDepth)
  }

  /**
   * Build your own custom query against the CaaS
   * @param filters your custom filter queries that will be transformed to restheart filters
   * @param locale the locale the items should be queried in
   * @param page page that should be fetched
   * @param pagesize the number of elements that should be fetched
   * @param additionalParams You can specify additional params that will be appended to the CaaS-Url. Be aware that the response is not mapped, if you pass the keys-parameter
   * @param maxReferenceDepth how many levels of references should be resolved, 0=none
   */
  async fetchByFilter(
    filters: QueryBuilderQuery[],
    locale: string,
    page = 1,
    pagesize = 100,
    // you can pass in all available restheart-parameters that are not available through our api
    // Using the keys parameter will remove the default mapping mechanism
    additionalParams: Record<'keys' | string, any> = {},
    maxReferenceDepth: number = 3
  ): Promise<(Page | GCAPage | Image | Dataset)[]> {
    if (pagesize < 1 || pagesize > 1000) throw new Error(FSXAApiErrors.ILLEGAL_PAGE_SIZE)
    if (page < 1) throw new Error(FSXAApiErrors.ILLEGAL_PAGE_NUMBER)
    if (this.params.mode === 'proxy') {
      const url = `${this.params.baseUrl}${FETCH_BY_FILTER_ROUTE}`
      this.logger.info('[Proxy][fetchByFilter] Requesting:', url, {
        filters,
        locale,
        page,
        pagesize,
        additionalParams
      })
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: filters,
          locale,
          page,
          pagesize,
          additionalParams
        })
      })
      if (!response.ok) {
        if (response.status === 401) {
          this.logger.error(`[Proxy][fetchByFilter] Error: ${FSXAApiErrors.NOT_AUTHORIZED}.`)
          throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
        } else {
          this.logger.error(
            `[Proxy][fetchByFilter] Error: ${FSXAApiErrors.UNKNOWN_ERROR}.`,
            response.status,
            response.statusText,
            await response.text()
          )
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
        }
      }
      return response.json()
    }
    const buildFilters = [
      ...filters.map(filter => JSON.stringify(this.queryBuilder.build(filter))),
      JSON.stringify(
        this.queryBuilder.build({
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: locale.split('_')[0],
          field: 'locale.language'
        })
      )
    ]
    const buildAdditionalParams: Record<string, any> = {}
    Object.keys(additionalParams).forEach(key => {
      if (Array.isArray(additionalParams[key])) {
        buildAdditionalParams[key] = additionalParams[key].map(JSON.stringify)
      } else {
        buildAdditionalParams[key] = additionalParams[key]
      }
    })
    // we need to encode array
    const url = `${this.buildCaaSUrl()}?${stringify(
      {
        filter: buildFilters,
        page,
        pagesize,
        ...buildAdditionalParams
      },
      {
        arrayFormat: 'repeat'
      }
    )}`
    this.logger.info('[Remote][fetchByFilter] Constructed Filters:', buildFilters)
    this.logger.info('[Remote][fetchByFilter] Requesting:', url, {
      filters,
      locale,
      page,
      pagesize,
      additionalParams
    })
    const response = await fetch(url, {
      headers: this.buildAuthorizationHeaders()
    })
    if (!response.ok) {
      if (response.status === 401) {
        this.logger.error(`[Remote][fetchByFilter] Error: ${FSXAApiErrors.NOT_AUTHORIZED}.`)
        throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
      } else {
        this.logger.error(
          `[Remote][fetchByFilter] Error: ${FSXAApiErrors.UNKNOWN_ERROR}.`,
          response.status,
          response.statusText,
          await response.text()
        )
        throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }
    const mapper = new CaaSMapper(
      this,
      locale,
      {
        customMapper: this.params.config.customMapper
      },
      this.logger
    )
    const data: CaasApi_FilterResponse = await response.json()
    if (!data._embedded) {
      this.logger.error('[Remote][fetchByFilter] Returned empty result')
      return []
    }
    // we cannot ensure that the response can be mapped through or mapping algorithm if the keys attribute is set
    // so we will disable it
    if (additionalParams.keys) {
      return data._embedded['rh:doc']
    }
    return mapper.mapFilterResponse(data._embedded['rh:doc'], maxReferenceDepth)
  }

  async fetchNavigation(
    initialPath: string | null,
    defaultLocale: string
  ): Promise<NavigationData | null> {
    const encodedInitialPath = initialPath ? encodeURI(initialPath) : null
    if (this.params.mode === 'proxy') {
      const url = `${this.params.baseUrl}/navigation`
      this.logger.info('[Proxy][fetchNavigation] Requesting:', url, {
        encodedInitialPath,
        defaultLocale
      })
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initialPath,
          locale: defaultLocale
        })
      })
      if (!response.ok) {
        if (response.status === 404) {
          this.logger.error(`[Proxy][fetchNavigation] Error: ${FSXAApiErrors.NOT_FOUND}.`)
          throw new Error(FSXAApiErrors.NOT_FOUND)
        } else {
          this.logger.error(
            `[Proxy][fetchNavigation] Error: ${FSXAApiErrors.UNKNOWN_ERROR}.`,
            response.status,
            response.statusText,
            await response.text()
          )
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
        }
      }
      return response.json()
    }
    const url =
      !encodedInitialPath || encodedInitialPath === '/'
        ? `${this.buildNavigationServiceUrl()}?depth=99&format=caas&language=${defaultLocale}`
        : `${this.buildNavigationServiceUrl()}/by-seo-route/${encodedInitialPath}?depth=99&format=caas&all`
    this.logger.info('[Remote][fetchNavigation] Requesting:', url, {
      encodedInitialPath,
      defaultLocale
    })
    const response = await fetch(url, {
      headers: {
        'Accept-Language': '*'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        this.logger.error(`[Remote][fetchNavigation] Error: ${FSXAApiErrors.NOT_FOUND}.`)
        throw new Error(FSXAApiErrors.NOT_FOUND)
      } else {
        this.logger.error(
          `[Remote][fetchNavigation] Error: ${FSXAApiErrors.UNKNOWN_ERROR}.`,
          response.status,
          response.statusText,
          await response.text()
        )
        throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }
    return response.json()
  }

  private buildRestheartParams(params: Record<'keys' | string, any>) {
    const result: Record<string, any> = {}
    Object.keys(params).forEach(key => {
      if (Array.isArray(params[key])) {
        result[key] = params[key].map(JSON.stringify)
      } else {
        result[key] = params[key]
      }
    })
    return result
  }
}
