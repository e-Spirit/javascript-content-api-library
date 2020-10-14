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
  MISSING_TENANT_ID = 'No tenantId was passed via the configuration. [tenantId]'
}

export class FSXAApi {
  public mode!: FSXAContentMode
  protected params!: FSXAApiParams
  protected logger: Logger
  protected queryBuilder: QueryBuilder = new QueryBuilder()

  constructor(mode: FSXAContentMode, params: FSXAApiParams, logLevel: LogLevel = LogLevel.ERROR) {
    this.logger = new Logger(logLevel)
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
    if (this.params.mode === 'proxy')
      return (await fetch(`${this.params.baseUrl}${getFetchPageRoute(pageId, locale)}`)).json()

    const mapper = new CaaSMapper(this, locale, this.params.config.mapDataQuery)
    try {
      const response = await fetch(`${this.buildCaaSUrl()}/${pageId}.${locale}`, {
        headers: this.buildAuthorizationHeaders()
      })
      if (response.status === 200) {
        return mapper.mapPageRefResponse(await response.json())
      }
    } catch (error) {
      this.logger.error('Error fetching page', error)
      return null
    }
    return null
  }

  async fetchGCAPages(locale: string, uid?: string) {
    /**
     * If we are in proxy mode (client-side), we only want to pipe the input through to the "local" api (server-side) that is able to
     * request and map data from the caas
     */
    if (this.params.mode === 'proxy')
      return (await fetch(`${this.params.baseUrl}${getFetchGCAPagesRoute(locale, uid)}`)).json()
    const filter: LogicalFilter = {
      operator: LogicalQueryOperatorEnum.AND,
      filters: [
        {
          field: 'fsType',
          value: 'GCAPage',
          operator: ComparisonQueryOperatorEnum.EQUALS
        },
        {
          field: 'locale.language',
          value: locale.split('_')[0],
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
    return await this.fetchByFilter([filter], locale)
  }

  async fetchByFilter(
    filters: QueryBuilderQuery[],
    locale: string,
    fetchNested: boolean = true
  ): Promise<(Page | GCAPage | Image | Dataset)[]> {
    if (this.params.mode === 'proxy') {
      const response = await fetch(
        `${this.params.baseUrl}${FETCH_BY_FILTER_ROUTE}?${stringify({
          locale,
          filter: filters,
          fetchNested
        })}`
      )
      return (await response.json()) as (Page | GCAPage | Image | Dataset)[]
    }
    const url = `${this.buildCaaSUrl()}?${stringify(
      {
        filter: [
          ...filters.map(filter => JSON.stringify(this.queryBuilder.build(filter))),
          {
            operator: ComparisonQueryOperatorEnum.EQUALS,
            value: locale.split('–')[0],
            field: 'locale.language'
          }
        ]
      },
      {
        arrayFormat: 'repeat'
      }
    )}`
    const response = await fetch(url, {
      headers: this.buildAuthorizationHeaders()
    })
    const mapper = new CaaSMapper(this, locale, this.params.config.mapDataQuery, fetchNested)
    const data: CaasApi_FilterResponse = await response.json()
    return mapper.mapFilterResponse(data._embedded['rh:doc'])
  }

  async fetchNavigation(
    initialPath: string | null,
    defaultLocale: string
  ): Promise<NavigationData> {
    if (this.params.mode === 'proxy') {
      return (
        await fetch(
          `${this.params.baseUrl}/navigation?locale=${defaultLocale}&initialPath=${initialPath ||
            ''}`
        )
      ).json()
    }
    const response = await fetch(
      !initialPath || initialPath === '/'
        ? `${this.buildNavigationServiceUrl()}?depth=99&format=caas&language=${defaultLocale}`
        : `${this.buildNavigationServiceUrl()}/by-seo-route/${initialPath}?depth=99&format=caas&all`,
      {
        headers: {
          'Accept-Language': '*'
        }
      }
    )
    if (response.status === 200) {
      return response.json()
    }
    throw new Error(
      `Unable to fetch Navigation. HTTP response status=${response.status}, statusText="${response.statusText}"`
    )
  }

  async fetchMediaReference(url: string) {
    const response = await fetch(url, {
      headers: this.buildAuthorizationHeaders()
    })
    return response.json()
  }
}
