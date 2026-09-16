import { faker } from '@faker-js/faker'
import { CaaSApi_Dataset, CaaSApi_FSDataset } from '../types'
import { createDataEntry } from './createDataEntry'
import {
  createReferenceUrl,
  ReferenceUrlOptions,
} from './createReferenceUrl'

export const createDataset = (id?: string): CaaSApi_Dataset => {
  const base = createDataEntry(id)
  const template = createDataEntry()

  return {
    ...base,
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
    locale: {
      language: 'de',
      country: 'DE',
    },
  }
}

export const createDatasetReference = (
  id?: string,
  remoteProjectId?: string,
  urlOptions: Omit<ReferenceUrlOptions, 'projectId' | 'documentId'> = {}
): CaaSApi_FSDataset => {
  const base = createDataEntry(id)
  return {
    name: faker.lorem.word(),
    value: {
      fsType: 'DatasetReference',
      target: {
        fsType: 'Dataset',
        schema: `${base.uid}-schema`,
        identifier: base.identifier,
        entityType: `${base.uid}-schema`,
      },
      ...(remoteProjectId
        ? {
            url: createReferenceUrl({
              ...urlOptions,
              projectId: remoteProjectId,
              documentId: base.identifier,
            }),
          }
        : {}),
    },
    fsType: 'FS_DATASET',
  }
}
