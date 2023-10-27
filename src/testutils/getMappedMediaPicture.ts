import { CaaSApi_Media_Picture, Image } from '../types'

export const getMappedMediaPicture = (
  caasMedia: CaaSApi_Media_Picture,
  locale: string,
  remoteProjectId?: string
): Image => {
  return {
    type: 'Image',
    id: caasMedia.identifier,
    previewId: `${caasMedia.identifier}.${locale}`,
    meta: {},
    description: caasMedia.description,
    resolutions: {},
    remoteProjectId,
  }
}
