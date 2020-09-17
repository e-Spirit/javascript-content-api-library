export interface StructureItem {
  id: string
  children: StructureItem[]
}

export interface NavigationItem {
  id: string
  parentIds: string[]
  label: string
  contentReference: string | null
  caasDocumentId: string
  seoRoute: string
  customData: any
}

export interface NavigationData {
  idMap: {
    [id: string]: NavigationItem
  }
  seoRouteMap: {
    [route: string]: string
  }
  structure: StructureItem[]
  pages: {
    index: string
  }
  meta: {
    identifier: {
      tenantId: string
      navigationId: string
      languageId: string
    }
  }
}

/**
 * Fetch page structure from navigation-service
 * @param url the url of the navigation-service
 * @param locale locale of language that should be fetched
 * @param initialPath initial route that can be used for language detection instead
 * @param mapNavigationItem You can pass this callback to directly map the generic NavigationItem to match your needed structure
 */
export async function fetchNavigation(
  url: string,
  initialPath: string | null,
  defaultLocale: string
): Promise<NavigationData | null> {
  try {
    const response = await fetch(
      !initialPath || initialPath === '/'
        ? `${url}?depth=99&format=caas&language=${defaultLocale}`
        : `${url}/by-seo-route/${initialPath}?depth=99&format=caas&all`,
      {
        headers: {
          'Accept-Language': '*'
        }
      }
    )
    if (response.status === 200) {
      return response.json()
    }
    throw new Error(
      `Unable to fetch Navigation. HTTP response status=${response.status}, statusText="${response.statusText}"`
    )
  } catch (error) {
    console.log('Error fetching Navigation', error)
    return null
  }
}
