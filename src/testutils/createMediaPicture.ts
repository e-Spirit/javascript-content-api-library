import faker from 'faker'
import { CaaSApi_Media_Picture } from '../types'
import { createDataEntry } from './createDataEntry'

export const createMediaPicture = (): CaaSApi_Media_Picture => {
  const base = createDataEntry()
  const name = faker.random.word()
  return {
    ...base,
    _id: `${base.uid}`,
    fsType: 'Media',
    name,
    metaFormData: {},
    mediaType: 'PICTURE',
    resolutionsMetaData: {},
    languageDependent: faker.datatype.boolean(),
    fileName: `${base.uid}-fileName`,
    description: `${base.uid}-description`,
    changeInfo: {
      revision: 0,
    },
  }
}
