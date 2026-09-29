/**
 * The parts of a CaaS document url as written onto references by FirstSpirit.
 * Shape: {baseUrl}/{tenantId}/{projectId}.{contentMode}.content/{documentId}.{locale}
 */
export interface ParsedReferenceUrl {
  baseUrl: string
  tenantId: string
  /** `<project uuid>.<content mode>.content`, the CaaS collection */
  collectionId: string
  projectId: string
  contentMode: string
  documentId: string
  locale?: string
}

// {projectId}.{preview|release}.content
const CONTENT_COLLECTION_PATTERN = /^(.+)\.(preview|release)\.content$/

const EXPECTED_PATH_SEGMENTS = 3

/**
 * Parses a CaaS document url into its parts.
 *
 * This is the only place that knows the url layout. The layout is a CaaS
 * implementation detail and not a documented contract, so anything that does
 * not match exactly yields null and callers must treat the reference as local.
 *
 * @param url the url found on a reference, may be missing or arbitrary
 * @returns the parsed parts, or null if the url is absent or does not match
 */
export const parseReferenceUrl = (
  url?: string | null
): ParsedReferenceUrl | null => {
  if (!url) return null

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const segments = parsed.pathname.split('/').filter(Boolean)
  if (segments.length !== EXPECTED_PATH_SEGMENTS) return null

  const [tenantId, collectionSegment, documentSegment] = segments
  const collectionMatch = CONTENT_COLLECTION_PATTERN.exec(collectionSegment)
  if (!collectionMatch) return null

  const separatorIndex = documentSegment.indexOf('.')
  const hasLocale = separatorIndex > 0

  return {
    baseUrl: parsed.origin,
    tenantId,
    collectionId: collectionSegment,
    projectId: collectionMatch[1],
    contentMode: collectionMatch[2],
    documentId: hasLocale
      ? documentSegment.substring(0, separatorIndex)
      : documentSegment,
    locale: hasLocale
      ? documentSegment.substring(separatorIndex + 1)
      : undefined,
  }
}
