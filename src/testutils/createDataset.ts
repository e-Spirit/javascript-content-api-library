import faker from 'faker'
import { CaaSApi_Dataset, CaaSApi_FSDataset } from '../types'
import { createDataEntry } from './createDataEntry'

export const createDataset = (id?: string): CaaSApi_Dataset => {
  const base = createDataEntry(id)
  const template = createDataEntry()

  return {
    ...base,
    _id: `${base.uid}`,
    fsType: 'Dataset',
    formData: {},
    schema: `${base.uid}-schema`,
    entityType: `${base.uid}-entityType`,
    route: `${base.uid}-route`,
    routes: [
      {
        pageRef: 'abc',
        route: '/def/abc',
      },
    ],
    template: {
      ...template,
      fsType: 'PageTemplate',
    },
  }
}

export const createDatasetReference = (id?: string): CaaSApi_FSDataset => {
  const base = createDataEntry(id)
  return {
    name: faker.random.word(),
    value: {
      fsType: 'DatasetReference',
      target: {
        fsType: 'Dataset',
        schema: `${base.uid}-schema`,
        identifier: base.identifier,
        entityType: `${base.uid}-schema`,
      },
    },
    fsType: 'FS_DATASET',
  }
}
