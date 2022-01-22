import faker from 'faker'
import { CaaSApi_Media_File } from '../types'
import { createDataEntry } from './createDataEntry'

export const createMediaFile = (): CaaSApi_Media_File => {
  const base = createDataEntry()
  const name = faker.random.word()
  return {
    ...base,
    _id: `${base.uid}`,
    fsType: 'Media',
    name,
    metaFormData: {},
    mediaType: 'FILE',
    url: `${base.uid}-url`,
    fileMetaData: {
      fileSize: 240,
      encoding: 'enc',
      extension: 'ext',
      mimeType: 'mime',
    },
    languageDependent: faker.datatype.boolean(),
    fileName: `${base.uid}-fileName`,
    description: `${base.uid}-description`,
    changeInfo: {
      revision: 0,
    },
  }
}
