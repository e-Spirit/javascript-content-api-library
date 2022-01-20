import faker from 'faker'

export function createDataEntry() {
  const id = faker.datatype.uuid()
  return {
    label: `${id}-label`,
    identifier: `${id}-identifier`,
    name: `${id}-name`,
    // note: these are not present on the CaaSApi_DataType interface but occur on almost any
    //       specialization and are extremely tedious to type so we simply always include them
    uid: id,
    uidType: `${id}-uidType`,
    displayName: `${id}-displayName`,
  }
}
