import faker from 'faker'
import { CaaSApi_CMSInputNumber } from '../types'

export const createNumberEntry = (num?: number): CaaSApi_CMSInputNumber => {
  const fsType = 'CMS_INPUT_NUMBER'
  const name = faker.random.word()
  const value = typeof num !== 'number' || Number.isNaN(num) ? faker.datatype.number(42) : num
  return { fsType, name, value }
}
