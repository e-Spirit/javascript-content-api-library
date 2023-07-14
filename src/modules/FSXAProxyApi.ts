import {
  Page,
  GCAPage,
  Dataset,
  Image,
  NavigationData,
  FetchByFilterParams,
  FetchNavigationParams,
  FetchProjectPropertiesParams,
  FetchElementParams,
  FSXAApi,
  ConnectEventStreamParams,
  ProxyApiFilterOptions,
  FilterContextProvider,
  ProjectProperties,
  CaasApi_Item,
  MappedCaasItem,
  NormalizedProjectPropertyResponse,
} from '../types'
import { FSXAApiErrors, FSXAProxyRoutes, HttpStatus } from '../enums'
import { Logger, LogLevel } from './Logger'
import { FetchResponse } from '..'
import { MapResponse } from '.'
import { denormalizeResolvedReferences } from './MappingUtils'
import { HttpError } from '../exceptions'

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null | object
}

/**
 * This class represents the functionality of the FSXA-API as a proxy.
 * To use this class, there must be an instance of FSXARemoteApi that is accessed here.
 * By using this class, no secrets are provided to the client.
 * @see FSXARemoteApi
 */
export class FSXAProxyApi implements FSXAApi {
  public mode: 'proxy' = 'proxy'
  private _baseUrl: string = this.baseUrl
  private _method = 'POST'
  private _headers = {
    'Content-Type': 'application/json',
  }
  private _logger: Logger
  private _enableEventStream: boolean = false
  private _filterContextProvider?: FilterContextProvider

  /**
   * This method requests the current state of baseUrl
   * @param baseUrl specifies the base Url for the FSXA-Proxy-Api
   */
  get baseUrl() {
    return this._baseUrl
  }
  /**
   * This method sets a new state of baseUrl
   * @param baseUrl specifies the base Url for the FSXA-Proxy-Api
   */
  set baseUrl(value: string) {
    value = value.trim()
    if (value === '') {
      throw new HttpError(FSXAApiErrors.MISSING_BASE_URL, HttpStatus.NOT_FOUND)
    }
    this._baseUrl = value
  }

  /**
   * Creates a new instance with the connection to the FSXARemoteAPI
   * @param baseUrl specifies the URL to communicate with
   * @param logLevel specifies the restrictions of logs which will be displayed
   * @param filterOptions optional {@link ProxyApiFilterOptions ProxyApiFilterOptions} (EXPERIMENTAL)
   */
  constructor(
    baseUrl: string,
    logLevel = LogLevel.ERROR,
    filterOptions?: ProxyApiFilterOptions
  ) {
    this.baseUrl = baseUrl
    this._logger = new Logger(logLevel, 'FSXAProxyApi')
    this._filterContextProvider = filterOptions?.filterContextProvider
    this._logger.debug('FSXAProxyApi created', { baseUrl })
  }

  /**
   * This methods fetches a specific element by its Id and its fetch options
   * @param id specifies the element that needs to be fetched
   * @param locale specifies the language e.g. de_DE
   * @param additionalParams sets parameters for the fetching process
   * @param remoteProject specifies the remote Project
   * @param fetchOptions specifies the options for the fetching process
   * @returns a JSON from the fetched element
   */
  async fetchElement<T = Page | GCAPage | Dataset | Image | any | null>({
    id,
    locale,
    additionalParams = {},
    remoteProject,
    fetchOptions,
  }: FetchElementParams): Promise<T> {
    const filterContext = this._filterContextProvider
      ? this._filterContextProvider()
      : undefined

    const body = {
      id,
      locale,
      additionalParams,
      remote: remoteProject,
      filterContext,
      normalized: true,
    }
    this._logger.debug('fetchElement', 'trying to fetch body', body)

    const response = await this.fetch({
      url: FSXAProxyRoutes.FETCH_ELEMENT_ROUTE,
      options: {
        method: this._method,
        headers: this._headers,
        body,
        ...fetchOptions,
      },
    })

    if (!response.ok) {
      switch (response.status) {
        case HttpStatus.NOT_FOUND:
          throw new HttpError(FSXAApiErrors.NOT_FOUND, HttpStatus.NOT_FOUND)
        case HttpStatus.UNAUTHORIZED:
          throw new HttpError(
            FSXAApiErrors.NOT_AUTHORIZED,
            HttpStatus.UNAUTHORIZED
          )
        default:
          const bodyString = await response.text()
          const errorMessage =
            FSXAApiErrors.UNKNOWN_ERROR +
            ' Response: ' +
            response.status +
            ' ' +
            bodyString
          throw new HttpError(errorMessage, HttpStatus.BAD_REQUEST)
      }
    }
    const jsonRes = await response.json()
    let { mappedItems, referenceMap, resolvedReferences } =
      jsonRes as MapResponse

    mappedItems = denormalizeResolvedReferences(
      mappedItems,
      referenceMap,
      resolvedReferences
    )

    return mappedItems[0] as unknown as T
  }

