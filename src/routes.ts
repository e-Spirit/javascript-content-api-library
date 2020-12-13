import { stringify } from 'qs'

export const FETCH_ELEMENT_ROUTE = '/elements/:id'
export const FETCH_GCA_PAGES_ROUTE = '/gca-pages/:uid?'
export const FETCH_NAVIGATION_ROUTE = '/navigation'
export const FETCH_BY_FILTER_ROUTE = '/filter'

export const getFetchElementRoute = (id: string, query: Record<string, any>) =>
  `${FETCH_ELEMENT_ROUTE.replace(':id', id)}?${stringify(query)}`
export const getFetchGCAPagesRoute = (locale: string, uid?: string) =>
  `${FETCH_GCA_PAGES_ROUTE.replace('/:uid?', uid ? '/' + uid : '')}?locale=${locale}`
export const getFetchNavigationRoute = (initialPath: string | null, locale: string) =>
  `${FETCH_NAVIGATION_ROUTE}?initialPath=${encodeURIComponent(initialPath || '')}&locale=${locale}`

export interface FetchElementRouteParams {
  id: string
}
export interface FetchGCAPagesRouteParams {
  uid?: string
}
export interface LocaleQuery {
  locale?: string
}
export interface FetchNavigationRouteQuery {
  initialPath?: string
  locale?: string
}

export interface FetchElementRouteQuery {
  locale: string
  additionalParams: Record<string, any>
}

export interface FetchByFilterQuery {
  locale: string
  filter: string | string[]
  page?: string
  pagesize?: string
  additionalParams: Record<string, any>
}
