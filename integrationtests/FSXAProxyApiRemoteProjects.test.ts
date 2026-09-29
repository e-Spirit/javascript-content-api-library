import dotenv from 'dotenv'
import express, { Express } from 'express'
import cors from 'cors'
import {
  CaaSApi_Dataset,
  CaaSApi_Media_Picture,
  CaaSApi_PageRef,
  FSXAContentMode,
  FSXAProxyApi,
  LogLevel,
  Page,
  RemoteProjectConfiguration,
} from '../src'
import { default as expressIntegration } from '../src/integrations/express'
import { FSXARemoteApi } from '../src'
import { CaasTestingClient, closeServer, retryAsync, waitUntilPreconditionMet, TEST_TIMEOUTS } from './utils'
import { Server } from 'http'
import { faker } from '@faker-js/faker'
import {
  createDataset,
  createDatasetReference,
  createMediaPicture,
  createMediaPictureReference,
  createPageRef,
  createPageRefBody,
} from '../src/testutils'

dotenv.config({ path: './integrationtests/.env' })

const { INTEGRATION_TEST_API_KEY, INTEGRATION_TEST_CAAS, INTEGRATION_TEST_TENANT_ID } = process.env

// promisify server start so we can await it in jest
const startSever = (app: Express) =>
  new Promise<Server>((resolve) => {
    const server = app.listen(3002, async () => {
      resolve(server)
    })
  })

