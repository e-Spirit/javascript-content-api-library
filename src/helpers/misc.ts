import { FSXAApiErrors } from '../enums'

type AvailableLocaleParams = {
  navigationServiceURL: string
  projectID: string
  contentMode: 'preview' | 'release'
}

export const getAvailableLocales = async ({
  navigationServiceURL,
  projectID,
  contentMode,
}: AvailableLocaleParams): Promise<string[]> => {
  const queryParam = `${contentMode}.${projectID}`
  const url = `${navigationServiceURL}?from=${queryParam}&until=${queryParam}`

  const caasApiResponse = await fetch(url, {
    method: 'GET',
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

  // it can have duplicates
  data._embedded.forEach((item: any) => {
    if (!locales.includes(item.languageId)) {
      locales.push(item.languageId)
    }
  })

  return locales
}
