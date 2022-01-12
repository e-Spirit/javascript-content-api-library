import { CaaSApi_Dataset } from '../types'
import { createDataEntry } from './createDataEntry'

export const createDataset = (): CaaSApi_Dataset => {
  const base = createDataEntry()
  const template = createDataEntry()

  return {
    ...base,
    _id: `${base.uid}`,
    fsType: 'Dataset',
    formData: {},
    schema: `${base.uid}-schema`,
    entityType: `${base.uid}-entityType`,
    route: `${base.uid}-route`,
    template: {
      ...template,
      fsType: 'PageTemplate',
    },
  }
}
