import faker from 'faker'
import { CaaSApi_GCAPage } from '../types'
import { createDataEntry } from './createDataEntry'

export const createGCAPage = (): CaaSApi_GCAPage => {
  const base = createDataEntry()
  const name = faker.random.word()
  const template = createDataEntry()

  return {
    ...base,
    _id: `${base.uid}`,
    fsType: 'GCAPage',
    name,
    formData: {},
    metaFormData: {},
    template: {
      ...template,
      fsType: 'PageTemplate',
    },
    children: [],
  }
}
