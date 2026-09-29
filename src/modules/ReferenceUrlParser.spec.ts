import { parseReferenceUrl } from './ReferenceUrlParser'

describe('parseReferenceUrl', () => {
  const url =
    'https://caas.example.com/my-tenant/8e2dd004-248c-4c3f-952e-f32296a9d45f.preview.content/68aec889-1ff6-47a0-b763-42d2160e7889.en_GB'

  it('should split a caas document url into its parts', () => {
    expect(parseReferenceUrl(url)).toEqual({
      baseUrl: 'https://caas.example.com',
      tenantId: 'my-tenant',
      collectionId: '8e2dd004-248c-4c3f-952e-f32296a9d45f.preview.content',
      projectId: '8e2dd004-248c-4c3f-952e-f32296a9d45f',
      contentMode: 'preview',
      documentId: '68aec889-1ff6-47a0-b763-42d2160e7889',
      locale: 'en_GB',
    })
  })

  it('should expose the collection id as the caas names it', () => {
    expect(parseReferenceUrl(url)?.collectionId).toBe(
      '8e2dd004-248c-4c3f-952e-f32296a9d45f.preview.content'
    )
  })

  it('should parse release urls as well', () => {
    const releaseUrl = url.replace('.preview.content', '.release.content')
    expect(parseReferenceUrl(releaseUrl)?.contentMode).toBe('release')
  })

  it('should ignore query parameters', () => {
    expect(parseReferenceUrl(`${url}?rep=hal`)?.documentId).toBe(
      '68aec889-1ff6-47a0-b763-42d2160e7889'
    )
  })

  it('should return an undefined locale if the document segment has none', () => {
    const withoutLocale = url.replace('.en_GB', '')
    expect(parseReferenceUrl(withoutLocale)).toMatchObject({
      documentId: '68aec889-1ff6-47a0-b763-42d2160e7889',
      locale: undefined,
    })
  })

  it('should return null for missing input', () => {
    expect(parseReferenceUrl(undefined)).toBeNull()
    expect(parseReferenceUrl(null)).toBeNull()
    expect(parseReferenceUrl('')).toBeNull()
  })

  it('should return null for a string that is not a url', () => {
    expect(parseReferenceUrl('some-media-url')).toBeNull()
  })

  it('should return null if the path does not have exactly three segments', () => {
    expect(
      parseReferenceUrl('https://caas.example.com/my-tenant/x.preview.content')
    ).toBeNull()
    expect(
      parseReferenceUrl(
        'https://caas.example.com/a/my-tenant/x.preview.content/doc.en_GB'
      )
    ).toBeNull()
  })

  it('should return null if the collection segment is not a caas content collection', () => {
    expect(
      parseReferenceUrl(
        'https://caas.example.com/my-tenant/8e2dd004.staging.content/doc.en_GB'
      )
    ).toBeNull()
    expect(
      parseReferenceUrl(
        'https://caas.example.com/my-tenant/8e2dd004.preview/doc.en_GB'
      )
    ).toBeNull()
  })
})
