import dotenv from 'dotenv'
import { FSXAContentMode, LogLevel } from '../src'
import { FSXARemoteApi } from '../src/modules/FSXARemoteApi'
import { CaasTestingClient } from './utils'
import Faker from 'faker'
import { createDataset, createDatasetReference } from '../src/testutils/createDataset'
import { DEFAULT_MAX_REFERENCE_DEPTH } from '../src/modules/CaaSMapper'

dotenv.config({ path: './integrationtests/.env' })

const { INTEGRATION_TEST_API_KEY, INTEGRATION_TEST_CAAS } = process.env

describe('FSXARemoteApi', () => {
  let caasClient: CaasTestingClient
  const randomProjectID = Faker.datatype.uuid()
  const tenantID = 'fsxa-api-integration-test'
  const locale = {
    identifier: 'de_DE',
    country: 'DE',
    language: 'de',
  }

  beforeAll(async () => {
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
  })

  it('should use an updated maxReferencedepth when the dafault is overwritten', async () => {
    const dataset = createDataset('ds-id')
    const datasetReference = createDatasetReference('ds-id')
    dataset.formData.dsref = datasetReference
    await caasClient.addItemsToCollection([dataset], locale)

    const maxReferenceDepth = 5
    const remoteApi = new FSXARemoteApi({
      apikey: INTEGRATION_TEST_API_KEY!,
      caasURL: INTEGRATION_TEST_CAAS!,
      contentMode: FSXAContentMode.PREVIEW,
      navigationServiceURL: 'https://your-navigationservice.e-spirit.cloud/navigation'!,
      projectID: randomProjectID,
      tenantID: tenantID,
      remotes: {},
      logLevel: LogLevel.INFO,
      enableEventStream: false,
      maxReferenceDepth,
    })
    const res = await remoteApi.fetchElement({
      id: dataset.identifier,
      locale: `${locale.language}_${locale.country}`,
    })
    let current = res.data.dsref

    // start at depth of 1
    let referenceDepth = 1
    while (typeof current?.data.dsref == 'object') {
      current = current.data.dsref
      referenceDepth++
    }
    expect(referenceDepth).toBe(maxReferenceDepth)
  })

  it(
    'api gracefully handles circular references',
    async () => {
      const dataset = createDataset('ds-id')
      const datasetReference = createDatasetReference('ds-id')
      dataset.formData.dsref = datasetReference
      await caasClient.addItemsToCollection([dataset], locale)

      const remoteApi = new FSXARemoteApi({
        apikey: INTEGRATION_TEST_API_KEY!,
        caasURL: INTEGRATION_TEST_CAAS!,
        contentMode: FSXAContentMode.PREVIEW,
        navigationServiceURL: 'https://your-navigationservice.e-spirit.cloud/navigation'!,
        projectID: randomProjectID,
        tenantID: tenantID,
        remotes: {},
        logLevel: LogLevel.INFO,
        enableEventStream: false,
      })
      const res = await remoteApi.fetchElement({
        id: dataset.identifier,
        locale: `${locale.language}_${locale.country}`,
      })
      let current = res.data.dsref
      // start at depth of 1
      let referenceDepth = 1
      while (typeof current?.data.dsref == 'object') {
        current = current.data.dsref
        referenceDepth++
      }
      expect(referenceDepth).toBe(DEFAULT_MAX_REFERENCE_DEPTH)
      expect(current.data.dsref).toBe(`[REFERENCED-ITEM-${dataset._id}]`)
    },
    DEFAULT_MAX_REFERENCE_DEPTH * 1000 // one second per reference depth
  )
})
