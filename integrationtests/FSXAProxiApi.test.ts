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
<<<<<<< HEAD
import { createMediaPicture } from '../src/testutils/createMediaPicture'
import { createMediaPictureReference } from '../src/testutils/createDataEntry'
import { createDataset, createDatasetReference } from '../src/testutils/createDataset'
import { createPageRef } from '../src/testutils/createPageRef'
=======
import {
  createFsReference,
  createPageRef,
  createPageRefBody,
  createSection
} from '../src/testutils'
>>>>>>> feat(fsxa-api proxi api): it provides remote project id

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
  const randomProjectID = Faker.datatype.uuid()
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

    it('api returns resolved references if references are nested', async () => {
      const mediaPicture = createMediaPicture('pic-id')
      const dataset = createDataset('ds-id')
      const mediaPictureReference = createMediaPictureReference('pic-id')
      dataset.formData.image = mediaPictureReference
      const pageRef = createPageRef()
      const datasetReference = createDatasetReference('ds-id')
      pageRef.page.formData.dataset = datasetReference
      await caasClient.addItemsToCollection([pageRef, mediaPicture, dataset], locale)
      const res = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: `${locale.language}_${locale.country}`,
      })
      expect(res.data.dataset.data.image.id).toBe(mediaPicture._id)
    })

    it('references are resolved if they also occur within other references', async () => {
      const mediaPicture = createMediaPicture('pic-id')
      const mediaPictureReference = createMediaPictureReference('pic-id')
      const dataset = createDataset('ds-id')
      const datasetReference = createDatasetReference('ds-id')
      dataset.formData.image = mediaPictureReference
      const pageRef = createPageRef()
      pageRef.page.formData = { dataset: datasetReference, image: mediaPictureReference }
      await caasClient.addItemsToCollection([mediaPicture, pageRef, dataset], locale)
      const res = await proxyAPI.fetchElement({
        id: pageRef.identifier,
        locale: `${locale.language}_${locale.country}`,
      })
      expect(res.data.dataset.data.image.id).toBe(mediaPicture._id)
    })

    it('api returns matching doc if valid id is passed', async () => {
      const doc: TestDocument = {
        _id: Faker.datatype.uuid(),
        locale: {
          identifier: Faker.random.locale(),
          country: Faker.random.locale(),
          language: Faker.random.locale(),
        },
      }
      await caasClient.addDocToCollection(doc)
      const res = await proxyAPI.fetchElement({
        id: doc._id,
        locale: `${doc.locale.language}_${doc.locale.country}`,
        additionalParams: {},
      })
      expect(res._id).toEqual(doc._id + `.${doc.locale.language}_${doc.locale.country}`)
    })
    it('api returns projection of doc if additional params are set', async () => {
      const doc: TestDocument = {
        _id: Faker.datatype.uuid(),
        displayName: Faker.commerce.productName(),
        locale: {
          identifier: Faker.random.locale(),
          country: Faker.random.locale(),
          language: Faker.random.locale(),
        },
      }
      await caasClient.addDocToCollection(doc)
      const res = await proxyAPI.fetchElement({
        id: doc._id,
        locale: `${doc.locale.language}_${doc.locale.country}`,
        additionalParams: {
          keys: [{ displayName: 1 }],
        },
      })
      expect(res.displayName).toEqual(doc.displayName)
    })
    it('api returns projection of doc if additional params with special chars are set', async () => {
      const doc: TestDocument = {
        _id: Faker.datatype.uuid(),
        "specialChars *'();:@&=+$,/?%#[]": Faker.commerce.productName(),
        locale: {
          identifier: Faker.random.locale(),
          country: Faker.random.locale(),
          language: Faker.random.locale(),
        },
      }
      await caasClient.addDocToCollection(doc)
      const res = await proxyAPI.fetchElement({
        id: doc._id,
        locale: `${doc.locale.language}_${doc.locale.country}`,
        additionalParams: {
          keys: [{ "specialChars *'();:@&=+$,/?%#[]": 1 }],
        },
      })
      expect(res["specialChars *'();:@&=+$,/?%#[]"]).toEqual(doc["specialChars *'();:@&=+$,/?%#[]"])
    })
    it('api returns doc if special chars are used in locale', async () => {
      const doc: TestDocument = {
        _id: Faker.datatype.uuid(),
        locale: {
          identifier: Faker.random.locale(),
          country: Faker.random.locale(),
          language: "specialChars *'();:@&=+$,?%#[]", // forward slash / does not work
        },
      }
      await caasClient.addDocToCollection(doc)
      const res = await proxyAPI.fetchElement({
        id: doc._id,
        locale: `${doc.locale.language}_${doc.locale.country}`,
      })
      expect(res._id).toEqual(doc._id + `.${doc.locale.language}_${doc.locale.country}`)
    })
    it('api returns doc if special chars are used in id', async () => {
      const doc: TestDocument = {
        _id: "*'();:@&=+$,?%#[]", // forward slash / does not work
        locale: {
          identifier: Faker.random.locale(),
          country: Faker.random.locale(),
          language: Faker.random.locale(),
        },
      }
      await caasClient.addDocToCollection(doc)
      const res = await proxyAPI.fetchElement({
        id: doc._id,
        locale: `${doc.locale.language}_${doc.locale.country}`,
      })
      expect(res._id).toEqual(doc._id + `.${doc.locale.language}_${doc.locale.country}`)
    })

    it('api return matching the reference with remote project', function () {
      const pageRef = createPageRef()
      const pageRefBody = createPageRefBody()
      const section = createSection()
      const fsReference = createFsReference()
      // Populate Data
      section.formData = {
        st_ref: fsReference
      }
      pageRefBody.children.push(section)
      pageRef.page.children.push(pageRefBody)

      expect(pageRef.page.children.length).toBeGreaterThan(0)
      expect(pageRefBody.children.some(pageBody => pageBody.fsType === 'Section')).toBe(true)
      expect(Object.hasOwnProperty.call(section.formData, 'st_ref')).toBe(true)
      expect(section.formData.st_ref).toMatchObject(fsReference)
    });
  })
  describe('fetchByFilter', () => {
    const country = 'GB'
    const language = 'en'
    const identifier = 'EN'
    describe('filter with EQUALS operator', () => {
      it('api returns only matching data if filter is applied', async () => {
        const a = Faker.datatype.uuid()
        const b = Faker.datatype.uuid()
        const doc1: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: a,
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc2: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: a,
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc3: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: b,
          locale: {
            identifier,
            country,
            language,
          },
        }
        const docs = [doc1, doc2, doc3]
        await caasClient.addDocsToCollection(docs)
        const comparisonFilter: QueryBuilderQuery = {
          field: 'filterProp',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: a,
        }
        const { items } = await proxyAPI.fetchByFilter({
          filters: [comparisonFilter],
          locale: 'en_GB',
        })
        // only return elements that match, not more
        expect(items.length).toEqual(2)
        for (const item of items) {
          // @ts-ignore
          expect(item.filterProp).toEqual(a)
        }
      })
      it('api returns sorted data if sort option is passed', async () => {
        const filterProp = Faker.datatype.uuid()
        const doc1: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          sortProp: 'B',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc2: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          sortProp: 'A',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc3: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          sortProp: 'C',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const docs = [doc1, doc2, doc3]
        await caasClient.addDocsToCollection(docs)
        const comparisonFilter: QueryBuilderQuery = {
          field: 'filterProp',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: filterProp,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [comparisonFilter],
          locale: 'en_GB',
          sort: [{ name: 'sortProp' }],
        })
        expect(items.length).toEqual(3)
        expect(items[0]._id).toEqual(doc2._id + '.en_GB')
        expect(items[1]._id).toEqual(doc1._id + '.en_GB')
        expect(items[2]._id).toEqual(doc3._id + '.en_GB')
      })
      it('api returns descending sorted data if sort option with descend is passed', async () => {
        const filterProp = Faker.datatype.uuid()
        const doc1: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          sortProp: 'B',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc2: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          sortProp: 'A',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc3: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          sortProp: 'C',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const docs = [doc1, doc2, doc3]
        await caasClient.addDocsToCollection(docs)
        const comparisonFilter: QueryBuilderQuery = {
          field: 'filterProp',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: filterProp,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [comparisonFilter],
          locale: 'en_GB',
          sort: [{ name: 'sortProp', order: 'desc' }],
        })
        expect(items.length).toEqual(3)
        expect(items[0]._id).toEqual(doc3._id + '.en_GB')
        expect(items[1]._id).toEqual(doc1._id + '.en_GB')
        expect(items[2]._id).toEqual(doc2._id + '.en_GB')
      })
      it('api returns descending sorted data if sort option with special chars is passed', async () => {
        const filterProp = Faker.datatype.uuid()
        const doc1: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          "sortPropWithSpecialChars *'();:@&=+$,/?%#[]": 'B',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc2: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          "sortPropWithSpecialChars *'();:@&=+$,/?%#[]": 'A',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc3: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          "sortPropWithSpecialChars *'();:@&=+$,/?%#[]": 'C',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const docs = [doc1, doc2, doc3]
        await caasClient.addDocsToCollection(docs)
        const comparisonFilter: QueryBuilderQuery = {
          field: 'filterProp',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: filterProp,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [comparisonFilter],
          locale: 'en_GB',
          sort: [{ name: "sortPropWithSpecialChars *'();:@&=+$,/?%#[]" }],
        })
        expect(items.length).toEqual(3)
        expect(items[0]._id).toEqual(doc2._id + '.en_GB')
        expect(items[1]._id).toEqual(doc1._id + '.en_GB')
        expect(items[2]._id).toEqual(doc3._id + '.en_GB')
      })
      it('api returns docs from page if page param & pagesize is passed', async () => {
        const filterProp = Faker.datatype.uuid()
        const doc1: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          sortProp: 'A',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc2: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          sortProp: 'B',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc3: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: filterProp,
          sortProp: 'C',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const docs = [doc1, doc2, doc3]
        await caasClient.addDocsToCollection(docs)
        const comparisonFilter: QueryBuilderQuery = {
          field: 'filterProp',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: filterProp,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [comparisonFilter],
          locale: 'en_GB',
          sort: [{ name: 'sortProp' }],
          pagesize: 2,
          page: 2,
        })
        expect(items.length).toEqual(1)
        expect(items[0]._id).toEqual(doc3._id + '.en_GB')
      })
    })

    describe('filter with REGEX operator', () => {
      it('api returns matching data if simple regex matches', async () => {
        const regex = 'gray|grey'
        const doc1: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: 'gray',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc2: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: 'grey',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc3: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: 'green',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const docs = [doc1, doc2, doc3]
        await caasClient.addDocsToCollection(docs)
        const regexFilter: QueryBuilderQuery = {
          field: 'filterProp',
          operator: EvaluationQueryOperatorEnum.REGEX,
          value: regex,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [regexFilter],
          locale: language + '_' + country,
        })
        expect(items.length).toEqual(2)
        for (const item of items) {
          // @ts-ignore
          expect(item.filterProp).toMatch(new RegExp(regex))
        }
      })
      it('api returns matching data if complex regex with special chars matches', async () => {
        const regex = '[!@#$%^&*(),.?"+:{}|<>]'
        const doc1: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: 'gray+',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc2: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: 'grey!',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const doc3: TestDocument = {
          _id: Faker.datatype.uuid(),
          filterProp: 'green',
          locale: {
            identifier,
            country,
            language,
          },
        }
        const docs = [doc1, doc2, doc3]
        await caasClient.addDocsToCollection(docs)
        const regexFilter: QueryBuilderQuery = {
          field: 'filterProp',
          operator: EvaluationQueryOperatorEnum.REGEX,
          value: regex,
        }
        const { items }: { items: Array<any> } = await proxyAPI.fetchByFilter({
          filters: [regexFilter],
          locale: language + '_' + country,
        })
        expect(items.length).toEqual(2)
        for (const item of items) {
          // @ts-ignore
          expect(item.filterProp).toMatch(new RegExp(regex))
        }
      })
    })
  })
})
