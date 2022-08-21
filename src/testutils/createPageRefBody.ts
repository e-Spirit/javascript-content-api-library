import Faker from 'faker'
import { CaaSApi_Body } from '../types'

export function createPageRefBody(): CaaSApi_Body {
  return {
    fsType: 'Body',
    name: 'content',
    identifier: Faker.datatype.uuid(),
    children: [],
  }
}