  /**
   * This method fetches elements found by a specified Filter
   * @param filters specifies the filter that needs to be fetched
   * @param locale specifies the language
   * @param page specifies the page
   * @param pagesize specifies the number of pages
   * @param additionalParams specifies additional parameters for the fetching process
   * @param remoteProject specifies the remote project for the fetching process
   * @param fetchOptions specifies options in the fetching process
   * @param sort specifies the fields to sort. Default is by id descending. Multiple sortParams are possible. First parameter is prioritized over subsequent.
   * @returns a JSON from the fetched elements
   *
   * @example
   * ```
   * const response = await api.fetchByFilter({filters: [], locale: de'DE', page: 1, pagesize: 10, additionalParams: {}, remoteProject: 'my-project'})
   * ```
   */
  async fetchByFilter({
    filters,
    locale,
    page = 1,
    pagesize = 30,
    additionalParams = {},
    remoteProject,
    fetchOptions,
    sort = [],
  }: FetchByFilterParams): Promise<FetchResponse> {
    if (pagesize < 1) {
      this._logger.warn(
        'fetchByFilter',
        'pagesize must be greater than zero! Using fallback of 30.'
      )
      pagesize = 30
    }

    if (page < 1) {
      this._logger.warn(
        'fetchByFilter',
        'page must be greater than zero! Using fallback of 1.'
      )
      page = 1
    }

    const filterContext = this._filterContextProvider
      ? this._filterContextProvider()
      : undefined

    const body = {
      filter: filters,
      locale,
      page,
      pagesize,
      sort,
      additionalParams: {
        ...additionalParams,
        rep: 'hal',
      },
      remote: remoteProject,
      filterContext,
      normalized: true,
    }
    this._logger.debug('fetchByFilter', 'trying to fetch with body', body)
    const response = await this.fetch({
      url: FSXAProxyRoutes.FETCH_BY_FILTER_ROUTE,
      options: {
        method: this._method,
        headers: this._headers,
        body,
        ...fetchOptions,
      },
    })
    this._logger.info('fetchByFilter', 'response', {
      url: response.url,
      status: response.status,
    })

    if (!response.ok) {
      switch (response.status) {
        case 401:
          throw new HttpError(
            FSXAApiErrors.NOT_AUTHORIZED,
            HttpStatus.UNAUTHORIZED
          )
        default:
          throw new HttpError(
            FSXAApiErrors.UNKNOWN_ERROR,
            HttpStatus.BAD_REQUEST
          )
      }
    }

    const jsonRes = (await response.json()) as FetchResponse
    let { referenceMap, items, resolvedReferences, totalPages, size } = jsonRes

    items = denormalizeResolvedReferences(
      items as (CaasApi_Item | MappedCaasItem)[],
      referenceMap!,
      resolvedReferences!
    )

    return { page, pagesize, totalPages, size, items } as FetchResponse
  }

  /**
   * This method fetches the navigation
   * @param initialPath to identify the navigation
   * @param locale specifies the Language
   * @param fetchOptions specifies options in the fetching Process
   * @returns a JSON from the fetching process
   */
  async fetchNavigation({
    initialPath,
    locale,
    fetchOptions,
  }: FetchNavigationParams): Promise<NavigationData | null> {
    this._logger.debug('fetchNavigation', 'start', {
      locale,
      initialPath,
    })

    const filterContext = this._filterContextProvider
      ? this._filterContextProvider()
      : undefined
    const body = {
      initialPath,
      locale,
      filterContext,
    }
    this._logger.debug('fetchNavigation', 'body', { body })

    const response = await this.fetch({
      url: FSXAProxyRoutes.FETCH_NAVIGATION_ROUTE,
      options: {
        method: this._method,
        headers: this._headers,
        body,
        ...fetchOptions,
      },
    })
    this._logger.debug('fetchNavigation', 'response', {
      url: response.url,
      status: response.status,
    })

    if (!response.ok) {
      switch (response.status) {
        case HttpStatus.NOT_FOUND:
          throw new HttpError(FSXAApiErrors.NOT_FOUND, HttpStatus.NOT_FOUND)
        default:
          throw new HttpError(
            FSXAApiErrors.UNKNOWN_ERROR,
            HttpStatus.BAD_REQUEST
          )
      }
    }
    return response.json()
  }

