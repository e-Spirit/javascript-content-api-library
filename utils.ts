import { ObjectMap } from './caas/types'
import { stringify } from 'qs'

export const encodeQueryParams = (params: ObjectMap<any>) => {
  return stringify(params)
}
