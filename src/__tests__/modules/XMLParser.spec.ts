import { Logger, LogLevel } from '../../modules'
import XMLParser from '../../modules/XMLParser'

describe('XMLParser', () => {
  const logger = new Logger(LogLevel.ERROR)
  const xmlParser = new XMLParser(logger)
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
    const xml = '<link data-test-id="2"></link>'
    const expectedValue = [{ content: [], data: { 'data-test-id': '2' }, type: 'link' }]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  it('should parse link elements with correct data', async () => {
    const xml = '<link data={"content": []}></link>'
    const expectedValue = [
      { content: [], data: { 'data-test-id': '"{"content": []' }, type: 'link' }
    ]
    const result = await xmlParser.parse(xml)
    expect(result).toEqual(expectedValue)
  })
  /* it('should throw error in link element with incorrect data', async () => {
    const xml ="<link =\"2\"></link>"
    const expectedValue = [{"content": [], "data": {"data-test-id": "2"}, "type": "link"}]
    const result = await xmlParser.parse(xml)
    expect( result).toEqual(expectedValue)
  }) */
})
