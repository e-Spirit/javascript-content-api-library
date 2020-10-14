import { stringify } from 'qs'

export const encodeQueryParams = (params: Record<string, unknown>) => {
  return stringify(params)
}
