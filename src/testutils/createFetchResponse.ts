import { FetchResponse } from '../types'

export function createFetchResponse(items: unknown[]) {
  return {
    page: 1,
    pagesize: 30,
    size: undefined,
    totalPages: undefined,
    items,
  } as FetchResponse
}
