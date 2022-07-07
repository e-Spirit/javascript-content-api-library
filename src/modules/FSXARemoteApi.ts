import NodeCache from 'node-cache'
import { stringify } from 'qs'
import { CaaSMapper, Logger } from '.'
import { FetchResponse, ProjectProperties } from '..'
import {
  NavigationData,
  CustomMapper,
  QueryBuilderQuery,
  FetchNavigationParams,
  FetchElementParams,
  FetchByFilterParams,
  FSXARemoteApiConfig,
  FSXAApi,
  CaasItemFilter,
  NavigationItemFilter,
  RemoteApiFilterOptions,
  CaasItem,
  RemoteProjectConfiguration,
  SortParams,
} from '../types'
import { removeFromIdMap, removeFromSeoRouteMap, removeFromStructure } from '../utils'
import { FSXAApiErrors } from './../enums'
import { LogLevel } from './Logger'
import { ComparisonQueryOperatorEnum, QueryBuilder } from './QueryBuilder'

type buildNavigationServiceURLParams = {
  locale?: string
  initialPath?: string
  all?: boolean
}

type buildCaaSUrlParams = {
  filters?: QueryBuilderQuery[]
  locale?: string
  page?: number
  pagesize?: number
  sort?: SortParams[]
  additionalParams?: Record<'keys' | string, any>
  remoteProject?: string
  id?: string
}

/**
 * This class represents the `remote` variant of the FSXA API.
 */
export class FSXARemoteApi implements FSXAApi {
  public mode: 'remote' = 'remote'
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
  private _navigationItemFilter?: NavigationItemFilter
  private _caasItemFilter?: CaasItemFilter
  private _logLevel: LogLevel
  private _enableEventStream: boolean = false
  private _cache: NodeCache
  private _isCacheEnabled: boolean = false

