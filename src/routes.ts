export const FETCH_PAGE_ROUTE = '/pages/:pageId'
export const FETCH_GCA_PAGES_ROUTE = '/gca-pages/:uid?'
export const FETCH_NAVIGATION_ROUTE = '/navigation'
export const FETCH_BY_FILTER_ROUTE = '/filter'

export const getFetchPageRoute = (pageId: string, locale: string) =>
  `${FETCH_PAGE_ROUTE.replace(':pageId', pageId)}?locale=${locale}`
export const getFetchGCAPagesRoute = (locale: string, uid?: string) =>
  `${FETCH_GCA_PAGES_ROUTE.replace('/:uid?', uid ? '/' + uid : '')}?locale=${locale}`
export const getFetchNavigationRoute = (initialPath: string | null, locale: string) =>
  `${FETCH_NAVIGATION_ROUTE}?initialPath=${encodeURIComponent(initialPath || '')}&locale=${locale}`

export interface FetchPageRouteParams {
  pageId: string
}
export interface FetchGCAPagesRouteParams {
  uid?: string
}
export interface LocaleQuery {
  locale?: string
}
export interface FetchNavigationQuery {
  initialPath?: string
  locale?: string
}

export interface FetchByFilterQuery {
  locale: string
  filter: string | string[]
}
