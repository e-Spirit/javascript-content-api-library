import Faker from 'faker'
import { CaaSApi_Body, CaaSApi_Section } from '../types'

export function createPageRefBody(children: CaaSApi_Section[] = []): CaaSApi_Body {
  return {
    fsType: 'Body',
    name: 'content',
    identifier: Faker.datatype.uuid(),
    children,
  }
}
