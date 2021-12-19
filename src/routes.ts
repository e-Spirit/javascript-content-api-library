import { QueryBuilderQuery } from './types'

export const FETCH_ELEMENT_ROUTE = '/elements/:id'
export const FETCH_NAVIGATION_ROUTE = '/navigation'
export const FETCH_BY_FILTER_ROUTE = '/filter'

export const getFetchElementRoute = (id: string) => `${FETCH_ELEMENT_ROUTE.replace(':id', id)}`

export interface FetchNavigationRouteBody {
  initialPath?: string
  locale?: string
  authData?: unknown
}

export interface FetchElementRouteBody {
  id: string
  locale: string
  additionalParams?: Record<string, unknown>
  remote?: string
}

export interface FetchByFilterBody {
  locale: string
  filter: QueryBuilderQuery[]
  page?: number
  pagesize?: number
  additionalParams: Record<string, unknown>
  remote: string
}
