import { CaaSApi_BaseRef, CaaSApi_FSReference } from '../types'
import Faker from 'faker'
import { createDataEntry } from '../testutils'

export function createRemotePageRefReference(): CaaSApi_FSReference {
  const value: CaaSApi_BaseRef = {
    fsType: 'PageRef',
    url: Faker.internet.url(),
    ...createDataEntry(),
    remoteProject: Faker.datatype.uuid(),
  }
  return {
    fsType: 'FS_REFERENCE',
    name: Faker.internet.userName(),
    value,
  }
}
