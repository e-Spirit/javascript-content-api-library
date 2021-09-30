import { CaaSMapper, Logger } from '.'
import {
  Dataset,
  GCAPage,
  NavigationData,
  Page,
  Image,
  CustomMapper,
  QueryBuilderQuery,
  FetchNavigationParams,
  FetchElementParams,
  FetchByFilterParams,
  navigationFilter,
  preFilterFetch,
  FSXARemoteApiConfig,
} from '../types'
import { removeFromIdMap, removeFromSeoRouteMap, removeFromStructure } from '../utils'
import { FSXAApiErrors, FSXAContentMode } from './../enums'
import { LogLevel } from './Logger'
import { ComparisonQueryOperatorEnum, QueryBuilder } from './QueryBuilder'

type buildNavigationServiceURLParams = {
  locale?: string
  initialPath?: string
}

type buildCaaSUrlParams = {
  filters?: QueryBuilderQuery[]
  locale?: string
  page?: number
  pagesize?: number
  additionalParams?: Record<'keys' | string, any>
  remoteProject?: string
  id?: string
}

export class FSXARemoteApi {
  public mode = 'remote'
  private _apikey: string = this.apikey
  private _caasURL: string = this.caasURL
  private _navigationServiceURL: string = this.navigationServiceURL
  private _tenantID: string = this.tenantID
  private _projectID: string = this.projectID
  private _remotes: Record<string, { id: string; locale: string }> = this.remotes
  private _contentMode: 'preview' | 'release' = this.contentMode
  private _customMapper?: CustomMapper
  private _queryBuilder: QueryBuilder
  private _logger: Logger
  private _navigationFilter?: navigationFilter
  private _preFilterFetch?: preFilterFetch
  private _logLevel: LogLevel

  constructor({
    apikey,
    caasURL,
    navigationServiceURL,
    tenantID,
    projectID,
    remotes,
    contentMode,
    customMapper,
    navigationFilter,
    preFilterFetch,
    logLevel = 3,
  }: FSXARemoteApiConfig) {
    this.apikey = apikey
    this.caasURL = caasURL
    this.navigationServiceURL = navigationServiceURL
    this.tenantID = tenantID
    this.projectID = projectID
    this.remotes = remotes || {}
    this.contentMode = contentMode
    this._customMapper = customMapper
    this._logLevel = logLevel
    this._logger = new Logger(logLevel, 'FSXARemoteApi')
    this._queryBuilder = new QueryBuilder(this._logger)
    this._navigationFilter = navigationFilter
    this._preFilterFetch = preFilterFetch
  }

  get authorizationHeader() {
    return {
      authorization: `apikey="${this.apikey}"`,
    }
  }

  private getRemoteProject(remoteProject: string) {
    const projectId = this.remotes[remoteProject]?.id
    if (!projectId) {
      throw new Error(FSXAApiErrors.UNKNOWN_REMOTE)
    }
    return projectId
  }

  buildCaaSUrl({
    id,
    locale,
    remoteProject,
    additionalParams,
    filters,
    page,
    pagesize,
  }: buildCaaSUrlParams = {}) {
    let project = this.projectID
    if (remoteProject) {
      project = this.getRemoteProject(remoteProject)
    }

    let baseURL = `${this.caasURL}/${this.tenantID}/${project}.${this.contentMode}.content`

    if (id) {
      baseURL += `/${id}`
      if (locale) {
        baseURL += `.${locale}`
      }
    }

    baseURL += '?'

    if (additionalParams && Object.keys(additionalParams).length > 0) {
      const stringifiedParams = this.buildRestheartParams(additionalParams)
      if (stringifiedParams) {
        baseURL += `&${stringifiedParams}`
      }
    }

    if (filters) {
      let localeFilter: QueryBuilderQuery[] = []
      if (locale) {
        localeFilter = [
          {
            operator: ComparisonQueryOperatorEnum.EQUALS,
            value: locale.split('_')[0],
            field: 'locale.language',
          },
          {
            operator: ComparisonQueryOperatorEnum.EQUALS,
            value: locale.split('_')[1],
            field: 'locale.country',
          },
        ]
      }
      const allFilters = [...filters, ...localeFilter]
      // const query = [...filters.map(filter => JSON.stringify(this._queryBuilder.build(filter)))]
      const query = this._queryBuilder.buildAll(allFilters).map((v) => JSON.stringify(v))
      if (query) {
        baseURL += '&filter=' + query.join('&filter=')
      }
    }

    if (page) {
      baseURL += '&page=' + page
    }

    if (pagesize) {
      baseURL += '&pagesize=' + pagesize
    }

    return baseURL
  }

