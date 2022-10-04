import faker from 'faker'
import { CaaSApi_CMSInputPermission } from '..'
import {
  CaaSApi_FSReference,
  CaaSApi_MediaRef,
  CaaSAPI_PermissionActivity,
  CaaSAPI_PermissionGroup,
} from '../types'

export function createDataEntry(id = faker.datatype.uuid(), locale = faker.random.locale()) {
  return {
    _id: `${id}.${locale}`,
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

export function createMediaPictureReferenceValue(
  id = faker.datatype.uuid(),
  remoteProject = `${id}-remoteProject`
): CaaSApi_MediaRef {
  return {
    fsType: 'Media',
    name: faker.random.word(),
    identifier: id,
    uid: id,
    uidType: 'MEDIASTORE_LEAF',
    mediaType: 'PICTURE',
    url: `${id}-url`,
    remoteProject,
  }
}

export function createMediaPictureReference(
  id = faker.datatype.uuid(),
  remoteProject = `${id}-remoteProject`
): CaaSApi_FSReference {
  return {
    fsType: 'FS_REFERENCE',
    name: faker.random.word(),
    value: createMediaPictureReferenceValue(id, remoteProject),
  }
}

export function mockPermissionActivity(
  allowed: CaaSAPI_PermissionGroup[],
  forbidden: CaaSAPI_PermissionGroup[]
): CaaSAPI_PermissionActivity {
  return {
    activity: faker.random.word(),
    allowed,
    forbidden,
  }
}

export const mockPermissionGroup = (): CaaSAPI_PermissionGroup => {
  const groupId = faker.random.word()
  return {
    groupName: `${groupId}-name`,
    groupPath: `/GroupsFile/${groupId}`,
  }
}
