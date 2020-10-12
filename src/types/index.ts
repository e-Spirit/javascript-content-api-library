import { RegisteredDatasetQuery } from '../CaaSMapper'
import { QueryBuilderQuery } from './QueryBuilder'

export type FSXAApiParams =
  | {
      mode: 'proxy'
      baseUrl: string
    }
  | {
      mode: 'remote'
      config: FSXAConfiguration
    }

export interface FSXAConfiguration {
  apiKey: string
  navigationService: string
  caas: string
  projectId: string
  tenantId: string
  mapDataQuery: (query: RegisteredDatasetQuery) => QueryBuilderQuery[]
  remotes?: ObjectMap<string>
}
export enum FSXAContentMode {
  PREVIEW = 'preview',
  RELEASE = 'release'
}

export enum FSXAApiErrors {
  UNKNOWN_CONTENT_MODE = 'The content mode must be preview or release.',
  UNKNOWN_API_MODE = 'The api mode must be remote or proxy.',
  MISSING_BASE_URL = 'You do need to specify a baseUrl in proxy mode.',
  MISSING_API_KEY = 'No CaaS-ApiKey was passed via the configuration. [apiKey]',
  MISSING_CAAS_URL = 'No CaaS-URL was passed via the configuration. [caas]',
  MISSING_NAVIGATION_SERVICE_URL = 'No CaaS-URL was passed via the configuration. [navigationService]',
  MISSING_PROJECT_ID = 'No projectId was passed via the configuration. [projectId]',
  MISSING_TENANT_ID = 'No tenantId was passed via the configuration. [tenantId]'
}

export interface ObjectMap<ValueType = any> {
  [key: string]: ValueType
}
