import { Logger, LogLevel } from '../../modules'
import XMLParser from '../../modules/XMLParser'

describe('XMLParser', () => {
  const logger = new Logger(LogLevel.ERROR)
  const xmlParser = new XMLParser(logger)
  const dataIdentifier = 'data-test-id'
  const testValue = '2'
  it('should parse the String correctly', async () => {
    const xml = '<div></div>'
    const expectedValue = [{ content: [], data: {}, type: 'block' }]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })

  it('should parse br elements', async () => {
    const xml = '<br>'
    const expectedValue = [{ content: [], data: {}, type: 'linebreak' }]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  it('should parse b elements', async () => {
    const xml = '<b></b>'
    const expectedValue = [{ content: [], data: { format: 'bold' }, type: 'text' }]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  it('should parse i elements', async () => {
    const xml = '<i></i>'
    const expectedValue = [{ content: [], data: { format: 'italic' }, type: 'text' }]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  it('should parse ul elements', async () => {
    const xml = '<ul></ul>'
    const expectedValue = [{ content: [], data: {}, type: 'list' }]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  it('should parse li elements', async () => {
    const xml = '<li></li>'
    const expectedValue = [{ content: [], data: {}, type: 'listitem' }]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  it('should parse p elements', async () => {
    const xml = '<p></p>'
    const expectedValue = [{ content: [], data: {}, type: 'paragraph' }]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  it('should parse link elements', async () => {
    const xml = '<link></link>'
    const expectedValue = [{ content: [], data: {}, type: 'link' }]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  it('should parse link elements with correct data', async () => {
    const xml = `<link ${dataIdentifier}="${testValue}"></link>`
    const expectedValue = [{ content: [], data: { [dataIdentifier]: testValue }, type: 'link' }]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  it('should parse link elements with complex correct data', async () => {
    const xml = `<div data-fs-type=\"link.internal_link\"><script type=\"application/json\">{\"object\":{\"test-id\": \"test\"}}</script><a>Smart</a></div>`
    const expectedValue = [
      {
        content: [{ content: 'Smart', data: {}, type: 'text' }],
        data: { data: { object: { 'test-id': 'test' } }, type: 'internal_link' },
        type: 'link'
      }
    ]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  it('should throw error in link element with incorrect data', async () => {
    const xml = `<div data-fs-type=\"link.internal_link\"><script type=\"application/json\">{</script><a>Smart</a></div>`
    const expectedValue = [{ content: [], data: {}, type: 'link' }]
    const logTest = jest.spyOn(logger, 'error').mockImplementation(() => {})
    const result = await xmlParser.parse(xml)

    expect(logTest).toHaveBeenCalledWith(
      '[XMLParser]: Error parsing data-attribute of link-element',
      '{'
    )
  })
})
