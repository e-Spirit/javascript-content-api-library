import { stringify } from 'qs'
import { ObjectMap } from './types'

export const encodeQueryParams = (params: any) => {
  return stringify(params)
}

export const buildURI = (uri: string, query: ObjectMap<any>): string => {
  const url = new URL(uri)
  Object.keys(query).forEach(key => {
    if (Array.isArray(query[key])) {
      query[key].forEach((element: any) => url.searchParams.append(key, JSON.stringify(element)))
    } else url.searchParams.append(key, query[key])
  })
  return url.toString()
}
