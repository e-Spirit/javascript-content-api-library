import dotenv from 'dotenv'
import express, { Express } from 'express'
import cors from 'cors'
import { FSXAContentMode, FSXAProxyApi, LogLevel, QueryBuilderQuery } from '../src'
import { default as expressIntegration } from '../src/integrations/express'
import { FSXARemoteApi } from '../src/modules/FSXARemoteApi'
import {
  ComparisonQueryOperatorEnum,
  EvaluationQueryOperatorEnum,
} from '../src/modules/QueryBuilder'
import { CaasTestingClient } from './utils'
import { TestDocument } from './types'
import { Server } from 'http'
import Faker from 'faker'
import { createDataset, createDatasetReference } from '../src/testutils/createDataset'
import { createMediaFile } from '../src/testutils/createMediaFile'
import { createMediaPictureReference } from '../src/testutils/createDataEntry'
import { createMediaPicture } from '../src/testutils/createMediaPicture'
import { createPageRef } from '../src/testutils/createPageRef'

dotenv.config({ path: './integrationtests/.env' })

const { INTEGRATION_TEST_API_KEY, INTEGRATION_TEST_CAAS } = process.env

// promisify server start so we can await it in jest
const startSever = (app: Express) =>
  new Promise<Server>((resolve) => {
    const server = app.listen(3002, async () => {
      resolve(server)
    })
  })

