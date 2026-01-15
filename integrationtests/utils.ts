import { TestDocument, Locale } from './types'
import 'cross-fetch/polyfill'
import { FSXAContentMode } from '../src/enums'
import { CaasApi_Item } from '../src'

// Default timeouts for integration tests
export const TEST_TIMEOUTS = {
  DEFAULT: 30000,
  LONG: 60000,
  SHORT: 15000,
  CAAS_PROPAGATION: 2000
} as const

/**
 * Retry configuration for flaky operations
 */
export interface RetryOptions {
  maxRetries?: number
  delayMs?: number
  backoffMultiplier?: number
  onRetry?: (error: Error, attempt: number) => void
}

/**
 * Executes an async function with retry logic.
 * Useful for operations that may fail due to eventual consistency or transient errors.
 * @param fn The async function to execute
 * @param options Retry configuration
 * @returns The result of the function
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry
  } = options

  let lastError: Error = new Error('No attempts made')
  let currentDelay = delayMs

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        onRetry?.(lastError, attempt)
        await CaasTestingClient.delay(currentDelay)
        currentDelay *= backoffMultiplier
      }
    }
  }

  throw lastError
}

/**
 * Waits until a condition is met or timeout is reached.
 * Useful for waiting for CaaS data propagation.
 * @param condition Function that returns true when condition is met
 * @param options Configuration for polling
 * @returns true if condition was met, throws if timeout
 */
export async function waitUntilPreconditionMet(
  condition: () => Promise<boolean> | boolean,
  options: {
    timeoutMs?: number
    pollIntervalMs?: number
    errorMessage?: string
  } = {}
): Promise<true> {
  const {
    timeoutMs = 10000,
    pollIntervalMs = 500,
    errorMessage = 'Condition not met within timeout'
  } = options

  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = await condition()
      if (result) {
        return true
      }
    } catch {
      // Condition threw, continue polling
    }
    await CaasTestingClient.delay(pollIntervalMs)
  }

  throw new Error(`${errorMessage} (waited ${timeoutMs}ms)`)
}

/**
 * Wraps a test function with retry logic for flaky integration tests.
 * Use this when a test may fail due to timing issues but should pass on retry.
 * @param testFn The test function to wrap
 * @param options Retry configuration
 * @returns A wrapped test function
 */
export function withRetry<T>(
  testFn: () => Promise<T>,
  options: RetryOptions = {}
): () => Promise<T> {
  return () => retryAsync(testFn, {
    maxRetries: 3,
    delayMs: 2000,
    ...options,
    onRetry: (error, attempt) => {
      console.log(`Test attempt ${attempt} failed: ${error.message}. Retrying...`)
      options.onRetry?.(error, attempt)
    }
  })
}

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
      Authorization: `Bearer ${CaaSTestingClientData.apikey}`,
      'Content-Type': 'application/json'
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

  static async delay(milliseconds: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds)
    })
  }

  /**
   * Initialize the CaaSTestingClient
   * @param CaaSTestingClientData data for testing client
   * @returns CaaSTestingClient
   */
  static async init(CaaSTestingClientData: CaaSTestingClientData) {
    const caasClient = new CaasTestingClient(CaaSTestingClientData)

    // Retry collection creation in case of transient failures
    await retryAsync(
      async () => {
        await caasClient.createCollection()
      },
      { maxRetries: 3, delayMs: 1000 }
    )

    if (CaaSTestingClientData.remoteProjectId) {
      await retryAsync(
        async () => {
          await caasClient.createRemoteCollection()
        },
        { maxRetries: 3, delayMs: 1000 }
      )
    }

    // Wait for CaaS to propagate the collections
    await this.delay(TEST_TIMEOUTS.CAAS_PROPAGATION)

    return caasClient
  }

  /**
   * Get collection from integration test database in CaaS
   * @returns Http Response
   */
  async getCollection() {
    return await fetch(this.baseUrl, {
      method: RequestMethodEnum.GET,
      headers: this.headers
    })
  }

  /**
   * Get remote collection from integration test database in CaaS
   * @returns Http Response | undefined
   */
  async getRemoteCollection() {
    return await fetch(this.remoteBaseUrl!, {
      method: RequestMethodEnum.GET,
      headers: this.headers
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
      headers: this.headers
    })
  }

  /**
   * Create collection in integration test database in CaaS
   * @returns Http Response
   */
  async createCollection() {
    return await fetch(this.baseUrl, {
      method: RequestMethodEnum.PUT,
      headers: this.headers
    })
  }

  /**
   * Create collection in integration test database in CaaS
   * @returns Http Response
   */
  async createRemoteCollection() {
    //TODO
    return await fetch(this.remoteBaseUrl!, {
      method: RequestMethodEnum.PUT,
      headers: this.headers
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
        'If-Match': etag
      }
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
          'If-Match': etag
        }
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
        'If-Match': etag
      }
    })
  }

  /**
   * DEPRECATED! Use add items to collection instead
   * Add doc to collection in integration test database in CaaS
   * @param docs doc to add
   * @returns Http Response
   */
  async addDocToCollection(doc: TestDocument) {
    const encodedLocale = encodeURIComponent(
      `${doc.locale.language}_${doc.locale.country}`
    )
    const encodedId = encodeURIComponent(doc._id)
    const url = this.baseUrl + `/${encodedId}.${encodedLocale}`
    const docWithLocale = { ...doc, _id: undefined }
    return await fetch(url, {
      method: RequestMethodEnum.PUT,
      headers: this.headers,
      body: JSON.stringify(docWithLocale) || null
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
      body: JSON.stringify(docsWithLocale) || null
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
      docWithLocale._id =
        doc.identifier + `.${locale.language}_${locale.country}`
      return docWithLocale
    })
    return await fetch(baseUrl, {
      method: RequestMethodEnum.POST,
      headers: this.headers,
      body: JSON.stringify(docsWithLocale) || null
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

/**
 * Promisified server close that also terminates keep-alive connections.
 * This is necessary because Node.js HTTP servers keep connections alive,
 * which prevents Jest from exiting properly.
 */
export const closeServer = (server: import('http').Server): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Force close all connections by destroying the server socket
    server.closeAllConnections?.()

    server.close((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}
