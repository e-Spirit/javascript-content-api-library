import { stringify } from 'qs'

export const encodeQueryParams = (params: any) => {
  return stringify(params)
}

export const clean = (obj: Record<string, any>) => {
  for (const propName in obj) {
    if (obj[propName] === undefined) {
      delete obj[propName]
    }
  }
  return obj
}
