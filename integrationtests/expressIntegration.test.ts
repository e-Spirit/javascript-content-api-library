import dotenv from 'dotenv'
import express, { Express } from 'express'
import cors from 'cors'
import { Server } from 'http'
import { CaasTestingClient } from './utils'
import {
  FSXAApiErrors,
  FSXAContentMode,
  FSXARemoteApi,
  LogLevel,
  HttpStatus,
} from '../src'
import Faker from 'faker'
import {
  ExpressRouterIntegrationErrors,
  default as expressIntegration,
} from '../src/integrations/express'
import {
  createDataset,
  createDatasetReference,
} from '../src/testutils/createDataset'
import { FetchElementRouteBody } from '../src/routes'
import {
  ComparisonQueryOperatorEnum,
  Logger,
  QueryBuilder,
} from '../src/modules'

dotenv.config({ path: './integrationtests/.env' })
const {
  INTEGRATION_TEST_API_KEY,
  INTEGRATION_TEST_CAAS,
  INTEGRATION_TEST_NAVIGATION_SERVICE,
} = process.env
const PORT = 3002
const UNAUTHORIZED_PORT = 3333

const startSever = (app: Express, port: number) =>
  new Promise<Server>((resolve) => {
    const server = app.listen(port, async () => {
      resolve(server)
    })
  })

