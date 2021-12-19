export const clean = (obj: Record<string, any>) => {
  for (const propName in obj) {
    if (obj[propName] === undefined) {
      delete obj[propName]
    }
  }
  return obj
}

export const removeFromSeoRouteMap = (seoRouteMap: Record<string, string>, ids: string[]) => {
  Object.keys(seoRouteMap).forEach((key) => {
    if (!ids.includes(seoRouteMap[key])) {
      delete seoRouteMap[key]
    }
  })
  return seoRouteMap
}

export const removeFromStructure = (structure: { id: string; children: any }[], ids: string[]) => {
  return structure.filter((item) => {
    if (ids.includes(item.id)) {
      item.children = removeFromStructure(item.children, ids)
      return true
    }
    return false
  })
}

export const removeFromIdMap = (idMap: any, ids: string[]) => {
  const copyOfIdMap = { ...idMap }
  for (const route in copyOfIdMap) {
    if (!ids.includes(route)) {
      delete copyOfIdMap[route]
    }
  }
  return copyOfIdMap
}
