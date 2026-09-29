import { faker } from '@faker-js/faker'
import {
  CaaSApi_FSReference,
  CaaSApi_MediaRef,
  CaaSAPI_PermissionActivity,
  CaaSAPI_PermissionGroup,
} from '../types'
import {
  createReferenceUrl,
  ReferenceUrlOptions,
} from './createReferenceUrl'

export function createDataEntry(
  id = faker.string.uuid(),
  locale = faker.location.countryCode().toLowerCase()
) {
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
  id = faker.string.uuid(),
  remoteProjectId?: string,
  urlOptions: Omit<ReferenceUrlOptions, 'projectId' | 'documentId'> = {}
): CaaSApi_MediaRef {
  return {
    fsType: 'Media',
    name: faker.lorem.word(),
    identifier: id,
    uid: id,
    uidType: 'MEDIASTORE_LEAF',
    mediaType: 'PICTURE',
    url: remoteProjectId
      ? createReferenceUrl({
          ...urlOptions,
          projectId: remoteProjectId,
          documentId: id,
        })
      : `${id}-url`,
  }
}

export function createMediaPictureReference(
  id = faker.string.uuid(),
  remoteProjectId?: string,
  urlOptions: Omit<ReferenceUrlOptions, 'projectId' | 'documentId'> = {}
): CaaSApi_FSReference {
  return {
    fsType: 'FS_REFERENCE',
    name: faker.lorem.word(),
    value: createMediaPictureReferenceValue(id, remoteProjectId, urlOptions),
  }
}

export function mockPermissionActivity(
  allowed: CaaSAPI_PermissionGroup[],
  forbidden: CaaSAPI_PermissionGroup[]
): CaaSAPI_PermissionActivity {
  return {
    activity: faker.lorem.word(),
    allowed,
    forbidden,
  }
}

export const mockPermissionGroup = (): CaaSAPI_PermissionGroup => {
  const groupId = faker.lorem.word()
  return {
    groupName: `${groupId}-name`,
    groupPath: `/GroupsFile/${groupId}`,
  }
}
