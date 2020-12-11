import {
  CaaSMapper,
  QueryBuilder,
  ComparisonQueryOperatorEnum,
  LogicalQueryOperatorEnum,
  Logger,
  LogLevel
} from './'
import { getFetchPageRoute, getFetchGCAPagesRoute, FETCH_BY_FILTER_ROUTE } from '../routes'
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
  MISSING_BASE_URL = 'You do need to specify a baseUrl in proxy mode.',
  MISSING_API_KEY = 'No CaaS-ApiKey was passed via the configuration. [apiKey]',
  MISSING_CAAS_URL = 'No CaaS-URL was passed via the configuration. [caas]',
  MISSING_NAVIGATION_SERVICE_URL = 'No CaaS-URL was passed via the configuration. [navigationService]',
  MISSING_PROJECT_ID = 'No projectId was passed via the configuration. [projectId]',
  MISSING_TENANT_ID = 'No tenantId was passed via the configuration. [tenantId]',
  ILLEGAL_PAGE_SIZE = 'The pagesize parameter must be between 1 and 1000.',
  ILLEGAL_PAGE_NUMBER = 'Given page number must be larger than 0'
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

  async fetchPage(pageId: string, locale: string): Promise<Page | null> {
    /**
     * If we are in proxy mode (client-side), we only want to pipe the input through to the "local" api (server-side) that is able to
     * request and map data from the caas
     */
    if (this.params.mode === 'proxy') {
      const url = `${this.params.baseUrl}${getFetchPageRoute(pageId, locale)}`
      this.logger.info('[Proxy][fetchPage] Requesting:', url, { pageId, locale })
      return (await fetch(url)).json()
    }

    const mapper = new CaaSMapper(
      this,
      locale,
      {
        customMapper: this.params.config.customMapper
      },
      this.logger
    )
    try {
      const url = `${this.buildCaaSUrl()}/${pageId}.${locale}`
      this.logger.info('[Remote][fetchPage] Requesting: ', url, { pageId, locale })
      const response = await fetch(url, {
        headers: this.buildAuthorizationHeaders()
      })
      if (response.status === 200) {
        return mapper.mapPageRefResponse(await response.json())
      }
    } catch (error) {
      this.logger.error(`[Remote][fetchPage] Error:`, error, { pageId, locale })
      return null
    }
    return null
  }

  async fetchGCAPages(locale: string, uid?: string) {
    /**
     * If we are in proxy mode (client-side), we only want to pipe the input through to the "local" api (server-side) that is able to
     * request and map data from the caas
     */
    if (this.params.mode === 'proxy') {
      const url = `${this.params.baseUrl}${getFetchGCAPagesRoute(locale, uid)}`
      this.logger.info('[Proxy][fetchGCAPages] Requesting:', url, { locale, uid })
      return (await fetch(url)).json()
    }
    const filter: LogicalFilter = {
      operator: LogicalQueryOperatorEnum.AND,
      filters: [
        {
          field: 'fsType',
          value: 'GCAPage',
          operator: ComparisonQueryOperatorEnum.EQUALS
        }
      ]
    }
    if (uid)
      filter.filters.unshift({
        field: 'uid',
        operator: ComparisonQueryOperatorEnum.EQUALS,
        value: uid
      })
    this.logger.info('[Remote][fetchGCAPages] Build Filters:', [filter], { locale, uid })
    return await this.fetchByFilter([filter], locale)
  }

  async fetchByFilter(
    filters: QueryBuilderQuery[],
    locale: string,
    page = 1,
    pagesize = 100,
    fetchNested: boolean = true
  ): Promise<(Page | GCAPage | Image | Dataset)[]> {
    if (pagesize < 1 || pagesize > 1000) throw new Error(FSXAApiErrors.ILLEGAL_PAGE_SIZE)
    if (page < 1) throw new Error(FSXAApiErrors.ILLEGAL_PAGE_NUMBER)
    if (this.params.mode === 'proxy') {
      const url = `${this.params.baseUrl}${FETCH_BY_FILTER_ROUTE}?${stringify({
        locale,
        filter: filters,
        page,
        pagesize,
        fetchNested
      })}`
      this.logger.info('[Proxy][fetchByFilter] Requesting:', url, { filters, locale, fetchNested })
      return (await (await fetch(url)).json()) as (Page | GCAPage | Image | Dataset)[]
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
    const url = `${this.buildCaaSUrl()}?${stringify(
      {
        filter: buildFilters,
        page,
        pagesize
      },
      {
        arrayFormat: 'repeat'
      }
    )}`
    this.logger.info('[Remote][fetchByFilter] Constructed Filters:', buildFilters)
    this.logger.info('[Remote][fetchByFilter] Requesting:', url, { filters, locale, fetchNested })
    try {
      const response = await fetch(url, {
        headers: this.buildAuthorizationHeaders()
      })
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
      return mapper.mapFilterResponse(data._embedded['rh:doc'])
    } catch (error) {
      this.logger.error('[Remote][fetchByFilter] Error:', error, { filters, locale, fetchNested })
      return []
    }
  }

  async fetchNavigation(
    initialPath: string | null,
    defaultLocale: string
  ): Promise<NavigationData | null> {
    if (this.params.mode === 'proxy') {
      const url = `${
        this.params.baseUrl
      }/navigation?locale=${defaultLocale}&initialPath=${initialPath || ''}`
      this.logger.info('[Proxy][fetchNavigation] Requesting:', url, { initialPath, defaultLocale })
      return (await fetch(url)).json()
    }
    const url =
      !initialPath || initialPath === '/'
        ? `${this.buildNavigationServiceUrl()}?depth=99&format=caas&language=${defaultLocale}`
        : `${this.buildNavigationServiceUrl()}/by-seo-route/${initialPath}?depth=99&format=caas&all`
    this.logger.info('[Remote][fetchNavigation] Requesting:', url, { initialPath, defaultLocale })
    try {
      const response = await fetch(url, {
        headers: {
          'Accept-Language': '*'
        }
      })
      if (response.status === 200) {
        return response.json()
      }
      throw new Error(
        `Unable to fetch Navigation. HTTP response status=${response.status}, statusText="${response.statusText}"`
      )
    } catch (error) {
      this.logger.info('[Remote][fetchNavigation]Error:', url, { initialPath, defaultLocale })
      return null
    }
  }
}