  buildNavigationServiceUrl({ locale, initialPath }: buildNavigationServiceURLParams = {}) {
    if (locale && initialPath) {
    }

    const baseNavigationServiceUrl = `${this.navigationServiceURL}/${this.contentMode}.${this.projectID}`

    if (initialPath && initialPath !== '/') {
      return `${baseNavigationServiceUrl}/by-seo-route/${initialPath}?depth=99&format=caas`
    }

    if (locale) {
      return `${baseNavigationServiceUrl}?depth=99&format=caas&language=${locale}`
    }

    return baseNavigationServiceUrl
  }

  async fetchNavigation({
    locale,
    initialPath,
    fetchOptions,
    authData,
  }: FetchNavigationParams): Promise<NavigationData | null> {
    this._logger.info('fetchNavigation', 'start', {
      locale,
      initialPath,
      authData,
    })

    let encodedInitialPath = undefined
    if (initialPath) {
      encodedInitialPath = encodeURI(initialPath)
    }

    const url = this.buildNavigationServiceUrl({ initialPath: encodedInitialPath, locale })

    const headers = {
      'Accept-Language': '*',
    }
    this._logger.info('fetchNavigation', 'url', url)

    const response = await fetch(url, {
      headers,
      ...fetchOptions,
    })

    this._logger.info('fetchNavigation', 'response', response.status)

    if (!response.ok) {
      switch (response.status) {
        case 404:
          throw new Error(FSXAApiErrors.NOT_FOUND)
        default:
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }
    this._logger.info('fetchNavigation', 'response ok', response.ok)

    if (this._navigationFilter) {
      this._logger.info('fetchNavigation', 'navigationFilter', this._navigationFilter)

      const navigation = await response.json()
      const idMap = navigation.idMap
      const routes = Object.keys(idMap).map((route) => idMap[route])
      let confirmResponseJson: unknown | null
      try {
        confirmResponseJson = this._preFilterFetch ? await this._preFilterFetch(authData) : null
      } catch ({ message }) {
        this._logger.error('fetchNavigation', 'preFilterFetch', message)
      }
      const filteredRoutes = routes.filter((item) =>
        this._navigationFilter!(item, authData, confirmResponseJson)
      )

      const allowedRoutes = filteredRoutes.map((item) => item.id)

      const seo = removeFromSeoRouteMap(navigation.seoRouteMap, allowedRoutes)
      const structure = removeFromStructure(navigation.structure, allowedRoutes)
      const filteredIdMap = removeFromIdMap(navigation.idMap, allowedRoutes)
      this._logger.info('fetchNavigation', 'new nav is build', filteredIdMap.length)

      return { ...navigation, idMap: filteredIdMap, seoRouteMap: seo, structure }
    }
    return response.json()
  }

  /**
   *
   * @param {string} id Das ist eine **id**.
   */
  async fetchElement<T = Page | GCAPage | Dataset | Image | any | null>({
    id,
    locale,
    additionalParams = {},
    remoteProject,
    fetchOptions,
  }: FetchElementParams): Promise<T> {
    locale = remoteProject && this.remotes ? this.remotes[remoteProject].locale : locale

    const url = this.buildCaaSUrl({ id, locale, additionalParams })

    const response = await fetch(url, {
      headers: this.authorizationHeader,
      ...fetchOptions,
    })

    if (!response.ok) {
      switch (response.status) {
        case 404:
          throw new Error(FSXAApiErrors.NOT_FOUND)
        case 401:
          throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
        default:
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }

    const responseJSON = await response.json()

    if (additionalParams.keys) {
      // If additionalParams are provided we cannot map the response since we do not know which keys are provided
      return responseJSON
    }

    const mapper = new CaaSMapper(
      this as any,
      locale,
      {
        customMapper: this._customMapper,
      },
      new Logger(LogLevel.ERROR, 'CaaSMapper')
    )

    return mapper.mapElementResponse(responseJSON)
  }

  async fetchByFilter({
    filters,
    locale,
    page = 1,
    pagesize = 30,
    additionalParams = {},
    remoteProject,
    fetchOptions,
  }: FetchByFilterParams) {
    if (pagesize < 1) {
      // TODO: LOGGER WARN
      pagesize = 1
    }

    if (page < 1) {
      // TODO: LOGGER WARN
      page = 1
    }

    if (page > 100) {
      // TODO: LOGGER WARN
      page = 100
    }
    const url = this.buildCaaSUrl({
      filters,
      additionalParams,
      remoteProject,
      locale,
      page,
      pagesize,
    })

    const response = await fetch(url, {
      headers: this.authorizationHeader,
      ...fetchOptions,
    })

    if (!response.ok) {
      switch (response.status) {
        case 401:
          throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
        default:
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }
    const mapper = new CaaSMapper(
      this as FSXARemoteApi,
      locale,
      {
        customMapper: this._customMapper,
      },
      new Logger(this._logLevel, 'CaaSMapper')
    )
    const data = await response.json()

    // we cannot ensure that the response can be mapped through our mapping algorithm if the keys attribute is set
    // so we will disable it
    if (additionalParams.keys) {
      return data._embedded['rh:doc']
    }

    if (!data._embedded || !data._embedded['rh:doc']) return data
    return mapper.mapFilterResponse(data._embedded['rh:doc'])
  }

  async fetchProjectProperties({
    locale,
    additionalParams = {},
    resolve = ['GCAPage'],
  }: {
    locale: string
    additionalParams?: Record<string, any>
    resolve?: string[]
  }) {
    const response = await this.fetchByFilter({
      filters: [
        {
          field: 'fsType',
          value: 'ProjectProperties',
          operator: ComparisonQueryOperatorEnum.EQUALS,
        },
      ],
      locale,
      additionalParams,
    })
    const page = (response[0] as Page)?.data
    if (!page) {
      return
    }

    const fetchedItem = Object.keys(page)
      .filter((key) => resolve.includes(page[key]?.referenceType))
      .map((key) => {
        const { referenceId } = page[key]

        return this.fetchByFilter({
          filters: [
            {
              field: 'identifier',
              value: referenceId,
              operator: ComparisonQueryOperatorEnum.EQUALS,
            },
          ],
          locale,
        })
      })

    const resolvedPromises = (await Promise.all(fetchedItem)).flat()
    resolvedPromises.forEach((item) => {
      const { data } = item as any
      page[item.id] = data
    })

    for (const key in page) {
      if (resolve.includes(page[key]?.referenceType)) {
        const filteredResponse = await this.fetchByFilter({
          filters: [
            {
              field: 'identifier',
              value: page[key].referenceId,
              operator: ComparisonQueryOperatorEnum.EQUALS,
            },
          ],
          locale,
        })
        page[key] = (filteredResponse[0] as GCAPage).data
      }
    }
    return response
  }

  private buildRestheartParams(params: Record<'keys' | string, Record<string, number>>) {
    let result: string[] = []
    Object.keys(params).forEach((key) => {
      Object.entries(params[key]).forEach(([param, value]) => {
        if (typeof params[key][param] === 'object') {
          // TODO LOG WARN
          return
        }
        result.push(`${key}={"${param}":${value}}`)
      })
    })
    const concatenatedResult = result.join('&')

    return concatenatedResult
  }

  public get apikey(): string {
    return this._apikey
  }
  public set apikey(value: string) {
    if (!value) {
      throw new Error(FSXAApiErrors.MISSING_API_KEY)
    }
    this._apikey = value
  }
  public get caasURL(): string {
    return this._caasURL
  }
  public set caasURL(value: string) {
    if (!value) {
      throw new Error(FSXAApiErrors.MISSING_CAAS_URL)
    }
    this._caasURL = value
  }
  public get projectID(): string {
    return this._projectID
  }
  public set projectID(value: string) {
    if (!value) {
      throw new Error(FSXAApiErrors.MISSING_PROJECT_ID)
    }
    this._projectID = value
  }
  public get tenantID(): string {
    return this._tenantID
  }
  public set tenantID(value: string) {
    if (!value) {
      throw new Error(FSXAApiErrors.MISSING_TENANT_ID)
    }
    this._tenantID = value
  }
  public get navigationServiceURL(): string {
    return this._navigationServiceURL
  }
  public set navigationServiceURL(value: string) {
    if (!value) {
      throw new Error(FSXAApiErrors.MISSING_NAVIGATION_SERVICE_URL)
    }
    this._navigationServiceURL = value
  }

  public get remotes(): Record<string, { id: string; locale: string }> {
    return this._remotes
  }

  public set remotes(value: Record<string, { id: string; locale: string }>) {
    const keys = Object.keys(value)
    keys.forEach((key) => {
      const { id, locale } = value[key]
      if (!id) {
        throw new Error(FSXAApiErrors.MISSING_REMOTE_ID)
      }
      if (!locale) {
        throw new Error(FSXAApiErrors.MISSING_REMOTE_LOCALE)
      }
    })

    this._remotes = value
  }

  public get contentMode(): 'preview' | 'release' {
    return this._contentMode
  }
  public set contentMode(value: 'preview' | 'release') {
    if (value !== 'preview' && value !== 'release') {
      throw new Error(FSXAApiErrors.UNKNOWN_CONTENT_MODE)
    }
    this._contentMode = value
  }

  public get logLevel(): LogLevel {
    return this._logLevel
  }
}
