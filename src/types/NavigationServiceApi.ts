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
