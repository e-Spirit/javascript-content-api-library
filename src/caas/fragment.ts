import { getAxiosHeaders, mapDataEntries } from './utils'
import { Fragment } from './types'
import { encodeQueryParams } from '../utils'

export interface FetchFragmentParams {
  apiKey: string
  uri: string
  locale: string
  fragmentId: string
}

export async function fetchFragment({
  apiKey,
  uri,
  fragmentId,
  locale
}: FetchFragmentParams): Promise<Fragment | null> {
  const response = await fetch(
    `${uri}?${encodeQueryParams({
      filter: {
        $and: [
          {
            'fragmentMetaData.id': {
              $eq: fragmentId.replace('-', '_')
            }
          },
          {
            'metaFormData.language.value.identifier': {
              $eq: locale.split('_')[0].toUpperCase()
            }
          }
        ]
      }
    })}`,
    {
      headers: getAxiosHeaders(apiKey)
    }
  )
  if (response.status === 200) {
    const responseData = await response.json()
    try {
      const data = responseData._embedded['rh:doc'][0]
      return {
        data: mapDataEntries(data.formData, locale, apiKey),
        meta: mapDataEntries(data.metaFormData, locale, apiKey),
        previewId: data.previewId,
        id: fragmentId,
        type: data.template.uid
      }
    } catch (error) {
      console.log('Error fetching fragment with id ' + fragmentId, error)
      return null
    }
  }
  return null
}
