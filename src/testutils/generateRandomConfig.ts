import Faker from 'faker'
import { FSXAContentMode } from '../enums'
import { LogLevel } from '../modules'

export const generateRandomConfig = () => {
  const API_KEY = Faker.datatype.uuid()
  const CAAS_URL = Faker.internet.url()
  const NAVIGATION_SERVICE_URL = Faker.internet.url()
  const TENANT_ID = Faker.internet.domainWord()
  const PROJECT_ID = Faker.datatype.uuid()
  const CONTENT_MODE: FSXAContentMode = Faker.datatype.boolean()
    ? FSXAContentMode.PREVIEW
    : FSXAContentMode.RELEASE
  const REMOTES = {
    remote: {
      id: Faker.datatype.uuid(),
      locale: `${Faker.locale}_${Faker.locale.toUpperCase()}`,
    },
    secondRemote: {
      id: Faker.datatype.uuid(),
      locale: `${Faker.locale}_${Faker.locale.toUpperCase()}`,
    },
  }

  return {
    apikey: API_KEY,
    caasURL: CAAS_URL,
    navigationServiceURL: NAVIGATION_SERVICE_URL,
    tenantID: TENANT_ID,
    projectID: PROJECT_ID,
    remotes: REMOTES,
    contentMode: CONTENT_MODE,
    logLevel: LogLevel.NONE,
  }
}
