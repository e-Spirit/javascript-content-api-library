import { faker } from '@faker-js/faker'

/**
 * Builds a CaaS document url in the shape FirstSpirit writes onto references.
 * Only the projectId is ever interpreted by the library, the remaining parts
 * exist so the url is realistic and parsable.
 */
export interface ReferenceUrlOptions {
  baseUrl?: string
  tenantId?: string
  projectId?: string
  contentMode?: string
  documentId?: string
  locale?: string
}

export const createReferenceUrl = ({
  baseUrl = 'https://caas.example.com',
  tenantId = 'test-tenant',
  projectId = faker.string.uuid(),
  contentMode = 'preview',
  documentId = faker.string.uuid(),
  locale = 'en_GB',
}: ReferenceUrlOptions = {}) =>
  `${baseUrl}/${tenantId}/${projectId}.${contentMode}.content/${documentId}.${locale}`
