import faker from 'faker'
import { CaaSApi_ImageMapMedia } from '../types'
import { createDataEntry } from './createDataEntry'

export const createImageMapMedia = (id = faker.datatype.uuid()): CaaSApi_ImageMapMedia => {
  const base = createDataEntry(id)
  const name = faker.random.word()
  return {
    ...base,
    fsType: 'Media',
    name,
    mediaType: 'PICTURE',
    url: faker.random.word(),
    pictureMetaData: {
      fileSize: faker.datatype.number(),
      extension: 'jpeg',
      mimeType: 'image/jpeg',
      width: 4500,
      height: 3000,
    },
  }
}
