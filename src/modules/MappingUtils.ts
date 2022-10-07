import { set } from 'lodash'
import { CaasApi_Item, MappedCaasItem } from '../types'
import { ResolvedReferencesInfo, ReferencedItemsInfo, CaaSMapper } from './CaaSMapper'

const getItemId = (item: MappedCaasItem | CaasApi_Item): string => {
  return (item as MappedCaasItem).previewId || (item as CaasApi_Item)?._id
}

// we use a query function, because ids get mixed up:
// referencedItems store identifier, resolvedReferences store _id or previewId
const findResolvedReferencesByIds = (ids: string[], resolvedReferences: ResolvedReferencesInfo) => {
  return ids.map((id) => resolvedReferences[id]).filter((item) => item)
}

const denormalizeResolvedReferences = (
  mappedItems: (CaasApi_Item | MappedCaasItem)[],
  referenceMap: ReferencedItemsInfo,
  resolvedReferences: ResolvedReferencesInfo
) => {
  if (!referenceMap || Object.keys(referenceMap).length === 0) return mappedItems
  // denormalize
  for (const [referencedId, occurencies] of Object.entries(referenceMap)) {
    occurencies.forEach((path) => {
      // no simple comparison possible because referencedItems store identifier
      // and resolvedReferences store "previewId" or "_id"
      const resolvedId = Object.keys(resolvedReferences).find((key) => key.includes(referencedId))
      if (resolvedId) {
        set(resolvedReferences, path, resolvedReferences[resolvedId])
      }
    })
  }

  // update mappedItems
  const queriedIds = mappedItems.filter((item) => !!item).map((item) => getItemId(item))

  return findResolvedReferencesByIds(queriedIds, resolvedReferences)
}

export { getItemId, findResolvedReferencesByIds, denormalizeResolvedReferences }
