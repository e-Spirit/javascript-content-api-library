import { FSXAApiErrors } from '../enums'
import { Logger, LogLevel } from '../modules'

const logger = new Logger(LogLevel.INFO, 'FSXARemoteApi')

type AvailableLocaleParams = {
  navigationServiceURL: string
  projectId: string
  contentMode: string | ('preview' | 'release')
}
/**
 * This method fetches and aggregate available locale from navigation service.
 * The {@link AvailableLocaleParams AvailableLocaleParams} object defines options to specify your request.
 * Example call:
 *
 * ```typescript
  const availableLocales = await getAvailableLocales({
    navigationServiceURL: 'https://your.navigation-service.url/navigation',
    projectId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    contentMode: 'preview',
  })
 * ```
 * @param navigationServiceURL the url of navigation service
 * @param projectId the project id to use
 * @param contentMode the content mode to use, either 'preview' or 'release'
 * @returns an array of available locales in ISO format. e.g. ['en_GB', 'de_DE']
 */
export const getAvailableLocales = async ({
  navigationServiceURL,
  projectId,
  contentMode,
}: AvailableLocaleParams): Promise<string[]> => {
  try {
    const queryParam = `${contentMode}.${projectId}`
    const url = `${navigationServiceURL}?from=${queryParam}&until=${queryParam}`

    //@TODO: use appropriate language headers
    const navigationResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept-Language': 'www',
      },
    })

    if (!navigationResponse.ok) {
      switch (navigationResponse.status) {
        case 401:
          throw new Error(FSXAApiErrors.NOT_AUTHORIZED)
        default:
          if (navigationResponse.status === 400) {
            try {
              const { message } = await navigationResponse.json()
              logger.error(`[getAvailableLocales] Bad Request: ${message}`)
            } catch (ignore) {}
          }
          throw new Error(FSXAApiErrors.UNKNOWN_ERROR)
      }
    }

    let data = await navigationResponse.json()

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
    logger.error(`[getAvailableLocales] Error: ${error}`)
    return []
  }
}
