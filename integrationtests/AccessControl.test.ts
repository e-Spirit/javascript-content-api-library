import dotenv from 'dotenv'
import express, { Express } from 'express'
import cors from 'cors'
import { CaasItemFilterParams, Dataset, FSXAContentMode, FSXAProxyApi, LogLevel } from '../src'
import { default as expressIntegration } from '../src/integrations/express'
import { FSXARemoteApi } from '../src/modules/FSXARemoteApi'
import { ComparisonQueryOperatorEnum, LogicalQueryOperatorEnum } from '../src/modules/QueryBuilder'
import { CaasTestingClient } from './utils'
import { Server } from 'http'
import Faker from 'faker'
import { createDataset, createDatasetReference } from '../src/testutils'
import { MapResponse } from '../src/modules'

dotenv.config({ path: './integrationtests/.env' })

const { INTEGRATION_TEST_API_KEY, INTEGRATION_TEST_CAAS } = process.env

// promisify server start so we can await it in jest
const startSever = (app: Express) =>
  new Promise<Server>((resolve) => {
    const server = app.listen(3002, async () => {
      resolve(server)
    })
  })

describe('Access Control', () => {
  const randomProjectID = Faker.datatype.uuid()
  const tenantID = 'fsxa-api-integration-test'

  const remoteApiBaseConfig = {
    apikey: INTEGRATION_TEST_API_KEY!,
    caasURL: INTEGRATION_TEST_CAAS!,
    contentMode: FSXAContentMode.PREVIEW,
    navigationServiceURL: 'https://your-navigationservice.e-spirit.cloud/navigation'!,
    projectID: randomProjectID,
    tenantID: tenantID,
    remotes: {},
    logLevel: LogLevel.INFO,
    enableEventStream: false,
  }

  let proxyAPI: FSXAProxyApi
  let server: Server
  let caasClient: CaasTestingClient
  let app: Express

  beforeAll(async () => {
    // start express server
    app = express()
    app.use(cors())

    server = await startSever(app)

    proxyAPI = new FSXAProxyApi('http://localhost:3002/api', LogLevel.INFO)

    // create instance of caas client to easily read and write testing data to caas
    caasClient = await CaasTestingClient.init({
      apikey: INTEGRATION_TEST_API_KEY!,
      caasURL: INTEGRATION_TEST_CAAS!,
      projectID: randomProjectID,
      tenantID: tenantID,
      contentMode: FSXAContentMode.PREVIEW,
    })
  })
  afterAll(async () => {
    const res = await caasClient.getCollection()
    const parsedRes = await res.json()
    await caasClient.removeCollection(parsedRes._etag.$oid)
    server.close()
  })

  it('caas items filter filters data', async () => {
    const dataset1 = createDataset('ds1-id')
    const dataset2 = createDataset('ds2-id')

    const caasItemFilter = function ({
      mappedItems,
      referenceMap,
      resolvedReferences,
      filterContext,
    }: CaasItemFilterParams<unknown>) {
      const filteredMappedItems = mappedItems.filter(
        (item) => (item as Dataset).id !== dataset1.identifier
      )
      const filteredResolvedReferences = Object.fromEntries(
        Object.entries(resolvedReferences).filter(
          ([key, value]) => (value as Dataset).id !== dataset1.identifier
        )
      )
      return {
        mappedItems: filteredMappedItems,
        referenceMap,
        resolvedReferences: filteredResolvedReferences,
      } as MapResponse
    }

    const remoteApi = new FSXARemoteApi({
      ...remoteApiBaseConfig,
      filterOptions: {
        caasItemFilter,
      },
    })
    app.use('/api', expressIntegration({ api: remoteApi }))

    const locale = {
      identifier: 'de_DE',
      country: 'DE',
      language: 'de',
    }
    await caasClient.addItemsToCollection([dataset1, dataset2], locale)
    const res = await proxyAPI.fetchByFilter({
      filters: [
        {
          operator: LogicalQueryOperatorEnum.OR,
          filters: [
            {
              field: 'identifier',
              operator: ComparisonQueryOperatorEnum.EQUALS,
              value: dataset1.identifier,
            },
            {
              field: 'identifier',
              operator: ComparisonQueryOperatorEnum.EQUALS,
              value: dataset2.identifier,
            },
          ],
        },
      ],
      locale: locale.identifier,
    })
    expect(res.items.length).toBe(1)
    expect((res.items[0] as Dataset).id).toBe(dataset2.identifier)
  })

  it('return referenced item string if filter applies to referenced items', async () => {
    const dataset1 = createDataset('ds1-id')
    const dataset2 = createDataset('ds2-id')
    const referenceToDs1 = createDatasetReference('ds1-id')
    dataset2.formData = { referenceToDs1 }
    const caasItemFilter = function ({
      mappedItems,
      referenceMap,
      resolvedReferences,
      filterContext,
    }: CaasItemFilterParams<unknown>) {
      const filteredMappedItems = mappedItems.filter(
        (item) => (item as Dataset).id !== dataset1.identifier
      )
      const filteredResolvedReferences = Object.fromEntries(
        Object.entries(resolvedReferences).filter(
          ([key, value]) => (value as Dataset).id !== dataset1.identifier
        )
      )
      return {
        mappedItems: filteredMappedItems,
        referenceMap,
        resolvedReferences: filteredResolvedReferences,
      } as MapResponse
    }

    const remoteApi = new FSXARemoteApi({
      ...remoteApiBaseConfig,
      filterOptions: {
        caasItemFilter,
      },
    })
    app.use('/api', expressIntegration({ api: remoteApi }))
    const locale = {
      identifier: 'de_DE',
      country: 'DE',
      language: 'de',
    }
    await caasClient.addItemsToCollection([dataset1, dataset2], locale)
    const res = await proxyAPI.fetchByFilter({
      filters: [
        {
          operator: LogicalQueryOperatorEnum.OR,
          filters: [
            {
              field: 'identifier',
              operator: ComparisonQueryOperatorEnum.EQUALS,
              value: dataset1.identifier,
            },
            {
              field: 'identifier',
              operator: ComparisonQueryOperatorEnum.EQUALS,
              value: dataset2.identifier,
            },
          ],
        },
      ],
      locale: locale.identifier,
    })
    expect(res.items.length).toBe(1)
    expect((res.items[0] as Dataset).id).toBe(dataset2.identifier)
    expect((res.items[0] as Dataset).data.referenceToDs1).toBe('[REFERENCED-ITEM-ds1-id.de_DE]')
  })
})
