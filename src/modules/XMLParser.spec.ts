import { Logger, LogLevel } from './'
import XMLParser from './XMLParser'

describe('XMLParser', () => {
  const logger = new Logger(LogLevel.ERROR, 'XMLParserTest')
  const xmlParser = new XMLParser(logger)

  it('should log an error on incorrect XML', async () => {
    const destructedXML = '<:>'
    const expectedValue = [{ content: [], data: {}, type: ':' }]
    const logTest = jest.spyOn(logger, 'error').mockImplementation(() => {})
    const result = await xmlParser.parse(destructedXML)

    expect(logTest).toHaveBeenCalledWith(
      '[XMLParser]: Error parsing XML',
      expect.anything(),
      destructedXML
    )
    expect(result).toEqual(expectedValue)
  })

  it('should parse &apos correct', async () => {
    const xml = "<div>'</div>"
    const expectedValue = [
      { content: [{ content: "'", data: {}, type: 'text' }], data: {}, type: 'block' },
    ]
    const result = await xmlParser.parse(xml)

    expect(result).toEqual(expectedValue)
  })

  it('should log error on sanitize wrong xml', () => {
    const xml: any = 1
    const logTest = jest.spyOn(logger, 'error').mockImplementation(() => {})
    const result = xmlParser.sanitizeXml(xml)

    expect(result).toEqual('')
    expect(logTest).toHaveBeenCalledWith(
      '[XMLParser]: Error sanitizing the xml',
      expect.anything(),
      xml
    )
  })

  describe('Richtext ELements', () => {
    const cases = [
      ['<div></div>', 'block'],
      ['<br>', 'linebreak'],
      ['<ul></ul>', 'list'],
      ['<li></li>', 'listitem'],
      ['<p></p>', 'paragraph'],
      ['<default></default>', 'default'],
    ]
    const formatcases = [
      ['<b></b>', 'text', 'bold'],
      ['<i></i>', 'text', 'italic'],
    ]

    it.each(cases)(`%p should be parsed as %p`, async (xml, type) => {
      const expectedValue = [{ content: [], data: {}, type }]
      const result = await xmlParser.parse(xml as string)

      expect(result).toEqual(expectedValue)
    })
    it.each(formatcases)(
      `%p should be parsed as %p with format: %p"`,
      async (xml, type, format) => {
        const expectedValue = [{ content: [], data: { format }, type }]
        const result = await xmlParser.parse(xml as string)

        expect(result).toEqual(expectedValue)
      }
    )
  })

  describe('Link Element', () => {
    const link = 'internal_link'

    it('should parse link elements', async () => {
      const xml = '<link></link>'
      const expectedValue = [{ content: [], data: {}, type: 'link' }]
      const result = await xmlParser.parse(xml)

      expect(result).toEqual(expectedValue)
    })

    it('should parse link elements with correct data', async () => {
      const dataIdentifier = 'data-test-id'
      const testValue = '2'
      const xml = `<link ${dataIdentifier}="${testValue}"></link>`
      const expectedValue = [{ content: [], data: { [dataIdentifier]: testValue }, type: 'link' }]
      const result = await xmlParser.parse(xml)

      expect(result).toEqual(expectedValue)
    })

    it('should parse link elements with complex correct data', async () => {
      const json = { object: { 'test-id': 'test' } }
      const xml = `<div data-fs-type=\"link.${link}\"><script type=\"application/json\">${JSON.stringify(
        json
      )}</script><a>Smart</a></div>`
      const expectedValue = [
        {
          content: [{ content: 'Smart', data: {}, type: 'text' }],
          data: { data: json, type: link },
          type: 'link',
        },
      ]
      const result = await xmlParser.parse(xml)

      expect(result).toEqual(expectedValue)
    })

    it('should log an error in link element with incorrect data', async () => {
      const destructedJson = '{'
      const xml = `<div data-fs-type=\"link.${link}\"><script type=\"application/json\">${destructedJson}</script><a>Smart</a></div>`
      const expectedValue = [
        {
          content: [{ content: 'Smart', data: {}, type: 'text' }],
          data: { data: destructedJson, type: link },
          type: 'link',
        },
      ]
      const logTest = jest.spyOn(logger, 'error').mockImplementation(() => {})
      const result = await xmlParser.parse(xml)

      expect(logTest).toHaveBeenCalledWith(
        '[XMLParser]: Error parsing data-attribute of link-element',
        '{'
      )
      expect(result).toEqual(expectedValue)
    })
  })
})
