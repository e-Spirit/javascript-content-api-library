import faker from 'faker'
import { CaaSApi_Media_Picture } from '../types'
import { createDataEntry } from './createDataEntry'

export const createMediaPicture = (
  id = faker.datatype.uuid(),
  locale = faker.random.locale()
): CaaSApi_Media_Picture => {
  const base = createDataEntry(id, locale)
  const name = faker.random.word()
  return {
    ...base,
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