describe('FSXAProxyAPIRemoteProjects should resolve references', () => {
  const projectLocale = {
    identifier: 'de_DE',
    country: 'DE',
    language: 'de',
  }
  const tenantID = INTEGRATION_TEST_TENANT_ID || 'fsxa-api-integration-test'
  let randomId1: string
  let randomId2: string

  let proxyAPI: FSXAProxyApi
  let server: Server
  let caasClient: CaasTestingClient

  let localMedia: CaaSApi_Media_Picture
  let remoteMedia: CaaSApi_Media_Picture
  let pageRef: CaaSApi_PageRef
  let dataset: CaaSApi_Dataset

  async function init(
    remoteProjectId: string,
    remoteProjectLocale: string,
    differentMediaIds: boolean = false,
    configuredRemotes: RemoteProjectConfiguration = {
      media: { id: remoteProjectId, locale: remoteProjectLocale },
    },
    referenceUrlLocale: string = remoteProjectLocale
  ) {
    let remoteApi = new FSXARemoteApi({
      apikey: INTEGRATION_TEST_API_KEY!,
      caasURL: INTEGRATION_TEST_CAAS!,
      contentMode: FSXAContentMode.PREVIEW,
      navigationServiceURL:
        'https://your-navigationservice.e-spirit.cloud/navigation'!,
      projectID: randomId1,
      tenantID: tenantID,
      remotes: configuredRemotes,
      logLevel: LogLevel.INFO,
      enableEventStream: false,
      maxReferenceDepth: 10,
    })

    const app = express()
    app.use(cors())
    app.use('/api', expressIntegration({ api: remoteApi }))
    server = await startSever(app)

    proxyAPI = new FSXAProxyApi('http://localhost:3002/api', LogLevel.INFO)

    caasClient = await CaasTestingClient.init({
      apikey: INTEGRATION_TEST_API_KEY!,
      caasURL: INTEGRATION_TEST_CAAS!,
      projectID: randomId1,
      tenantID: tenantID,
      contentMode: FSXAContentMode.PREVIEW,
      remoteProjectId,
    })

    await prepareDataInCaas(
      remoteProjectId,
      remoteProjectLocale,
      differentMediaIds,
      referenceUrlLocale
    )
  }

  async function prepareDataInCaas(
    remoteProjectId: string,
    remoteProjectLocale: string,
    differentMediaIds: boolean,
    referenceUrlLocale: string
  ) {
    const mediaId = faker.string.uuid()

    const remoteMediaId = differentMediaIds ? faker.string.uuid() : mediaId

    localMedia = createMediaPicture(mediaId, 'de_DE')
    localMedia.description = 'local media'

    remoteMedia = createMediaPicture(remoteMediaId, remoteProjectLocale)
    remoteMedia.description = 'remote media'

    pageRef = createPageRef([createPageRefBody()])

    const referenceUrlOptions = {
      baseUrl: INTEGRATION_TEST_CAAS!,
      tenantId: tenantID,
      locale: referenceUrlLocale,
      contentMode: FSXAContentMode.PREVIEW,
    }

    const pictureLocal = createMediaPictureReference(mediaId)
    const pictureRemote = createMediaPictureReference(
      remoteMediaId,
      remoteProjectId,
      referenceUrlOptions
    )

    const datasetId = faker.string.uuid()
    dataset = createDataset(datasetId)
    remoteMedia.metaFormData = {
      md_dataset: createDatasetReference(datasetId),
    }
    const remoteDatasetReference = createDatasetReference(
      datasetId,
      remoteProjectId,
      referenceUrlOptions
    )

    await caasClient.addItemsToCollection([localMedia], projectLocale)

    const [language, country] = remoteProjectLocale.split('_')

    // add items to remote project collection
    await caasClient.addItemsToRemoteCollection([remoteMedia, dataset], {
      language,
      country,
      identifier: remoteProjectLocale,
    })

    pageRef.page.formData = {
      pt_pictureLocal: pictureLocal,
      pt_pictureRemote: pictureRemote,
      pt_datasetRemote: remoteDatasetReference,
    }

    await caasClient.addItemsToCollection([pageRef], projectLocale)

    // Wait for CaaS to propagate all data before tests run
    await waitUntilPreconditionMet(
      async () => {
        const res = await caasClient.getItem(pageRef.identifier, 'de_DE')
        return res.status === 200
      },
      {
        timeoutMs: 20000,
        pollIntervalMs: 500,
        errorMessage: 'PageRef not available in CaaS after creation',
      }
    )
  }

  beforeEach(() => {
    randomId1 = faker.string.uuid()
    randomId2 = faker.string.uuid()
  })

  afterEach(async () => {
    try {
      const res = await caasClient.getCollection()
      const parsedRes = await res.json()
      await caasClient.removeCollection(parsedRes._etag.$oid)

      const res2 = await caasClient.getRemoteCollection()
      if (res2.status != 404) {
        const parsedRes2 = await res2.json()
        await caasClient.removeRemoteCollection(parsedRes2._etag.$oid)
      }
    } finally {
      await closeServer(server)
    }
  })

  it('local project id != remote project id, local locale != remote locale', async () => {
    await init(randomId2, 'en_GB')

    await retryAsync(async () => {
      const res: Page = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: 'de_DE',
      })
      expect(res.data.pt_pictureLocal.id).toEqual(res.data.pt_pictureRemote.id)
      expect(localMedia.description).toEqual(res.data.pt_pictureLocal.description)
      expect(remoteMedia.description).toEqual(
        res.data.pt_pictureRemote.description
      )
    }, { maxRetries: 5, delayMs: 1000 })
  }, TEST_TIMEOUTS.LONG)

  it('local project id != remote project id, local locale == remote locale', async () => {
    await init(randomId2, 'de_DE')

    await retryAsync(async () => {
      const res: Page = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: 'de_DE',
      })
      expect(res.data.pt_pictureLocal.id).toEqual(res.data.pt_pictureRemote.id)
      expect(localMedia.description).toEqual(res.data.pt_pictureLocal.description)
      expect(remoteMedia.description).toEqual(
        res.data.pt_pictureRemote.description
      )
    }, { maxRetries: 5, delayMs: 1000 })
  }, TEST_TIMEOUTS.LONG)

  it('local project id == remote project id, local locale != remote locale', async () => {
    await init(randomId1, 'en_GB')

    await retryAsync(async () => {
      const res: Page = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: 'de_DE',
      })
      expect(res.data.pt_pictureLocal.id).toEqual(res.data.pt_pictureRemote.id)
      expect(localMedia.description).toEqual(res.data.pt_pictureLocal.description)
      expect(remoteMedia.description).toEqual(
        res.data.pt_pictureRemote.description
      )
    }, { maxRetries: 5, delayMs: 1000 })
  }, TEST_TIMEOUTS.LONG)

  it('local project id == remote project id, local locale == remote locale', async () => {
    await init(randomId1, 'de_DE')

    await retryAsync(async () => {
      const res: Page = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: 'de_DE',
      })
      expect(res.data.pt_pictureLocal.id).toEqual(res.data.pt_pictureRemote.id)
      // Since projectId same and Ids the same, we expect the same media
      expect(res.data.pt_pictureRemote.description).toEqual(
        res.data.pt_pictureLocal.description
      )
    }, { maxRetries: 5, delayMs: 1000 })
  }, TEST_TIMEOUTS.LONG)

  it('local project id == remote project id, local locale == remote locale, different media Ids', async () => {
    await init(randomId1, 'de_DE', true)

    await retryAsync(async () => {
      const res: Page = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: 'de_DE',
      })
      expect(res.data.pt_pictureLocal.id).not.toEqual(
        res.data.pt_pictureRemote.id
      )
      expect(localMedia.description).toEqual(res.data.pt_pictureLocal.description)
      expect(remoteMedia.description).toEqual(
        res.data.pt_pictureRemote.description
      )
    }, { maxRetries: 5, delayMs: 1000 })
  }, TEST_TIMEOUTS.LONG)

  it('Dataset references on metadata of remote media should be fetchable', async () => {
    await init(randomId2, 'en_GB')

    await retryAsync(async () => {
      const res: Page = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: 'de_DE',
      })
      expect(res.data.pt_pictureRemote.meta.md_dataset.id).toEqual(
        dataset.identifier
      )
    }, { maxRetries: 5, delayMs: 1000 })
  }, TEST_TIMEOUTS.LONG)

  it('should leave references into an unconfigured project unresolved and still deliver the page', async () => {
    await init(randomId2, 'en_GB', true, {})

    await retryAsync(async () => {
      const res: Page = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: 'de_DE',
      })
      expect(typeof res.data.pt_datasetRemote).toEqual('string')
      expect(res.data.pt_datasetRemote).toContain('REFERENCED-REMOTE-ITEM')
      expect(typeof res.data.pt_pictureRemote).toEqual('string')
      expect(res.data.pt_pictureRemote).toContain('REFERENCED-REMOTE-ITEM')
      expect(localMedia.description).toEqual(res.data.pt_pictureLocal.description)
    }, { maxRetries: 5, delayMs: 1000 })
  }, TEST_TIMEOUTS.LONG)

  it('should use the configured locale even when the reference url names another one', async () => {
    // the remote project holds its documents in de_DE while the reference urls
    // claim en_GB - the configuration wins
    await init(randomId2, 'de_DE', true, { media: { id: randomId2, locale: 'de_DE' } }, 'en_GB')

    await retryAsync(async () => {
      const res: Page = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: 'de_DE',
      })
      expect(remoteMedia.description).toEqual(
        res.data.pt_pictureRemote.description
      )
      expect(res.data.pt_datasetRemote.id).toEqual(dataset.identifier)
    }, { maxRetries: 5, delayMs: 1000 })
  }, TEST_TIMEOUTS.LONG)

  it('should resolve a useSourceLocale project in the locale of the requested element', async () => {
    await init(randomId2, 'de_DE', true, { media: { id: randomId2, useSourceLocale: true } }, 'en_GB')

    await retryAsync(async () => {
      const res: Page = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: 'de_DE',
      })
      expect(remoteMedia.description).toEqual(
        res.data.pt_pictureRemote.description
      )
      expect(res.data.pt_datasetRemote.id).toEqual(dataset.identifier)
    }, { maxRetries: 5, delayMs: 1000 })
  }, TEST_TIMEOUTS.LONG)

  it('Dataset references on a local page should be resolved from the remote project', async () => {
    await init(randomId2, 'en_GB')

    await retryAsync(async () => {
      const res: Page = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: 'de_DE',
      })
      expect(typeof res.data.pt_datasetRemote).toEqual('object')
      expect(res.data.pt_datasetRemote.type).toEqual('Dataset')
      expect(res.data.pt_datasetRemote.id).toEqual(dataset.identifier)
    }, { maxRetries: 5, delayMs: 1000 })
  }, TEST_TIMEOUTS.LONG)
})
