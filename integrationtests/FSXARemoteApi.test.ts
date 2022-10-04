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

  it('return normalized data if fetch element is called with normalized switched on', async () => {
    expect(true).toBe(false)
  })

  it('return denormalized data if fetch element is called', async () => {
    expect(true).toBe(false)
  })

  it('return normalized data if etch by filter is called with normalized switched on', async () => {
    expect(true).toBe(false)
  })

  it('return denormalized data if fetch by filter is called', async () => {
    expect(true).toBe(false)
  })

  it.only('should use an updated maxReferencedepth when the default is overwritten', async () => {
    const dataset1 = createDataset('ds1-id')
    const dataset2 = createDataset('ds2-id')
    const dataset3 = createDataset('ds3-id')
    const dataset4 = createDataset('ds4-id')

    const ds2Ref = createDatasetReference('ds2-id')
    const ds3Ref = createDatasetReference('ds3-id')
    const ds4Ref = createDatasetReference('ds4-id')
    dataset1.formData.dsref = ds2Ref
    dataset2.formData.dsref = ds3Ref
    dataset3.formData.dsref = ds4Ref
    await caasClient.addItemsToCollection([dataset1, dataset2, dataset3, dataset4], locale)

    const maxReferenceDepth = 2
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
      id: dataset1.identifier,
      locale: `${locale.language}_${locale.country}`,
    })

    let current = res.data.dsref
    // start at depth of 1
    let referenceDepth = 1
    while (referenceDepth < maxReferenceDepth) {
      current = current.data.dsref
      referenceDepth++
    }

    expect(res.data.dsref.data.dsref.data.dsref).toBe('[REFERENCED-ITEM-ds4-id]')
  })
})
