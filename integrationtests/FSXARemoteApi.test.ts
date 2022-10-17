import dotenv from 'dotenv'
import { ComparisonQueryOperatorEnum, FSXAContentMode, LogLevel } from '../src'
import { FSXARemoteApi } from '../src/modules/FSXARemoteApi'
import { CaasTestingClient } from './utils'
import Faker from 'faker'
import { createDataset, createDatasetReference } from '../src/testutils/createDataset'

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

  it('return normalized data if fetch element is called with denormalized switched off', async () => {
    const dataset = createDataset('ds1-id')
    const referencedDataset = createDataset('ds2-id')
    const datasetReference = createDatasetReference('ds2-id')
    dataset.formData.dsref = datasetReference
    await caasClient.addItemsToCollection([dataset, referencedDataset], locale)
    const res = await remoteApi.fetchElement({
      id: dataset.identifier,
      locale: locale.identifier,
      denormalized: false,
    })
    expect(res.mappedItems[0].id).toEqual(dataset.identifier)
    expect(res.mappedItems.length).toEqual(1)
    expect(res.referenceMap).toEqual({
      [`${referencedDataset.identifier}.${locale.identifier}`]: [
        [`${dataset.identifier}.${locale.identifier}`, 'data', 'dsref'],
      ],
    })
    expect(Object.keys(res.resolvedReferences)).toEqual([
      `${dataset.identifier}.${locale.identifier}`,
      `${referencedDataset.identifier}.${locale.identifier}`,
    ])
  })

  it('return denormalized data if fetch element is called', async () => {
    const dataset = createDataset('ds1-id')
    const referencedDataset = createDataset('ds2-id')
    const datasetReference = createDatasetReference('ds2-id')
    dataset.formData.dsref = datasetReference
    await caasClient.addItemsToCollection([dataset, referencedDataset], locale)
    const res = await remoteApi.fetchElement({
      id: dataset.identifier,
      locale: locale.identifier,
    })
    expect(res.id).toEqual(dataset.identifier)
    expect(res.data.dsref.id).toEqual(referencedDataset.identifier)
  })

  it('return normalized data if fetch by filter is called with denormalized switched off', async () => {
    const dataset = createDataset('ds1-id')
    const referencedDataset = createDataset('ds2-id')
    const datasetReference = createDatasetReference('ds2-id')
    dataset.formData.dsref = datasetReference
    await caasClient.addItemsToCollection([dataset, referencedDataset], locale)
    const res: any = await remoteApi.fetchByFilter({
      filters: [
        {
          value: dataset.identifier,
          field: 'identifier',
          operator: ComparisonQueryOperatorEnum.EQUALS,
        },
      ],
      locale: locale.identifier,
      denormalized: false,
    })

    expect(res.items[0].id).toEqual(dataset.identifier)
    expect(res.items.length).toEqual(1)
    expect(res.referenceMap).toEqual({
      [`${referencedDataset.identifier}.${locale.identifier}`]: [
        [`${dataset.identifier}.${locale.identifier}`, 'data', 'dsref'],
      ],
    })
    expect(Object.keys(res.resolvedReferences)).toEqual([
      `${dataset.identifier}.${locale.identifier}`,
      `${referencedDataset.identifier}.${locale.identifier}`,
    ])
  })

  it('return denormalized data if fetch by filter is called', async () => {
    const dataset = createDataset('ds1-id')
    const referencedDataset = createDataset('ds2-id')
    const datasetReference = createDatasetReference('ds2-id')
    dataset.formData.dsref = datasetReference
    await caasClient.addItemsToCollection([dataset, referencedDataset], locale)
    const res: any = await remoteApi.fetchByFilter({
      filters: [
        {
          value: dataset.identifier,
          field: 'identifier',
          operator: ComparisonQueryOperatorEnum.EQUALS,
        },
      ],
      locale: locale.identifier,
    })
    // no referenceMap or resolvedRefs
    expect(Object.keys(res)).toEqual(['page', 'pagesize', 'totalPages', 'size', 'items'])
    expect(res.items[0].id).toEqual(dataset.identifier)
    expect(res.items[0].data.dsref.id).toEqual(referencedDataset.identifier)
  })

  it('should use an updated maxReferencedepth when the default is overwritten', async () => {
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
    const myRemoteApi = new FSXARemoteApi({
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
    const res = await myRemoteApi.fetchElement({
      id: dataset1.identifier,
      locale: locale.identifier,
    })
    expect(res.data.dsref.data.dsref.data.dsref).toBe(
      `[REFERENCED-ITEM-ds4-id.${locale.identifier}]`
    )
  })
})
