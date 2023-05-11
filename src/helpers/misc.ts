import { FSXAApiErrors } from '../enums'

type AvailableLocaleParams = {
  navigationServiceURL: string
  projectId: string
  contentMode: string | ('preview' | 'release')
}

export const getAvailableLocales = async ({
  navigationServiceURL,
  projectId,
  contentMode,
}: AvailableLocaleParams): Promise<string[]> => {
  try {
    const queryParam = `${contentMode}.${projectId}`
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

    const locales: string[] = []

    data._embedded.forEach((item: any) => {
      const identifier = item.languageId
      if (identifier && !locales.includes(identifier)) {
        locales.push(identifier)
      }
    })

    return locales
  } catch (error) {
    console.error(error)
    return []
  }
}
