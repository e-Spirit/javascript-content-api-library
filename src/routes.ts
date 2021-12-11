import { QueryBuilderQuery } from './types'

export const FETCH_ELEMENT_ROUTE = '/elements/:id'
export const FETCH_NAVIGATION_ROUTE = '/navigation'
export const FETCH_BY_FILTER_ROUTE = '/filter'
export const STREAM_CHANGE_EVENTS_ROUTE = '/change-stream'

export const getFetchElementRoute = (id: string) => `${FETCH_ELEMENT_ROUTE.replace(':id', id)}`

export interface FetchElementRouteParams {
  id: string
}
export interface FetchNavigationRouteBody {
  initialPath?: string
  locale?: string
}

export interface FetchElementRouteBody {
  locale: string
  additionalParams?: Record<string, any>
  remote?: string
}

export interface FetchByFilterBody {
  locale: string
  filter: QueryBuilderQuery[]
  page?: number
  pagesize?: number
  additionalParams: Record<string, any>
  remote: string
}
