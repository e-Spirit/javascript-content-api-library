import { FSXAApiErrors } from '../enums'
import { LOCALE_WITH_NAMES } from '../types'

type AvailableLocaleParams = {
  navigationServiceURL: string
  projectID: string
  contentMode: string | ('preview' | 'release')
}

type LocalesType = { name: string; identifier: string }

export const getAvailableLocales = async ({
  navigationServiceURL,
  projectID,
  contentMode,
}: AvailableLocaleParams): Promise<LocalesType[]> => {
  try {
    const queryParam = `${contentMode}.${projectID}`
    const url = `${navigationServiceURL}?from=${queryParam}&until=${queryParam}`

    //@TODO: use appropriate language headers
    const caasApiResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept-Language': 'www',
      },
    })

    if (!caasApiResponse.ok) {
      switch (caasApiResponse.status) {
        case 401:
          throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
        default:
          if (caasApiResponse.status === 400) {
            try {
              const { message } = await caasApiResponse.json()
              console.error(`[getAvailableLocales] Bad Request: ${message}`)
            } catch (ignore) {}
          }
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }

    let data = await caasApiResponse.json()

    if (!data._embedded) {
      return []
    }

    const locales: LocalesType[] = []

    // it can have duplicates
    data._embedded.forEach((item: any) => {
      const identifier = item.languageId
      const [language, region]: [string, string] = identifier.split('_')
      const regionName = LOCALE_WITH_NAMES[language] ?? 'German'
      locales.push({
        name: regionName,
        identifier,
      })
    })

    return locales
  } catch (error) {
    console.error(error)
    return []
  }
}
