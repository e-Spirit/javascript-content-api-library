import { TestDocument } from './types'
import 'cross-fetch/polyfill'
import { FSXAContentMode } from '../src/enums'


export enum RequestMethodEnum {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

interface CaaSTestingClientData {
  caasURL: string
  tenantID: string
  apikey: string
  projectID: string
  contentMode: FSXAContentMode
}

/**
 * The CaaSTestingClient is used as a helper to quickly add and remove testing data directly to the CaaS
 */
export class CaaSTestingClient {
  baseUrl: string
  headers: HeadersInit
  projectId: string
  contentMode: FSXAContentMode

  private constructor(CaaSTestingClientData: CaaSTestingClientData) {
    this.headers = {
      Authorization: `apikey="${CaaSTestingClientData.apikey}"`,
      'Content-Type': 'application/json',
    }
    this.projectId = CaaSTestingClientData.projectID
    this.contentMode = CaaSTestingClientData.contentMode
    this.baseUrl = `${CaaSTestingClientData.caasURL}/${CaaSTestingClientData.tenantID}/${CaaSTestingClientData.projectID}.${CaaSTestingClientData.contentMode}.content`
  }

  /**
   * Initialize the CaaSTestingClient
   * @param CaaSTestingClientData data for testing client
   * @returns CaaSTestingClient
   */
  static async init(CaaSTestingClientData: CaaSTestingClientData) {
    const caasClient = new CaaSTestingClient(CaaSTestingClientData)
    await caasClient.createCollection()
    return caasClient
  }

  /**
   * Get collection from integration test database in CaaS
   * @param collectionName Name of collection to get
   * @returns Http Response
   */
  async getCollection() {
    return await fetch(this.baseUrl, {
      method: RequestMethodEnum.GET,
      headers: this.headers,
    })
  }

  /**
   * Create collection in integration test database in CaaS
   * @returns Http Response
   */
  async createCollection() {
    return await fetch(this.baseUrl, {
      method: RequestMethodEnum.PUT,
      headers: this.headers,
    })
  }

  /**
   * Delete collection from integration test database in CaaS
   * @param etag Etag of colleciton to delete
   * @returns Http Response
   */
  async removeCollection(etag: string) {
    return await fetch(this.baseUrl, {
      method: RequestMethodEnum.DELETE,
      headers: {
        ...this.headers,
        'If-Match': etag,
      },
    })
  }

  /**
   * Add doc to collection in integration test database in CaaS
   * @param docs doc to add
   * @returns Http Response
   */
  async addDocToCollection(doc: TestDocument) {
    const encodedLocale = encodeURIComponent(`${doc.locale.language}_${doc.locale.country}`)
    const encodedId = encodeURIComponent(doc._id)
    const url = this.baseUrl + `/${encodedId}.${encodedLocale}`
    const docWithLocale = { ...doc, _id: undefined }
    return await fetch(url, {
      method: RequestMethodEnum.PUT,
      headers: this.headers,
      body: JSON.stringify(docWithLocale) || null,
    })
  }

  /**
   * Bulk post docs to collection in integration test database in CaaS
   * @param docs docs to add
   * @returns Http Response
   */
  async addDocsToCollection(docs: TestDocument[]) {
    const docsWithLocale = docs.map((doc) => {
      const docWithLocale = { ...doc }
      docWithLocale._id += `.${doc.locale.language}_${doc.locale.country}`
      return docWithLocale
    })
    return await fetch(this.baseUrl, {
      method: RequestMethodEnum.POST,
      headers: this.headers,
      body: JSON.stringify(docsWithLocale) || null,
    })
  }
}
