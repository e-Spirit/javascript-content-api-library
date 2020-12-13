import { stringify } from 'qs'

export const encodeQueryParams = (params: any) => {
  return stringify(params)
}
