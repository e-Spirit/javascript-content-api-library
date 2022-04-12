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
} from '../types'
import { FSXAApiErrors, FSXAProxyRoutes } from '../enums'
import { Logger, LogLevel } from './Logger'
import { FetchResponse } from '..'
import { locale } from 'faker'

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
      throw new Error(FSXAApiErrors.MISSING_BASE_URL)
    }
    this._baseUrl = value
  }

  /**
   * Creates a new instance with the connection to the FSXARemoteAPI
   * @param baseUrl specifies the URL to communicate with
   * @param logLevel specifies the restrictions of logs which will be displayed
   * @param enableEventStream enables the CaaS event stream
   */
  constructor(baseUrl: string, logLevel = LogLevel.ERROR) {
    this.baseUrl = baseUrl
    this._logger = new Logger(logLevel, 'FSXAProxyApi')

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
    const body = { id, locale, additionalParams, remote: remoteProject }
    this._logger.info('fetchElement', 'trying to fetch body', body)
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
        case 404:
          throw new Error(FSXAApiErrors.NOT_FOUND)
        case 401:
          throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
        default:
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }

    return response.json()
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
  }: FetchByFilterParams): Promise<FetchResponse> {
    if (pagesize < 1) {
      this._logger.warn(
        'fetchByFilter',
        'pagesize must be greater than zero! Using fallback of 30.'
      )
      pagesize = 30
    }

    if (page < 1) {
      this._logger.warn('fetchByFilter', 'page must be greater than zero! Using fallback of 1.')
      page = 1
    }

    const body = {
      filter: filters,
      locale,
      page,
      pagesize,
      additionalParams: {
        ...additionalParams,
        rep: 'hal',
      },
      remote: remoteProject,
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
          throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
        default:
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }

    return response.json()
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
    authData,
  }: FetchNavigationParams): Promise<NavigationData | null> {
    this._logger.info('fetchNavigation', 'start', { locale, initialPath })

    const body = {
      initialPath,
      locale,
      authData,
    }
    this._logger.info('fetchNavigation', 'body', { body })

    const response = await this.fetch({
      url: FSXAProxyRoutes.FETCH_NAVIGATION_ROUTE,
      options: {
        method: this._method,
        headers: this._headers,
        body,
        ...fetchOptions,
      },
    })
    this._logger.info('fetchNavigation', 'response', {
      url: response.url,
      status: response.status,
    })

    if (!response.ok) {
      switch (response.status) {
        case 404:
          throw new Error(FSXAApiErrors.NOT_FOUND)
        default:
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
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
  }: FetchProjectPropertiesParams): Promise<Record<string, any> | null> {
    this._logger.info('fetchProjectProperties', 'start', { locale })
    const body = {
      locale,
      resolver,
    }
    this._logger.info('fetchProjectProperties', 'trying to fetch body', body)

    const response = await this.fetch({
      url: FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE,
      options: {
        method: this._method,
        headers: this._headers,
        body,
        ...fetchOptions,
      },
    })
    this._logger.info('fetchNavigation', 'response', {
      url: response.url,
      status: response.status,
    })

    if (!response.ok) {
      switch (response.status) {
        case 404:
          throw new Error(FSXAApiErrors.NOT_FOUND)
        default:
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }

    return response.json()
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
  connectEventStream({ remoteProject }: ConnectEventStreamParams = {}): EventSource {
    const url = new URL(this.baseUrl + FSXAProxyRoutes.STREAM_CHANGE_EVENTS_ROUTE, location.origin)
    if (remoteProject) {
      url.searchParams.set('remoteProject', remoteProject)
    }
    this._logger.info('connectEventStream', 'start', `${url}`)
    return new EventSource(url)
  }

  private fetch({ url, options }: { url: string; options: RequestOptions }) {
    if (options?.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body)
    }
    this._logger.info('fetch', 'start', {
      baseUrl: this.baseUrl,
      url,
      options,
      isServer: typeof process === 'undefined' ? undefined : (process as any)?.server,
      isClient: typeof process === 'undefined' ? undefined : (process as any)?.client,
      window: typeof window,
    })
    return fetch(this.baseUrl + url, options as RequestInit)
  }
}
