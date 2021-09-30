import {
  Page,
  GCAPage,
  Dataset,
  Image,
  QueryBuilderQuery,
  NavigationData,
  FetchByFilterParams,
  FetchNavigationParams,
  FetchProjectPropertiesParams,
  FetchElementParams,
} from '../types'
import { FSXAApiErrors, FSXAProxyRoutes } from '../enums'
import { Logger, LogLevel } from './Logger'

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null | object
}

/**
 * This class represents the functionality of the FSXA-API as a proxy.
 * To use this class, there must be an instance of FSXARemoteApi that is accessed here.
 * By using this class, no secrets are provided to the client.
 * @see FSXARemoteApi
 */
export class FSXAProxyApi {
  public mode = 'proxy'
  private _baseUrl: string = this.baseUrl
  private _method = 'POST'
  private _headers = {
    'Content-Type': 'application/json',
  }
  private _logger: Logger

  get baseUrl() {
    return this._baseUrl
  }

  set baseUrl(value: string) {
    value = value.trim()
    if (value === '') {
      throw new Error(FSXAApiErrors.MISSING_BASE_URL)
    }
    this._baseUrl = value
  }

  /**
   * Creates a new instance with the connection to the FSXARemoteAPI
   * @param baseURL specifies the URL to communicate with
   */
  constructor(baseURL: string, logLevel = LogLevel.ERROR) {
    this.baseUrl = baseURL
    this._logger = new Logger(logLevel, 'FSXAProxyApi')
  }

  /**
   *
   * @param id
   * @param locale
   * @param additionalParams
   * @param remoteProject
   * @param fetchOptions
   * @returns
   */
  async fetchElement<T = Page | GCAPage | Dataset | Image | any | null>({
    id,
    locale,
    additionalParams = {},
    remoteProject,
    fetchOptions,
  }: FetchElementParams): Promise<T> {
    const body = { id, locale, additionalParams, remote: remoteProject }

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
   *
   * @param filters
   * @param locale
   * @param page
   * @param pagesize
   * @param additionalParams
   * @param remoteProject
   * @param fetchOptions
   * @returns
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

    const body = {
      filter: filters,
      locale,
      page,
      pagesize,
      additionalParams,
      remote: remoteProject,
    }

    const response = await this.fetch({
      url: FSXAProxyRoutes.FETCH_BY_FILTER_ROUTE,
      options: {
        method: this._method,
        headers: this._headers,
        body,
        ...fetchOptions,
      },
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
   *
   * @param initialPath
   * @param locale
   * @param fetchOptions
   * @returns
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
   *
   * @param locale
   * @param resolver
   * @param fetchOptions
   * @returns
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

    const response = await this.fetch({
      url: FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE,
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
        default:
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }

    return response.json()
  }

  /**
   *
   * @param url
   * @param options
   * @returns
   */
  private fetch({ url, options }: { url: string; options: RequestOptions }) {
    if (options?.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body)
    }
    this._logger.info('fetch', 'start', { url, options })
    return fetch(this.baseUrl + url, options as RequestInit)
  }
}
