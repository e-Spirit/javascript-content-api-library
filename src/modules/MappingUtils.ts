import { set, get } from 'lodash'
import { CaasApi_Item, Image, MappedCaasItem, NestedPath } from '../types'
import { ResolvedReferencesInfo, ReferencedItemsInfo } from './CaaSMapper'

const IMAGE_MAP_PLACEHOLDER = 'IMAGEMAP'
const IMAGE_MAP_RESOLUTION_SPLIT_DELIMITER = '___'

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

// Check for image map and force to single resolution
const imageMapForceResolution = ({
  resolvedReferences,
  path,
  referencedId,
}: {
  resolvedReferences: ResolvedReferencesInfo
  path: NestedPath
  referencedId: string
}): Image | null => {
  // check if referenceId exists in resolvedReferences
  if (!resolvedReferences[referencedId]) {
    return null
  }
  // get the registered reference item value by path
  const registeredReferenceItem = get(resolvedReferences, path)
  // check if the registered reference item is an ImageMap
  if (
    !registeredReferenceItem ||
    typeof registeredReferenceItem !== 'string' ||
    !registeredReferenceItem.startsWith(IMAGE_MAP_PLACEHOLDER)
  ) {
    return null
  }
  // Get the forced resolution from the registered referenced item image map
  // e.g. IMAGEMAP___{RESOLUTION}___{IMAGE_ID}
  const segments = registeredReferenceItem.split(
    IMAGE_MAP_RESOLUTION_SPLIT_DELIMITER
  )

  // Check if it is exactly 3 parts
  if (!segments || segments.length !== 3) {
    return null
  }
  const forcedResolution = segments[1]
  // get the Image Object from the resolved references by referencedId -> ImageMapId
  const resolvedImage = { ...resolvedReferences[referencedId] } as Image
  // force to a single resolution
  resolvedImage.resolutions = {
    [forcedResolution]: resolvedImage.resolutions[forcedResolution],
  }
  return resolvedImage
}

const denormalizeResolvedReferences = (
  mappedItems: (CaasApi_Item | MappedCaasItem)[],
  referenceMap: ReferencedItemsInfo,
  resolvedReferences: ResolvedReferencesInfo
) => {
  if (!referenceMap || Object.keys(referenceMap).length === 0)
    return mappedItems
  // denormalize
  for (const [referencedId, occurences] of Object.entries(referenceMap)) {
    // Iterate over all insertion paths and insert references into objects
    occurences.forEach((path) => {
      if (resolvedReferences[referencedId]) {
        const resolvedImage = imageMapForceResolution({
          resolvedReferences,
          path,
          referencedId,
        })
        set(
          resolvedReferences,
          path,
          resolvedImage || resolvedReferences[referencedId]
        )
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
