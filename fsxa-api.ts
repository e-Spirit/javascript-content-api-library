import { ObjectMap, Page, GCAPage } from './caas/types'
import { fetchGCAPages, fetchPage } from './caas/page'
import { fetchNavigation, NavigationData } from './navigation'

export type FSXAApiParams =
  | {
      mode: 'proxy'
      baseUrl: string
    }
  | {
      mode: 'remote'
      config: FSXAConfiguration
    }

export interface FSXAConfiguration {
  apiKey: string
  navigationService: string
  caas: string
  projectId: string
  remotes?: ObjectMap<string>
}
export type FSXAContentMode = 'release' | 'preview'

const ERROR_MISSING_CONFIG =
  'Please specify a FSXAConfiguration via constructor or setConfiguration'

export default class FSXAApi {
  protected mode?: FSXAContentMode
  protected params?: FSXAApiParams

  constructor(mode: FSXAContentMode, params: FSXAApiParams) {
    this.mode = mode
    this.params = params
  }

  async fetchNavigation(locale: string): Promise<NavigationData | null> {
    if (!this.params) throw new Error(ERROR_MISSING_CONFIG)
    if (this.params.mode === 'proxy') {
      const response = await fetch(this.params.baseUrl + '/navigation?language=' + locale)
      return await response.json()
    }
    return fetchNavigation(
      `${this.params.config.navigationService}/${this.mode}.${this.params.config.projectId}`,
      locale
    )
  }

  async fetchPage(pageId: string, locale: string): Promise<Page | null> {
    if (!this.params) throw new Error(ERROR_MISSING_CONFIG)
    if (this.params.mode === 'proxy') {
      const response = await fetch(this.params.baseUrl + '/pages/' + pageId + '?language=' + locale)
      return await response.json()
    }
    return fetchPage({
      apiKey: this.params.config.apiKey,
      locale,
      uri: `${this.params.config.caas}/${this.params.config.projectId}/${this.mode}.content/${pageId}.${locale}`
    })
  }

  async fetchGCAPage(locale: string, uid: string): Promise<GCAPage | null> {
    if (!this.params) throw new Error(ERROR_MISSING_CONFIG)
    if (this.params.mode === 'proxy') {
      const response = await fetch(
        this.params.baseUrl + '/gca-pages/' + uid + '?language=' + locale
      )
      return await response.json()
    }
    const response = await fetchGCAPages({
      uri: `${this.params.config.caas}/${this.params.config.projectId}/${this.mode}.content`,
      apiKey: this.params.config.apiKey,
      locale,
      uid
    })
    return response[0]
  }

  async fetchGCAPages(locale: string): Promise<GCAPage[]> {
    if (!this.params) throw new Error(ERROR_MISSING_CONFIG)
    if (this.params.mode === 'proxy') {
      console.log(
        'Proxy: Fetching from',
        this.params.baseUrl + '/gca-pages' + '?language=' + locale
      )
      const response = await fetch(this.params.baseUrl + '/gca-pages' + '?language=' + locale)
      return await response.json()
    }
    return fetchGCAPages({
      uri: `${this.params.config.caas}/${this.params.config.projectId}/${this.mode}.content`,
      apiKey: this.params.config.apiKey,
      locale
    })
  }
}
export {
  MappedNavigationItem,
  MappedStructureItem,
  NavigationData,
  NavigationItem,
  NavigationMapping,
  StructureItem
} from './navigation'
export * from './caas/types'
