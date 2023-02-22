import { set } from 'lodash'
import { CaasApi_Item, MappedCaasItem } from '../types'
import { ResolvedReferencesInfo, ReferencedItemsInfo } from './CaaSMapper'

const getItemId = (
  item: MappedCaasItem | CaasApi_Item,
  remoteProjectId?: string
): string => {
  const projectPrefix = remoteProjectId ? `${remoteProjectId}#` : ''
  if ((item as CaasApi_Item).fsType === 'ProjectProperties') {
    const caasApiItem = item as CaasApi_Item
    const locale = caasApiItem._id.split('.')[1]
    return `${projectPrefix}${(item as CaasApi_Item).identifier}.${locale}`
  }
  return `${projectPrefix}${
    (item as MappedCaasItem).previewId || (item as CaasApi_Item)?._id
  }`
}

// we use a query function, because ids get mixed up:
// referencedItems store identifier, resolvedReferences store _id or previewId
const findResolvedReferencesByIds = (
  ids: string[],
  resolvedReferences: ResolvedReferencesInfo
) => {
  return ids.map((id) => resolvedReferences[id]).filter((item) => item)
}

const denormalizeResolvedReferences = (
  mappedItems: (CaasApi_Item | MappedCaasItem)[],
  referenceMap: ReferencedItemsInfo,
  resolvedReferences: ResolvedReferencesInfo
) => {
  if (!referenceMap || Object.keys(referenceMap).length === 0)
    return mappedItems
  // denormalize
  for (const [referencedId, occurrences] of Object.entries(referenceMap)) {
    // Iterate over all insertion paths and insert references into objects
    occurrences.forEach((path) => {
      if (resolvedReferences[referencedId]) {
        // here the references are actually injected
        // So here could come a special treatment for ImageMaps
        // if(imageMapForcedResolutions.find(referenceId)) --> Then manipulate the object injected here. ATTENTION DO NOT MANIPULATE THE ORIGINAL
        set(resolvedReferences, path, resolvedReferences[referencedId])
      } else {
        console.warn(
          `[denormalizeResolvedReferences] Unable to find object [${referencedId}] during denormalization. resolvedReferencesKeys: {[${Object.keys(
            resolvedReferences
          ).join('],[')}]}`
        )
      }
    })
  }

  // update mappedItems
  const queriedIds = mappedItems
    .filter((item) => !!item)
    .map((item) => getItemId(item))

  return findResolvedReferencesByIds(queriedIds, resolvedReferences)
}

export { getItemId, findResolvedReferencesByIds, denormalizeResolvedReferences }