  /**
   * The constructor of this class initializes the configuration for the api.
   *
   * @param config {@link FSXARemoteApiConfig FSXARemoteApiConfig}
   * @param config.apikey
   * @param config.caasURL
   * @param config.navigationServiceURL
   * @param config.tenantID
   * @param config.projectID
   * @param config.remotes optional {@link RemoteProjectConfiguration RemoteProjectConfiguration}
   * @param config.contentMode 'release' | 'preview'
   * @param config.customMapper optional {@link CustomMapper CustomMapper}
   * @param config.filterOptions optional {@link RemoteApiFilterOptions RemoteApiFilterOptions} (EXPERIMENTAL)
   * @param config.logLevel the used {@link LogLevel LogLevel} for the API `(default LogLevel.ERROR)` - optional
   * @param config.isCacheEnabled flag that activates cache for performance boost - optional
   * @param config.cacheTimeInS cache active for time in seconds `(default 1440 (seconds) = 1 day)` - optional
   */
  constructor({
    apikey,
    caasURL,
    navigationServiceURL,
    tenantID,
    projectID,
    remotes,
    contentMode,
    customMapper,
    filterOptions,
    logLevel = LogLevel.ERROR,
    isCacheEnabled = false,
    cacheTimeInS = 1440,
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
    this._navigationItemFilter = filterOptions?.navigationItemFilter
    this._caasItemFilter = filterOptions?.caasItemFilter
    this._isCacheEnabled = isCacheEnabled

    // Docu: https://github.com/node-cache/node-cache
    this._cache = new NodeCache({
      stdTTL: cacheTimeInS, // parseInt(process.env.API_CACHE_TIME as string, 10) || 1440, // default 1 day
      maxKeys: -1, // -1 disables the key limit.
    })

    this._logger.debug('FSXARemoteApi created', {
      apikey,
      caasURL,
      navigationServiceURL,
      tenantID,
      projectID,
      remotes,
      contentMode,
      customMapper: this._customMapper,
      navigationItemFilter: this._navigationItemFilter,
      caasItemFilter: this._caasItemFilter,
    })
  }

  /**
   * Can be used in CaaS requests.
   * @returns an object with the configured apikey as value for the authorization key.
   */
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

  /**
   * This methods builds an URL for the CaaS.
   * Based upon the optional {@link buildCaaSUrlParams buildCaaSUrlParams} object the returning url can link to any desired document.
   * @param id a specific CaaS document id
   * @param locale the locale of CaaS document (id of the document must be set)
   * @param remoteProject name of the remote project
   * @param additionalParams additional URL parameters
   * @param filters filters for CaaS documents - for more details read the [CaaS Platform documentation](https://docs.e-spirit.com/module/caas-platform/CaaS_Platform_Documentation_EN.html#use-of-filters)
   * @param page number of the page you want to access
   * @param pagesize number of the resulting CaaS documents
   * @returns a string that contains the CaaS URL with the configured parameters as query parameters
   */
  buildCaaSUrl({
    id,
    locale,
    remoteProject,
    additionalParams,
    filters,
    page,
    pagesize,
    sort,
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

    const params: string[] = []
    const additionalParamsDefined = additionalParams && Object.keys(additionalParams).length > 0
    if (additionalParamsDefined) {
      params.push(this.buildStringifiedQueryParams(additionalParams))
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
        params.push('filter=' + query.join('&filter='))
      }
    }

    if (page) {
      params.push('page=' + page)
    }

    if (pagesize) {
      params.push('pagesize=' + pagesize)
    }
    if (sort && sort.length) {
      sort.forEach(({ name, order }: SortParams) => {
        params.push(`sort=${order === 'desc' ? '-' : ''}${name}`)
      })
    }

    if (params.length) {
      baseURL += `?${params.join('&')}`
    }

    return baseURL
  }

  /**
   * This fuction builds the URL for the NavigationService.
   * Based upon the optional {@link buildNavigationServiceURLParams buildNavigationServiceURLParams} object the returning url can link
   * to a seo route or a locale specific subtree of the navigation.
   * For more details how the Navigation Service works,
   * read the [Navigation Service documentation](https://navigationservice.e-spirit.cloud/docs/user/en/documentation.html).
   * @param locale value must be ISO conform, both 'en' and 'en_US' are valid."
   * @param initialPath can be provided when you want to access a subtree of the navigation
   * @returns {string} the Navigation Service url for either a subtree of or a complete navigation
   */
  buildNavigationServiceUrl({ locale, initialPath, all }: buildNavigationServiceURLParams = {}) {
    this._logger.debug('[buildNavigationServiceUrl]', { locale, initialPath })
    const useInitialPath = initialPath && initialPath !== '/'
    if (locale && useInitialPath) {
      this._logger.warn(
        '[buildNavigationServiceUrl]',
        'Parameters "locale" and "initialPath" have been given.'
      )
    }

    const baseNavigationServiceUrl = `${this.navigationServiceURL}/${this.contentMode}.${this.projectID}`

    if (useInitialPath) {
      this._logger.debug('[buildNavigationServiceUrl]', `Using initial path: ${useInitialPath}`)
      const queryParams = ['depth=99', '&format=caas', `${all ? '&all' : ''}`].join('')
      return `${baseNavigationServiceUrl}/by-seo-route/${initialPath}?${queryParams}`
    }

    if (locale) {
      this._logger.debug('[buildNavigationServiceUrl]', `Using locale: ${locale}`)
      return `${baseNavigationServiceUrl}?depth=99&format=caas&language=${locale}`
    }

    return baseNavigationServiceUrl
  }

  /**
   * This method fetches the navigation from the configured navigation service.
   * The {@link FetchNavigationParams FetchNavigationParams} object defines options for the navigation.
   * Check {@link buildNavigationServiceUrl buildNavigationServiceUrl} to know which URL will be used.
   * @param locale value must be ISO conform, both 'en' and 'en_US' are valid."
   * @param initialPath optional value can be provided when you want to access a subtree of the navigation
   * @param fetchOptions optional object to pass additional request options (Check {@link RequestInit RequestInit})
   * @param filterContext an optional value with additional context used for filtering
   * @returns {Promise<NavigationData | null>} a Promise with the Navigation Service data or null
   */
  async fetchNavigation({
    locale,
    initialPath,
    fetchOptions,
    filterContext,
  }: FetchNavigationParams): Promise<NavigationData | null> {
    this._logger.debug('fetchNavigation', 'start', {
      locale,
      initialPath,
      filterContext,
    })
    let encodedInitialPath = undefined
    if (initialPath) {
      encodedInitialPath = encodeURI(initialPath)
    }
    const url = this.buildNavigationServiceUrl({
      initialPath: encodedInitialPath,
      locale,
      all: true,
    })

    if (!this._isCacheEnabled || !this._cache?.has(url)) {
      const headers = {
        'Accept-Language': '*',
      }
      this._isCacheEnabled && this._logger.info('fetchNavigation - save to cache', url)
      this._logger.debug('fetchNavigation', 'url', url)
      const response = await fetch(url, {
        headers,
        ...fetchOptions,
      })
      this._logger.debug('fetchNavigation', 'response', response.status)
      if (!response.ok) {
        switch (response.status) {
          case 404:
            throw new Error(FSXAApiErrors.NOT_FOUND)
          default:
            throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
        }
      }
      this._logger.debug('fetchNavigation', 'response ok', response.ok)
      const filteredNavigation = this.getFilteredNavigation(response, filterContext)

      if (this._isCacheEnabled) {
        this._cache.set(url, filteredNavigation)
      } else {
        return filteredNavigation
      }
    } else {
      this._logger.info('fetchNavigation - retrieve from cache', url)
    }
    return this._cache.get(url) as Promise<NavigationData | null>
  }

  private async getFilteredNavigation(response: Response, filterContext?: unknown) {
    if (!this._navigationItemFilter) {
      return response.json()
    }
    const navigation = await response.json()
    const idMap = navigation.idMap
    const routes = Object.keys(idMap).map((route) => idMap[route])
    this._logger.debug(
      'fetchNavigation',
      'getFilteredNavigation',
      'unfiltered routes count',
      routes.length
    )

    const filteredRoutes = await this._navigationItemFilter!({
      navigationItems: routes,
      filterContext,
    })
    this._logger.debug(
      'fetchNavigation',
      'getFilteredNavigation',
      'filtered routes count',
      filteredRoutes.length
    )

    const allowedRouteIds = filteredRoutes.map((item) => item.id)
    const seo = removeFromSeoRouteMap(navigation.seoRouteMap, allowedRouteIds)
    const structure = removeFromStructure(navigation.structure, allowedRouteIds)
    const filteredIdMap = removeFromIdMap(navigation.idMap, allowedRouteIds)
    const filteredNavigation = { ...navigation, idMap: filteredIdMap, seoRouteMap: seo, structure }
    return filteredNavigation
  }

  /**
   * This method fetches an element from the configured CaaS.
   * The {@link FetchElementParams FetchElementParams} object defines options to specify your request.
   * Check {@link buildCaaSUrl buildCaaSUrl} to know which URL will be used.
   * @typeParam T optional type parameter you can provide to get a typed CaaS object as result.
   * @param id the CaaS id of the element you want to fetch
   * @param locale value must be ISO conform, both 'en' and 'en_US' are valid
   * @param additionalParams optional additional URL parameters
   * @param remoteProject optional name of the remote project
   * @param fetchOptions optional object to pass additional request options (Check {@link RequestInit RequestInit})
   * @returns {Promise<T>} a Promise with the mapped result
   */
  async fetchElement<T = CaasItem | any | null>({
    id,
    locale,
    additionalParams = {},
    remoteProject,
    fetchOptions,
    filterContext,
  }: FetchElementParams): Promise<T> {
    locale = remoteProject && this.remotes ? this.remotes[remoteProject].locale : locale
    const url = this.buildCaaSUrl({ id, locale, additionalParams })
    const encodedUrl = encodeURI(url)

    let filteredElement

    if (!this._isCacheEnabled || !this._cache.has(encodedUrl)) {
      this._isCacheEnabled && this._logger.info('[fetchElement] - save to cache', encodedUrl)

      const response = await fetch(encodedUrl, {
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
        { customMapper: this._customMapper },
        new Logger(this._logLevel, 'CaaSMapper')
      )
      const mappedElement = await mapper.mapElementResponse(responseJSON, filterContext)

      if (!this._caasItemFilter) {
        mappedElement && this._isCacheEnabled && this._cache.set(encodedUrl, mappedElement)
        return mappedElement
      }

      filteredElement = (
        await this._caasItemFilter({
          caasItems: [mappedElement],
          filterContext,
        })
      )[0]
      filteredElement && this._isCacheEnabled && this._cache.set(encodedUrl, filteredElement)
    } else {
      this._logger.info('[fetchElement] - retrieve from cache', encodedUrl)
    }

    if (this._isCacheEnabled) {
      filteredElement = this._cache.get(encodedUrl)
    }
    if (!filteredElement) {
      throw new Error(FSXAApiErrors.NOT_FOUND)
    }

    return filteredElement
  }

  /**
   * This method fetches a filtered page from the configured CaaS.
   * The {@link FetchElementParams FetchElementParams} object defines options to specify your request.
   * Check {@link buildCaaSUrl buildCaaSUrl} to know which URL will be used.
   * Example call:
   *
   * ```typescript
    const englishMedia = await fetchByFilter({
      filters: [
        {
          field: 'fsType',
          value: 'Media',
          operator: ComparisonQueryOperatorEnum.EQUALS,
        },
      ],
      "en_GB",
    })
   * ```
   * @param filters array of {@link QueryBuilderQuery QueryBuilderQuery} to filter you request
   * @param locale value must be ISO conform, both 'en' and 'en_US' are valid
   * @param page optional the number of the page you will get results from `(default = 1)` (must be greater than 0)
   * @param pagesize optional the number of document entries you will get back `(default = 30)` (must be greater than 0)
   * @param sort optional the parameter to sort the results by `(default = [])`.
   * @param additionalParams optional additional URL parameters
   * @param remoteProject optional name of the remote project
   * @param fetchOptions optional object to pass additional request options (Check {@link RequestInit RequestInit})
   * @returns the mapped and filtered response from the CaaS request,
   *    if `additionalParams.keys` are set, the result will be unmapped,
   *    if `data._embedded['rh:doc']` is undefined, the returning result will be the unmapped `data` object
   */
  async fetchByFilter({
    filters,
    locale,
    page = 1,
    pagesize = 30,
    additionalParams = {},
    remoteProject,
    fetchOptions,
    filterContext,
    parentIdentifiers = [],
    sort = [],
  }: FetchByFilterParams): Promise<FetchResponse> {
    if (pagesize < 1) {
      this._logger.warn(`[fetchByFilter] pagesize must be greater than zero! Using fallback of 30.`)
      pagesize = 30
    }

    if (page < 1) {
      this._logger.warn(`[fetchByFilter] page must be greater than zero! Using fallback of 1.`)
      page = 1
    }

    const url = this.buildCaaSUrl({
      filters,
      additionalParams: {
        ...additionalParams,
        rep: 'hal',
      },
      remoteProject,
      locale,
      page,
      pagesize,
      sort,
    })
    const encodedUrl = encodeURI(url)

    if (!this._isCacheEnabled || !this._cache?.has(encodedUrl)) {
      this._isCacheEnabled && this._logger.info('[fetchByFilter] - save to cache', encodedUrl)

      const response = await fetch(encodedUrl, {
        headers: this.authorizationHeader,
        ...fetchOptions,
      })

      if (!response.ok) {
        switch (response.status) {
          case 401:
            throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
          default:
            if (response.status === 400) {
              try {
                const { message } = await response.json()
                this._logger.error(`[fetchByFilter] Bad Request: ${message}`)
              } catch (ignore) {}
            }
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

      let items = await this.getItemsData(data, additionalParams, mapper, filterContext)

      if (items && items.length !== 0 && this._caasItemFilter) {
        this._logger.debug(
          'fetchByFilter',
          'caasItemFilter is defined, filtering items',
          items.map((caasItem) => {
            return {
              type: (caasItem as any).type,
              id: (caasItem as any).id,
            }
          })
        )
        items = await this._caasItemFilter({
          caasItems: items,
          filterContext,
        })
      }
      const responseItem = {
        page,
        pagesize,
        totalPages: data['_total_pages'],
        size: data['_size'],
        items,
      }
      if (this._isCacheEnabled) {
        this._cache.set(encodedUrl, responseItem)
      } else {
        return responseItem
      }
    } else {
      this._logger.info('[fetchByFilter] - retrieve from cache', encodedUrl)
    }

    return this._cache.get(encodedUrl) as FetchResponse
  }

  private async getItemsData(
    data: any,
    additionalParams: Record<string, any>,
    mapper: CaaSMapper,
    filterContext?: unknown
  ): Promise<unknown[]> {
    // we cannot ensure that the response can be mapped through our mapping algorithm if the keys attribute is set
    // so we will disable it
    if (additionalParams.keys) {
      return data._embedded['rh:doc']
    }

    // return empty array if no data was fetched
    if (!data._embedded || !data._embedded['rh:doc']) {
      return []
    }

    return mapper.mapFilterResponse(data._embedded['rh:doc'], filterContext)
  }

  // TODO: Fix unecessary array wrapping with a future major jump (as it's breaking)
  /**
   * This method fetches the project properties from the configured CaaS.
   * It uses {@link fetchByFilter fetchByFilter} to get them.
   * @param locale value must be ISO conform, both 'en' and 'en_US' are valid
   * @param additionalParams optional additional URL parameters
   * @param resolve optional array of fsTypes that will be resolved `(default = 'GCAPage')`
   * @returns the resolved project properties
   */
  async fetchProjectProperties({
    locale,
    additionalParams = {},
    resolve = ['GCAPage'],
    filterContext,
  }: {
    locale: string
    additionalParams?: Record<string, any>
    resolve?: string[]
    filterContext?: unknown
  }): Promise<ProjectProperties | null> {
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
      filterContext,
    })
    if (!response.items[0]) return null

    const projectProperties = response.items[0] as ProjectProperties
    const projectPropertiesData = projectProperties?.data
    if (!projectPropertiesData) {
      this._logger.debug(
        `[fetchProjectProperties] Could not find response data. Project properties might not be defined.`
      )
      return null
    }

    // We need to match keys from projectSettings to ElementIds later to insert them directly
    const idToKeyMap: Record<string, string> = {}

    const objectKeysToResolve = Object.keys(projectPropertiesData).filter((key) =>
      resolve.includes(projectPropertiesData[key]?.referenceType)
    )

    const idsToFetch = objectKeysToResolve.map((key) => {
      idToKeyMap[projectPropertiesData[key].referenceId] = key
      return projectPropertiesData[key].referenceId
    })

    if (idsToFetch.length > 100) {
      this._logger.warn(
        '[fetchProjectProperties] ProjectProperties contain more than 100 Elements to resolve. Only resolving the first 100!'
      )
    }
    const { items: fetchedElements } = await this.fetchByFilter({
      locale: locale,
      filters: [
        { field: 'identifier', operator: ComparisonQueryOperatorEnum.IN, value: idsToFetch },
      ],
      pagesize: 100,
      filterContext,
    })

    //Insert fetched Data into projectProperties
    fetchedElements.forEach((element) => {
      projectPropertiesData[idToKeyMap[(element as any).id]] = (element as any).data
    })

    if (!this._caasItemFilter) return projectProperties
    this._logger.debug(
      'fetchProjectProperties',
      'itemFilter',
      'Filter is defined, using additional context',
      filterContext
    )
    const filteredResult = this._caasItemFilter({
      caasItems: [projectProperties],
      filterContext,
    })
    if (Array.isArray(filteredResult)) return filteredResult[0]
    return null
  }

  /**
   * This method fetches a one-time secure token from the configured CaaS.
   * This token is used to establish the WebSocket connection.
   * @returns the secure token
   */
  async fetchSecureToken(): Promise<string | null> {
    const url = `${this.caasURL}/_logic/securetoken?tenant=${this.tenantID}`
    this._logger.info('fetchSecureToken', url)
    const response = await fetch(url, {
      headers: this.authorizationHeader,
    })
    if (!response.ok) {
      if (response.status === 404) {
        this._logger.error('fetchSecureToken', FSXAApiErrors.NOT_FOUND)
        throw new Error(FSXAApiErrors.NOT_FOUND)
      } else if (response.status === 401) {
        this._logger.error('fetchSecureToken', FSXAApiErrors.NOT_AUTHORIZED)
        throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
      } else {
        this._logger.error(
          'fetchSecureToken',
          FSXAApiErrors.UNKNOWN_ERROR,
          `${response.status} - ${response.statusText}`,
          await response.text()
        )
        throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }
    const { securetoken = null } = await response.json()
    return securetoken
  }

  private buildStringifiedQueryParams(params: Record<'keys' | string, any>) {
    const result: Record<string, any> = {}
    Object.keys(params).forEach((key) => {
      if (Array.isArray(params[key])) {
        result[key] = params[key].map(JSON.stringify)
      } else if (typeof params[key] === 'object') {
        result[key] = JSON.stringify(params[key])
      } else {
        result[key] = params[key]
      }
    })
    return stringify(result, {
      indices: false,
      encode: false,
    })
  }

  /**
   * @returns the configured apikey
   */
  public get apikey(): string {
    return this._apikey
  }

  /**
   * This method sets the string value of the apikey.
   * @param value the mandatory string value of the apikey
   */
  public set apikey(value: string) {
    if (!value) {
      throw new Error(FSXAApiErrors.MISSING_API_KEY)
    }
    this._apikey = value
  }

  /**
   * @returns the configured CaaS base url
   */
  public get caasURL(): string {
    return this._caasURL
  }

  /**
   * This method sets the base url of the CaaS.
   * @param value the mandatory base url of the CaaS e.g. `https://customername-dev-caas-api.e-spirit.cloud`
   */
  public set caasURL(value: string) {
    if (!value) {
      throw new Error(FSXAApiErrors.MISSING_CAAS_URL)
    }
    this._caasURL = value
  }

  /**
   * @returns the configured FirstSpirit project id
   */
  public get projectID(): string {
    return this._projectID
  }

  /**
   * This method sets the FirstSpirit project id
   * @param value the mandatory FirstSpirit project id
   */
  public set projectID(value: string) {
    if (!value) {
      throw new Error(FSXAApiErrors.MISSING_PROJECT_ID)
    }
    this._projectID = value
  }

  /**
   * @returns the configured tenant id
   */
  public get tenantID(): string {
    return this._tenantID
  }

  /**
   * This method sets the tenant id
   * @param value the mandatory tenant id (schema: `customername-stage`)
   */
  public set tenantID(value: string) {
    if (!value) {
      throw new Error(FSXAApiErrors.MISSING_TENANT_ID)
    }
    this._tenantID = value
  }

  /**
   * @returns the configured NavigationService url
   */
  public get navigationServiceURL(): string {
    return this._navigationServiceURL
  }

  /**
   * This method sets the url of the NavigationService.
   * @param value the mandatory url of the NavigationService e.g. `https://customername-stage-navigationservice.e-spirit.cloud/navigation`
   */
  public set navigationServiceURL(value: string) {
    if (!value) {
      throw new Error(FSXAApiErrors.MISSING_NAVIGATION_SERVICE_URL)
    }
    this._navigationServiceURL = value
  }

  /**
   * @returns the configured remote project configuration
   */
  public get remotes(): Record<string, { id: string; locale: string }> {
    return this._remotes
  }

  /**
   * This method sets the remote project configuration
   * @param value the mandatory remote project configuration
   * example:
   * ```typescript
    {
      "media": {
        "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "locale": "en_GB"
      }
    }
   ```
   */
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

  /**
   * @returns the configured content mode
   * `preview` links to the unreleased content
   * `release` links to the published content
   */
  public get contentMode(): 'preview' | 'release' {
    return this._contentMode
  }

  /**
   * This method sets the content mode
   * @param value the mandatory value of the content mode (allowed: `preview`, `release`)
   */
  public set contentMode(value: 'preview' | 'release') {
    if (value !== 'preview' && value !== 'release') {
      throw new Error(FSXAApiErrors.UNKNOWN_CONTENT_MODE)
    }
    this._contentMode = value
  }

  /**
   * @returns the configured log level
   */
  public get logLevel(): LogLevel {
    return this._logLevel
  }

  /**
   * Getter/Setter to enable the CaaS event stream
   * @returns true, if a event stream should pipe events from CaaS change events websocket
   */
  enableEventStream(enable?: boolean) {
    if (typeof enable !== 'undefined') this._enableEventStream = enable
    return this._enableEventStream
  }

  /**
   * Method to flush (remove) all keys from the cache.
   */
  invalidateCache() {
    this._cache.flushAll()
  }
}