  /**
   * This method fetches Project Properties
   * @param locale specifies the language
   * @param resolver
   * @param fetchOptions specifies options in the fetching process
   * @returns a JSON from the fetching results
   */
  async fetchProjectProperties({
    locale,
    resolver = ['GCAPage'],
    fetchOptions,
  }: FetchProjectPropertiesParams): Promise<ProjectProperties | null> {
    this._logger.debug('fetchProjectProperties', 'start', { locale })

    const filterContext = this._filterContextProvider
      ? this._filterContextProvider()
      : undefined
    const body = {
      locale,
      resolver,
      filterContext,
      normalized: true,
    }
    this._logger.debug('fetchProjectProperties', 'trying to fetch body', body)

    // This needs to return normalized Data
    const response = await this.fetch({
      url: FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE,
      options: {
        method: this._method,
        headers: this._headers,
        body,
        ...fetchOptions,
      },
    })
    this._logger.debug('fetchProjectProperties', 'response', {
      url: response.url,
      status: response.status,
    })

    if (!response.ok) {
      switch (response.status) {
        case 404:
          throw new HttpError(FSXAApiErrors.NOT_FOUND, HttpStatus.NOT_FOUND)
        default:
          throw new HttpError(
            FSXAApiErrors.UNKNOWN_ERROR,
            HttpStatus.BAD_REQUEST
          )
      }
    }
    // We need to denormalize here

    const data: NormalizedProjectPropertyResponse =
      (await response.json()) as NormalizedProjectPropertyResponse

    if (!data) {
      this._logger.debug('fetchProjectProperties', 'no data found')
      return null
    }
    const denormalizedProjectPropertiesArray = denormalizeResolvedReferences(
      [data.projectProperties],
      data.projectPropertiesReferenceMap || {},
      data.projectPropertiesResolvedReferences || {}
    )

    const resolveElements = denormalizeResolvedReferences(
      data.resolveItems,
      data.resolveReferenceMap || {},
      data.resolveResolvedReferences || {}
    )

    const denormalizedProjectProperties =
      denormalizedProjectPropertiesArray.length > 0
        ? (denormalizedProjectPropertiesArray[0] as ProjectProperties)
        : null

    if (!denormalizedProjectProperties) return null

    //Insert fetched Data into projectProperties
    resolveElements.forEach((element) => {
      denormalizedProjectProperties.data[data.idToKeyMap[(element as any).id]] =
        (element as any).data
    })

    return denormalizedProjectProperties
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
   * This method initilises an `EventSoure` pointing to the CaaS change event stream.
   * @param additionalParams sets parameters for the fetching process
   * @param remoteProject specifies the remote Project
   * @returns an EventSource
   */
  connectEventStream({
    remoteProject,
  }: ConnectEventStreamParams = {}): EventSource {
    const url = new URL(
      this.baseUrl + FSXAProxyRoutes.STREAM_CHANGE_EVENTS_ROUTE,
      location.origin
    )
    if (remoteProject) {
      url.searchParams.set('remoteProject', remoteProject)
    }
    this._logger.info('connectEventStream', 'start', `${url}`)
    return new EventSource(url.toString())
  }

  private fetch({ url, options }: { url: string; options: RequestOptions }) {
    if (options?.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body)
    }
    this._logger.debug('fetch', 'start', {
      baseUrl: this.baseUrl,
      url,
      options,
      isServer:
        typeof process === 'undefined' ? undefined : (process as any)?.server,
      isClient:
        typeof process === 'undefined' ? undefined : (process as any)?.client,
      window: typeof window,
    })
    return fetch(this.baseUrl + url, options as RequestInit)
  }
}
