import { TestDocument, Locale } from './types'
import 'cross-fetch/polyfill'
import { FSXAContentMode } from '../src/enums'
import { CaasApi_Item } from '../src'

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
  remoteProjectId?: string
}

/**
 * The CaaSTestingClient is used as a helper to quickly add and remove testing data directly to the CaaS
 */
export class CaasTestingClient {
  baseUrl: string
  headers: HeadersInit
  projectId: string
  contentMode: FSXAContentMode
  caasTestingClientData: CaaSTestingClientData

  remoteProjectId: string | undefined
  remoteBaseUrl: string | undefined

  private constructor(CaaSTestingClientData: CaaSTestingClientData) {
    this.headers = {
      Authorization: `apikey="${CaaSTestingClientData.apikey}"`,
      'Content-Type': 'application/json',
    }
    this.caasTestingClientData = CaaSTestingClientData
    this.projectId = CaaSTestingClientData.projectID
    this.contentMode = CaaSTestingClientData.contentMode
    this.baseUrl = `${CaaSTestingClientData.caasURL}/${CaaSTestingClientData.tenantID}/${CaaSTestingClientData.projectID}.${CaaSTestingClientData.contentMode}.content`

    if (CaaSTestingClientData.remoteProjectId) {
      this.remoteProjectId = CaaSTestingClientData.remoteProjectId
      this.remoteBaseUrl = `${CaaSTestingClientData.caasURL}/${CaaSTestingClientData.tenantID}/${CaaSTestingClientData.remoteProjectId}.${CaaSTestingClientData.contentMode}.content`
    }
  }

  /**
   * Initialize the CaaSTestingClient
   * @param CaaSTestingClientData data for testing client
   * @returns CaaSTestingClient
   */
  static async init(CaaSTestingClientData: CaaSTestingClientData) {
    const caasClient = new CaasTestingClient(CaaSTestingClientData)
    await caasClient.createCollection()
    CaaSTestingClientData.remoteProjectId &&
      (await caasClient.createRemoteCollection())
    return caasClient
  }

  /**
   * Get collection from integration test database in CaaS
   * @returns Http Response
   */
  async getCollection() {
    return await fetch(this.baseUrl, {
      method: RequestMethodEnum.GET,
      headers: this.headers,
    })
  }
  /**
   * Get remote collection from integration test database in CaaS
   * @returns Http Response | undefined
   */
  async getRemoteCollection() {
    return await fetch(this.remoteBaseUrl!, {
          method: RequestMethodEnum.GET,
          headers: this.headers,
        })
  }
  /**
   * Get item from integration test database in CaaS
   * @param identifier Name of item to get
   * @param locale locale of item to get
   * @returns Http Response
   */
  async getItem(identifier: string, locale: string) {
    return await fetch(`${this.baseUrl}/${identifier}.${locale}`, {
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
   * Create collection in integration test database in CaaS
   * @returns Http Response
   */
  async createRemoteCollection() { //TODO
    return await fetch(this.remoteBaseUrl!, {
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
   * Delete collection from integration test database in CaaS
   * @param etag Etag of colleciton to delete
   * @returns Http Response | undefined
   */
  async removeRemoteCollection(etag: string) {
    return this.remoteBaseUrl
      ? await fetch(this.remoteBaseUrl, {
          method: RequestMethodEnum.DELETE,
          headers: {
            ...this.headers,
            'If-Match': etag,
          },
        })
      : undefined
  }

  /**
   * Delete item from integration test collection in CaaS
   * @param identifier identifier (without locale) of item to delete
   * @param locale locale of item to delete
   * @param etag Etag of item to delete
   * @returns Http Response
   */
  async removeItem(identifier: string, locale: string, etag: string) {
    return await fetch(`${this.baseUrl}/${identifier}.${locale}`, {
      method: RequestMethodEnum.DELETE,
      headers: {
        ...this.headers,
        'If-Match': etag,
      },
    })
  }

  /**
   * DEPRECATED! Use add items to collection instead
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
   * DEPRECATED! Use add items to collection instead
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

  /*
   * Bulk post docs to collection in integration test database in CaaS
   * @param docs docs to add
   * @param locale locale object with identifier, country and language
   * @returns Http Response
   */
  async addItemsToCollection(docs: CaasApi_Item[], locale: Locale) {
    return this.addItemsToCollectionWithBaseUrl(docs, locale, this.baseUrl)
  }

  /*
   * Bulk post docs to collection in integration test database in CaaS
   * @param docs docs to add
   * @param locale locale object with identifier, country and language
   * @returns Http Response
   */
  private async addItemsToCollectionWithBaseUrl(
    docs: CaasApi_Item[],
    locale: Locale,
    baseUrl: string
  ) {
    const docsWithLocale = docs.map((doc) => {
      const docWithLocale: any = { ...doc }
      docWithLocale.locale = locale
      docWithLocale._id = doc.identifier + `.${locale.language}_${locale.country}`
      return docWithLocale
    })
    return await fetch(baseUrl, {
      method: RequestMethodEnum.POST,
      headers: this.headers,
      body: JSON.stringify(docsWithLocale) || null,
    })
  }

  /*
   * Bulk post docs to collection in integration test database in CaaS Remote Project
   * @param docs docs to add
   * @param locale locale object with identifier, country and language
   * @returns Http Response | undefined
   */
  async addItemsToRemoteCollection(docs: CaasApi_Item[], locale: Locale) {
    return this.remoteBaseUrl
      ? this.addItemsToCollectionWithBaseUrl(docs, locale, this.remoteBaseUrl)
      : undefined
  }
}
