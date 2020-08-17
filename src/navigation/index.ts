export interface MappedNavigationItem {
  id: string
  parentIds: string[]
  label: string
  path: string
  contentReferenceId: string
  customData: any
}

export interface MappedStructureItem {
  id: string
  label: string
  path: string
  children: MappedStructureItem[]
}

export interface StructureItem {
  id: string
  children: NavigationItem[]
  visible: boolean
}

export interface NavigationItem {
  id: string
  label: string
  seoRoute: string
  contentReference: string | null
  visible: boolean
  children: NavigationItem[] | null
  customData: any
}

export interface NavigationMapping<T> {
  [key: string]: T
}

export interface NavigationData {
  pathMap: NavigationMapping<string>
  idMap: NavigationMapping<MappedNavigationItem>
  structure: MappedStructureItem[]
  indexPage: {
    id: string
    path: string
  }
}

export const mapNavigation = (item: NavigationItem): NavigationData => {
  const idMap = generateIdMap(item, [], {}, true)
  const pathMap = generatePathMap(item, {})
  const indexPath = idMap[item.id].path
  return {
    idMap,
    pathMap,
    structure: generateStructure(item),
    indexPage: {
      path: indexPath,
      id: pathMap[indexPath]
    }
  }
}

const extractContentUuid = (value: string): string => {
  const elements = value.split('/')
  return elements[elements.length - 1].split('.')[0]
}

export const generateStructure = (item: NavigationItem): MappedStructureItem[] => {
  // we extract the index page
  const childReference =
    item.children?.find(child => child.contentReference === item.contentReference) || null
  if (item.contentReference === null) return []
  const rootElement: MappedStructureItem = {
    id: extractContentUuid(item.contentReference),
    children: [],
    label: childReference?.label || item.label || '',
    path: item.seoRoute
  }
  const children = item.children?.filter(removeInvisible)
  if (!children?.length) return [rootElement]
  const elements = []
  for (let i = 0; i < children?.length; i++) {
    elements.push(generateStructureForChild(children[i]))
  }
  return [rootElement, ...(elements.filter(Boolean) as MappedStructureItem[])]
}

export const generateStructureForChild = (item: NavigationItem): MappedStructureItem | null => {
  if (item.contentReference === null) return null
  return {
    id: extractContentUuid(item.contentReference),
    children: (item.children || [])
      .filter(removeInvisible)
      .map(generateStructureForChild)
      .filter(Boolean) as MappedStructureItem[],
    label: item.label,
    path: item.seoRoute
  }
}

export const generatePathMap = (
  item: NavigationItem,
  map: NavigationMapping<string> = {}
): NavigationMapping<string> => {
  let result = {
    [item.seoRoute]: item.id,
    ...map
  }
  item.children?.map(child => {
    result = generatePathMap(child, result)
  })
  return result
}

export const generateIdMap = (
  item: NavigationItem,
  parentIds: string[],
  map: NavigationMapping<MappedNavigationItem> = {},
  isRoot = false
): NavigationMapping<MappedNavigationItem> => {
  let result = { ...map }
  if (item.contentReference === null) return result
  const childReference =
    item.children?.find(child => child.contentReference === item.contentReference) || null
  result[item.id] = {
    id: item.id,
    parentIds,
    label: isRoot && childReference?.label ? childReference.label : item.label,
    path: item.seoRoute,
    contentReferenceId: mapContentReference(item.contentReference),
    customData: item.customData
  }
  item.children?.map(child => {
    result = generateIdMap(child, [...parentIds, item.id], result)
  })
  return result
}

const mapContentReference = (url: string): string => {
  const parts = url.split('/')
  return parts[parts.length - 1].split('.')[0]
}

/**
 * Fetch page structure from navigation-service
 * @param url the url of the navigation-service
 * @param locale locale of language that should be fetched
 * @param mapNavigationItem You can pass this callback to directly map the generic NavigationItem to match your needed structure
 */
export async function fetchNavigation(url: string, locale: string): Promise<NavigationData | null> {
  try {
    const response = await fetch(`${url}?language=${locale}&depth=99`)
    if (response.status === 200) {
      return mapNavigation(await response.json())
    }
    throw new Error(
      `Unable to fetch Navigation. HTTP response status=${response.status}, statusText="${response.statusText}"`
    )
  } catch (error) {
    console.log('Error fetching Navigation', error)
    return null
  }
}

const removeInvisible = (item: NavigationItem): boolean => item.visible === true