describe('FSXAProxyAPI', () => {
  const randomProjectID = 'integration-tests-lukas'
  const tenantID = 'fsxa-api-integration-test'
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
    maxNestingLevel: 8,
  })

  let proxyAPI: FSXAProxyApi
  let server: Server
  let caasClient: CaasTestingClient

  beforeAll(async () => {
    // start express server
    const app = express()
    app.use(cors())
    app.use('/api', expressIntegration({ api: remoteApi }))
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

  // TODO
  // possible issue: if tests are ran in parallel and they all access the same collection
  // there could be an issue because they all access the same data
  // soloution: before each test: create random collection for the test
  // its probably also better to run tests in dedicated database named with hostname suffix and delete this before each test

  // another issue: database can be trashed, if tests break unexpectedly
  // soloution: name collection after hostname and delete before running the tests

  afterAll(async () => {
    const res = await caasClient.getCollection()
    const parsedRes = await res.json()
    await caasClient.removeCollection(parsedRes._etag.$oid)
    server.close()
  })
  describe('fetchElement', () => {
    const locale = {
      identifier: 'de_DE',
      country: 'DE',
      language: 'de',
    }
    it('api returns matching doc if valid id is passed', async () => {
      const dataset = createDataset()
      await caasClient.addDocToCollection(dataset, locale)
      const res = await proxyAPI.fetchElement({
        id: dataset._id,
        locale: `${locale.language}_${locale.country}`,
        additionalParams: {},
      })
      expect(res.id).toEqual(dataset._id)
    })
    it('api returns projection of doc if additional params are set', async () => {
      const dataset = createDataset()
      await caasClient.addDocToCollection(dataset, locale)
      const res = await proxyAPI.fetchElement({
        id: dataset._id,
        locale: `${locale.language}_${locale.country}`,
        additionalParams: {
          keys: [{ displayName: 1 }],
        },
      })
      expect(res.displayName).toEqual(dataset.displayName)
    })
    it('api returns projection of doc if additional params with special chars are set', async () => {
      const dataset: any = createDataset()
      dataset["specialChars *'();:@&=+$,/?%#[]"] = Faker.commerce.productName()
      await caasClient.addDocToCollection(dataset, locale)
      const res = await proxyAPI.fetchElement({
        id: dataset._id,
        locale: `${locale.language}_${locale.country}`,
        additionalParams: {
          keys: [{ "specialChars *'();:@&=+$,/?%#[]": 1 }],
        },
      })
      expect(res["specialChars *'();:@&=+$,/?%#[]"]).toEqual(
        dataset["specialChars *'();:@&=+$,/?%#[]"]
      )
    })
    it('api returns doc if special chars are used in locale', async () => {
      const dataset = createDataset()
      const localeWithSpecialChars = {
        identifier: Faker.random.locale(),
        country: Faker.random.locale(),
        language: "specialChars *'();:@&=+$,?%#[]", // forward slash / does not work
      }

      await caasClient.addDocToCollection(dataset, localeWithSpecialChars)
      const res = await proxyAPI.fetchElement({
        id: dataset._id,
        locale: `${localeWithSpecialChars.language}_${localeWithSpecialChars.country}`,
      })
      expect(res.id).toEqual(dataset._id)
    })
    it('api returns doc if special chars are used in id', async () => {
      const dataset = createDataset("*'();:@&=+$,?%#[]")
      await caasClient.addDocToCollection(dataset, locale)
      const res = await proxyAPI.fetchElement({
        id: dataset._id,
        locale: `${locale.language}_${locale.country}`,
      })
      expect(res.id).toEqual(dataset._id)
    })
    it('api returns resolved references if references are nested', async () => {
      const mediaPicture = createMediaPicture('pic-id')
      const mediaPictureReference = createMediaPictureReference('pic-id')
      const dataset = createDataset('ds-id')
      const datasetReference = createDatasetReference('ds-id')
      dataset.formData.image = mediaPictureReference
      const pageRef = createPageRef()
      pageRef.page.formData.dataset = datasetReference
      await caasClient.addDocsToCollection([pageRef, mediaPicture, dataset], locale)
      const res = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: `${locale.language}_${locale.country}`,
      })
      expect(res.data.dataset.data.image.id).toBe(mediaPicture._id)
    })
    it('api returns [REFERENCED-ITEM-[id]] if nesting limit is hit', async () => {
      const dataset = createDataset('ds-id')
      const datasetReference = createDatasetReference('ds-id')
      dataset.formData.dsref = datasetReference
      const pageRef = createPageRef()
      pageRef.page.formData.dataset = datasetReference
      await caasClient.addDocsToCollection([dataset, pageRef], locale)

      const res = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: `${locale.language}_${locale.country}`,
      })
      console.log(JSON.stringify(res, null, 2))
      // expect(data.dataset.data.dataset).toBe(`[REFERENCED-ITEM-${dataset._id}]`)
    })
    it('references are resolved if they also occur within other references', async () => {
      const mediaPicture = createMediaPicture('pic-id')
      const mediaPictureReference = createMediaPictureReference('pic-id')
      const dataset = createDataset('ds-id')
      const datasetReference = createDatasetReference('ds-id')
      dataset.formData.image = mediaPictureReference
      const pageRef = createPageRef()
      pageRef.page.formData = { dataset: datasetReference, image: mediaPictureReference }
      await caasClient.addDocsToCollection([mediaPicture, pageRef, dataset], locale)
      const res = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: `${locale.language}_${locale.country}`,
      })
      expect(res.data.dataset.data.image.id).toBe(mediaPicture._id)
    })

    // TODO: test reference from german locale to english locale
    // TODO: test multiple circular references
  })
  describe('fetchByFilter', () => {
    const locale = {
      identifier: 'de_DE',
      country: 'DE',
      language: 'de',
    }
    describe('filter with EQUALS operator', () => {
      it('api returns only matching data if filter is applied', async () => {
        const filterPropA = Faker.datatype.uuid()
        const filterPropB = Faker.datatype.uuid()
        const dataset1 = createDataset()
        dataset1.displayName = filterPropA
        const dataset2 = createDataset()
        dataset2.displayName = filterPropA
        const dataset3 = createDataset()
        dataset3.displayName = filterPropB
        const docs = [dataset1, dataset2, dataset3]
        await caasClient.addDocsToCollection(docs, locale)
        const comparisonFilter: QueryBuilderQuery = {
          field: 'displayName',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: filterPropA,
        }
        const { items } = await proxyAPI.fetchByFilter({
          filters: [comparisonFilter],
          locale: `${locale.language}_${locale.country}`,
          additionalParams: {
            keys: [{ displayName: 1 }],
          },
        })
        expect(items.length).toEqual(2)
        for (const item of items) {
          // @ts-ignore
          expect(item.displayName).toEqual(filterPropA)
        }
      })
      it('api returns sorted data if sort option is passed', async () => {
        const filterProp = Faker.datatype.uuid()
        const dataset1 = createDataset()
        dataset1.displayName = 'B'
        dataset1.schema = filterProp
        const dataset2 = createDataset()
        dataset2.displayName = 'A'
        dataset2.schema = filterProp
        const dataset3 = createDataset()
        dataset3.displayName = 'C'
        dataset3.schema = filterProp
        const docs = [dataset1, dataset2, dataset3]
        await caasClient.addDocsToCollection(docs, locale)
        const comparisonFilter: QueryBuilderQuery = {
          field: 'schema',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: filterProp,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [comparisonFilter],
          locale: `${locale.language}_${locale.country}`,
          sort: [{ name: 'displayName' }],
        })
        expect(items.length).toEqual(3)
        expect(items[0].id).toEqual(dataset2._id)
        expect(items[1].id).toEqual(dataset1._id)
        expect(items[2].id).toEqual(dataset3._id)
      })
      it('api returns descending sorted data if sort option with descend is passed', async () => {
        const filterProp = Faker.datatype.uuid()
        const dataset1 = createDataset()
        dataset1.displayName = 'B'
        dataset1.schema = filterProp
        const dataset2 = createDataset()
        dataset2.displayName = 'A'
        dataset2.schema = filterProp
        const dataset3 = createDataset()
        dataset3.displayName = 'C'
        dataset3.schema = filterProp
        const docs = [dataset1, dataset2, dataset3]
        await caasClient.addDocsToCollection(docs, locale)
        const comparisonFilter: QueryBuilderQuery = {
          field: 'schema',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: filterProp,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [comparisonFilter],
          locale: `${locale.language}_${locale.country}`,
          sort: [{ name: 'displayName', order: 'desc' }],
        })
        expect(items.length).toEqual(3)
        expect(items[0].id).toEqual(dataset3._id)
        expect(items[1].id).toEqual(dataset1._id)
        expect(items[2].id).toEqual(dataset2._id)
      })
      it('api returns descending sorted data if sort option with special chars is passed', async () => {
        const filterProp = Faker.datatype.uuid()
        const dataset1: any = createDataset()
        dataset1["sortPropWithSpecialChars *'();:@&=+$,/?%#[]"] = 'B'
        dataset1.schema = filterProp
        const dataset2: any = createDataset()
        dataset2["sortPropWithSpecialChars *'();:@&=+$,/?%#[]"] = 'A'
        dataset2.schema = filterProp
        const dataset3: any = createDataset()
        dataset3["sortPropWithSpecialChars *'();:@&=+$,/?%#[]"] = 'C'
        dataset3.schema = filterProp
        const docs = [dataset1, dataset2, dataset3]
        await caasClient.addDocsToCollection(docs, locale)
        const comparisonFilter: QueryBuilderQuery = {
          field: 'schema',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: filterProp,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [comparisonFilter],
          locale: `${locale.language}_${locale.country}`,
          sort: [{ name: "sortPropWithSpecialChars *'();:@&=+$,/?%#[]" }],
        })
        expect(items.length).toEqual(3)
        expect(items[0].id).toEqual(dataset2._id)
        expect(items[1].id).toEqual(dataset1._id)
        expect(items[2].id).toEqual(dataset3._id)
      })
      it('api returns docs from page if page param & pagesize is passed', async () => {
        const filterProp = Faker.datatype.uuid()
        const dataset1 = createDataset()
        dataset1.displayName = 'B'
        dataset1.schema = filterProp
        const dataset2 = createDataset()
        dataset2.displayName = 'A'
        dataset2.schema = filterProp
        const dataset3 = createDataset()
        dataset3.displayName = 'C'
        dataset3.schema = filterProp
        const docs = [dataset1, dataset2, dataset3]
        await caasClient.addDocsToCollection(docs, locale)
        const comparisonFilter: QueryBuilderQuery = {
          field: 'schema',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: filterProp,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [comparisonFilter],
          locale: `${locale.language}_${locale.country}`,
          sort: [{ name: 'displayName' }],
          pagesize: 2,
          page: 2,
        })
        expect(items.length).toEqual(1)
        expect(items[0].id).toEqual(dataset3._id)
      })
    })
    describe('filter with REGEX operator', () => {
      it('api returns matching data if simple regex matches', async () => {
        const regex = 'gray|grey'
        const dataset1 = createDataset()
        dataset1.displayName = 'grey'
        const dataset2 = createDataset()
        dataset2.displayName = 'gray'
        const dataset3 = createDataset()
        dataset3.displayName = 'green'
        const docs = [dataset1, dataset2, dataset3]
        await caasClient.addDocsToCollection(docs, locale)
        const regexFilter: QueryBuilderQuery = {
          field: 'displayName',
          operator: EvaluationQueryOperatorEnum.REGEX,
          value: regex,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [regexFilter],
          locale: `${locale.language}_${locale.country}`,
          additionalParams: {
            keys: [{ displayName: 1 }],
          },
        })
        expect(items.length).toEqual(2)
        for (const item of items) {
          // @ts-ignore
          expect(item.displayName).toMatch(new RegExp(regex))
        }
      })
      it('api returns matching data if complex regex with special chars matches', async () => {
        const regex = '[!@#$%^&*(),.?"+:{}|<>]'
        const dataset1 = createDataset()
        dataset1.displayName = 'grey!'
        const dataset2 = createDataset()
        dataset2.displayName = 'gray+'
        const dataset3 = createDataset()
        dataset3.displayName = 'green'
        const docs = [dataset1, dataset2, dataset3]
        await caasClient.addDocsToCollection(docs, locale)
        const regexFilter: QueryBuilderQuery = {
          field: 'displayName',
          operator: EvaluationQueryOperatorEnum.REGEX,
          value: regex,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [regexFilter],
          locale: `${locale.language}_${locale.country}`,
          additionalParams: {
            keys: [{ displayName: 1 }],
          },
        })
        expect(items.length).toEqual(2)
        for (const item of items) {
          // @ts-ignore
          expect(item.displayName).toMatch(new RegExp(regex))
        }
      })
    })
  })
})
