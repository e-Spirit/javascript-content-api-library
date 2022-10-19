import { QueryBuilderQuery, SortParams } from './types'

export const FETCH_ELEMENT_ROUTE = '/elements/:id'
export const FETCH_NAVIGATION_ROUTE = '/navigation'
export const FETCH_BY_FILTER_ROUTE = '/filter'
export const HEALTH_ROUTE = '/health'
export const STREAM_CHANGE_EVENTS_ROUTE = '/change-stream'

export const getFetchElementRoute = (id: string) => `${FETCH_ELEMENT_ROUTE.replace(':id', id)}`

export interface FetchNavigationRouteBody {
  initialPath?: string
  locale?: string
  filterContext?: unknown
}

export interface FetchElementRouteBody {
  id: string
  locale: string
  additionalParams?: Record<string, unknown>
  remote?: string
  filterContext?: unknown
  normalized?: boolean
}

export interface FetchByFilterBody {
  locale: string
  filter: QueryBuilderQuery[]
  page?: number
  pagesize?: number
  sort?: SortParams[]
  additionalParams: Record<string, unknown>
  remote: string
  filterContext?: unknown
  normalized?: boolean
}

export interface FetchProjectPropertiesBody {
  locale: string
  additionalParams: Record<string, unknown>
  resolver?: string[]
  filterContext?: unknown
  normalized?: boolean
}
