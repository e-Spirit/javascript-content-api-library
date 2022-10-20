import faker from 'faker'
import { CaaSApi_ProjectProperties } from '../types'
import { createDataEntry } from './createDataEntry'

export const createProjectProperties = (id?: string): CaaSApi_ProjectProperties => {
  const base = createDataEntry(id)
  const name = faker.random.word()
  const template = createDataEntry()

  return {
    ...base,
    _id: `${base.uid}`,
    fsType: 'ProjectProperties',
    name,
    formData: {},
    metaFormData: {},
    template: {
      ...template,
      fsType: 'PageTemplate',
    },
  }
}
