import faker from 'faker'
import { CaaSApi_FSReference } from '../types'

export function createDataEntry(id = faker.datatype.uuid()) {
  return {
    label: `${id}-label`,
    identifier: id,
    name: `${id}-name`,
    // note: these are not present on the CaaSApi_DataType interface but occur on almost any
    //       specialization and are extremely tedious to type so we simply always include them
    uid: id,
    uidType: `${id}-uidType`,
    displayName: `${id}-displayName`,
  }
}

export function createMediaPictureReference(
  id = faker.datatype.uuid(),
  remoteProject = `${id}-remoteProject`
): CaaSApi_FSReference {
  return {
    fsType: 'FS_REFERENCE',
    name: faker.random.word(),
    value: {
      fsType: 'Media',
      name: faker.random.word(),
      identifier: id,
      uid: id,
      uidType: 'MEDIASTORE_LEAF',
      mediaType: 'PICTURE',
      url: `${id}-url`,
      remoteProject,
    },
  }
}