describe('express integration', () => {
  const randomProjectID = Faker.datatype.uuid()
  const tenantID = 'fsxa-api-integration-test'

  const locale = {
    identifier: 'de_DE',
    country: 'DE',
    language: 'de',
  }

  let caasClientProperties = {
    apikey: INTEGRATION_TEST_API_KEY!,
    caasURL: INTEGRATION_TEST_CAAS!,
    projectID: randomProjectID,
    tenantID: tenantID,
    contentMode: FSXAContentMode.PREVIEW,
  }
  const remoteApi = new FSXARemoteApi({
    apikey: INTEGRATION_TEST_API_KEY!,
    caasURL: INTEGRATION_TEST_CAAS!,
    contentMode: FSXAContentMode.PREVIEW,
    navigationServiceURL: INTEGRATION_TEST_NAVIGATION_SERVICE!,
    projectID: randomProjectID,
    tenantID: tenantID,
    remotes: { media: { id: 'remoteProjectId', locale: locale.identifier } },
    logLevel: LogLevel.DEBUG,
    enableEventStream: false,
  })

  const remoteApiInvalidApikey = new FSXARemoteApi({
    apikey: 'invalid-apikey',
    caasURL: INTEGRATION_TEST_CAAS!,
    contentMode: FSXAContentMode.PREVIEW,
    navigationServiceURL: INTEGRATION_TEST_NAVIGATION_SERVICE!,
    projectID: randomProjectID,
    tenantID: tenantID,
    remotes: { media: { id: 'remoteProjectId', locale: locale.identifier } },
    logLevel: LogLevel.DEBUG,
    enableEventStream: false,
  })

  let unauthorizedServer: Server
  let server: Server
  let caasClient: CaasTestingClient
  const clearCaasCollection = async () => {
    const res = await caasClient.getCollection()
    const parsedRes = await res.json()
    await caasClient.removeCollection(parsedRes._etag.$oid)
  }

  beforeAll(async () => {
    // start express server
    const app = express()
    app.use(cors())
    app.use('/api', expressIntegration({ api: remoteApi }))
    server = await startSever(app, PORT)

    // start unauthorized express server
    const unauthorizedApp = express()
    unauthorizedApp.use(cors())
    unauthorizedApp.use(
      '/api',
      expressIntegration({ api: remoteApiInvalidApikey })
    )
    unauthorizedServer = await startSever(unauthorizedApp, UNAUTHORIZED_PORT)

    // create instance of caas client to easily read and write testing data to caas
    caasClient = await CaasTestingClient.init(caasClientProperties)
  })

  afterAll(async () => {
    await clearCaasCollection()
    server.close()
    unauthorizedServer.close()
  })
  describe('error handling', () => {
    describe('fetch element route', () => {
      it('should return a message with status 404 if a non-existing element is requested', async () => {
        const body = { id: 'non-existing-element', locale: locale.identifier }
        const res = await fetch(`http://localhost:${PORT}/api/elements`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify(body),
        })
        const json = await res.json()
        expect(res.status).toBe(404)
        expect(json).toHaveProperty('message')
        expect(json.message).toContain(FSXAApiErrors.NOT_FOUND)
      })
      it('should return a message with status 404 if a non-existing remote Project is requested', async () => {
        const dataset = createDataset('ds1-id')
        const referencedDataset = createDataset('ds2-id')
        const datasetReference = createDatasetReference('ds2-id')
        dataset.formData.dsref = datasetReference
        await caasClient.addItemsToCollection(
          [dataset, referencedDataset],
          locale
        )
        const body: FetchElementRouteBody = {
          id: dataset.identifier,
          locale: locale.identifier,
          remote: 'non-existing-remote-project-id',
        }
        const res = await fetch(
          `http://localhost:${PORT}/api/elements/${dataset.identifier}`,
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(body),
          }
        )
        const json = await res.json()
        expect(res.status).toBe(404)
        expect(json).toHaveProperty('message')
        expect(json.message).toContain(FSXAApiErrors.UNKNOWN_REMOTE)
      })
      it('should return an error with status 400 if the remote api responds 400', async () => {
        const body = { id: 'non-existing-element' }
        const res = await fetch(`http://localhost:${PORT}/api/elements`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify(body),
        })
        const json = await res.json()
        expect(res.status).toBe(400)
        expect(json).toHaveProperty('error')
        expect(json.error).toContain(
          ExpressRouterIntegrationErrors.MISSING_LOCALE
        )
      })
      it('should return an error 401 if the remote api responds 401', async () => {
        const dataset = createDataset('ds1-id')
        const referencedDataset = createDataset('ds2-id')
        const datasetReference = createDatasetReference('ds2-id')
        dataset.formData.dsref = datasetReference
        await caasClient.addItemsToCollection(
          [dataset, referencedDataset],
          locale
        )

        const body = { id: dataset.identifier, locale: locale.identifier }
        const res = await fetch(
          `http://localhost:${UNAUTHORIZED_PORT}/api/elements`,
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(body),
          }
        )
        const json = await res.json()
        expect(res.status).toBe(401)
        expect(json).toHaveProperty('message')
        expect(json.message).toContain(FSXAApiErrors.NOT_AUTHORIZED)
      })
    })
    describe('fetch navigation route', () => {
      it('should return an error 400 if the remote api responds 400', async () => {
        const body = { initialPath: '/' }
        const res = await fetch(`http://localhost:${PORT}/api/navigation`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify(body),
        })
        const json = await res.json()
        expect(res.status).toBe(400)
        expect(json).toHaveProperty('error')
        expect(json.error).toContain(
          ExpressRouterIntegrationErrors.MISSING_LOCALE
        )
      })
      it('should return an error 404 if the remote api responds 404', async () => {
        const body = {
          initialPath: '/non-existing-path',
          locale: locale.identifier,
        }
        const res = await fetch(`http://localhost:${PORT}/api/navigation`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify(body),
        })
        const json = await res.json()
        expect(res.status).toBe(404)
        expect(json).toHaveProperty('message')
        expect(json.message).toContain(FSXAApiErrors.NOT_FOUND)
      })
      it('should return an error 500 if the remote api responds 500', async () => {})
    })
    describe('fetch by filter route', () => {
      const builder = new QueryBuilder(
        new Logger(LogLevel.NONE, 'Querybuilder')
      )
      it.skip('should return an error 404 if the remote api responds 404', async () => {
        const filter = builder.build({
          operator: ComparisonQueryOperatorEnum.EQUALS,
          field: 'id',
          value: 'non-existing-id',
        })
        const body = {
          filters: [filter],
          locale: locale.identifier,
        }
        const res = await fetch(`http://localhost:${PORT}/api/filter`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify(body),
        })
        const json = await res.json()
        expect(res.status).toBe(404)
        expect(json).toHaveProperty('message')
        expect(json.message).toContain(FSXAApiErrors.NOT_FOUND)
      })
      it('should return an error 401 if the remote api responds 401', async () => {
        const filter = {
          operator: ComparisonQueryOperatorEnum.EQUALS,
          field: 'id',
          value: 'non-existing-id',
        }
        const body = {
          filters: [filter],
          locale: locale.identifier,
        }
        const res = await fetch(
          `http://localhost:${UNAUTHORIZED_PORT}/api/filter`,
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(body),
          }
        )
        const json = await res.json()
        expect(res.status).toBe(401)
        expect(json).toHaveProperty('message')
        expect(json.message).toContain(FSXAApiErrors.NOT_AUTHORIZED)
      })
    })
    describe('fetch projectProperties route', () => {
      it('should return an error 400 if the remote api responds 400', async () => {
        const body = {}
        const res = await fetch(`http://localhost:${PORT}/api/properties`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify(body),
        })
        const json = await res.json()
        expect(res.status).toBe(400)
        expect(json).toHaveProperty('error')
        expect(json.error).toContain(
          ExpressRouterIntegrationErrors.MISSING_LOCALE
        )
      })
      it.skip('should return an error 404 if the remote api responds 404', async () => {
        const body = { locale: 'tr_TR' }
        const res = await fetch(
          `http://localhost:${PORT}/api/properties/test`,
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(body),
          }
        )
        const json = await res.json()
        expect(res.status).toBe(404)
        expect(json).toHaveProperty('message')
        expect(json.message).toContain(FSXAApiErrors.NOT_FOUND)
      })
      it('should return an error 401 if the remote api responds 401', async () => {
        const body = { locale: locale.identifier }
        const res = await fetch(
          `http://localhost:${UNAUTHORIZED_PORT}/api/properties`,
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(body),
          }
        )
        const json = await res.json()
        expect(res.status).toBe(401)
        expect(json).toHaveProperty('message')
        expect(json.message).toContain(FSXAApiErrors.NOT_AUTHORIZED)
      })
    })
  })
})
