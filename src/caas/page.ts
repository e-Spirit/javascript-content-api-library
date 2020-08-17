import { Page, CAASPageRef, GCAPage, CAASGCAPageResponse } from './types'
import { mapPage, getAxiosHeaders, mapDataEntries } from './utils'
import { encodeQueryParams } from '../utils'

export interface FetchPageParams {
  uri: string
  locale: string
  apiKey: string
}
export async function fetchPage({ apiKey, locale, uri }: FetchPageParams): Promise<Page | null> {
  try {
    const response = await fetch(uri, {
      headers: getAxiosHeaders(apiKey)
    })
    if (response.status === 200) {
      // map response
      const data = await response.json()
      return await mapPage(data, locale, apiKey)
    }
  } catch (error) {
    console.log('Error fetching Page', error)
    return null
  }
  return null
}

export interface FetchGCAPagesParams {
  locale: string
  apiKey: string
  uri: string
  uid?: string
}
export async function fetchGCAPages({
  uri,
  locale,
  apiKey,
  uid
}: FetchGCAPagesParams): Promise<GCAPage[]> {
  const andFilter: any = [
    {
      fsType: {
        $eq: 'GCAPage'
      }
    },
    {
      'locale.language': {
        $eq: locale.split('_')[0]
      }
    }
  ]
  if (uid) andFilter.unshift({ uid: { $eq: uid } })
  const response = await fetch(
    `${uri}?${encodeQueryParams({
      filter: {
        $and: andFilter
      }
    })}`,
    {
      headers: getAxiosHeaders(apiKey)
    }
  )

  if (response.status === 200) {
    const data = await response.json()
    return Promise.all(
      data._embedded['rh:doc'].map(async (gcaPage: any) => ({
        id: gcaPage._id,
        data: await mapDataEntries(gcaPage.formData, locale, apiKey),
        meta: await mapDataEntries(gcaPage.metaData, locale, apiKey),
        name: gcaPage.name,
        uid: gcaPage.uid
      }))
    )
  }
  return []
}
