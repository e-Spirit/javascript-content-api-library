import { Logger } from './Logger'
import * as saxes from 'saxes'
import { RichTextElement } from '../types'
import { replaceUnnestedLinkTemplatesWithOneLinkElement } from '../utils'
import { get } from './MappingUtils'

// map characters which are not valid inside XML attributes enclosed in double quotes to their
// entity representation
const ENTITIES = new Map([
  ['"', '&quot;'],
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ["'", 'apos;'],
])

class XMLParser {
  logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  sanitizeXml(xml: string) {
    try {
      return replaceUnnestedLinkTemplatesWithOneLinkElement(
        xml
          .replace(/&nbsp;/g, '&#160;')
          // replace all non closing br tags with self-closing once (legacy, fixed with CORE-13424)
          .replace(/<br>/g, '<br />'),
        // restructure the link structure into one single link element  (hint: *? matches non-eager)
        ENTITIES
      )
    } catch (err) {
      this.logger.error('[XMLParser]: Error sanitizing the xml', err, xml)
      return ''
    }
  }

  parse(xml: string): Promise<RichTextElement[]> {
    const sanitizedXml = this.sanitizeXml(xml)
    return new Promise((resolve) => {
      // this will be the result, wrapped with a "root" node
      const result: RichTextElement = {
        data: {},
        type: 'root',
        content: [],
      }

      // we will track the current nested node through the path property
      let path: string[] = []

      const parser = new saxes.SaxesParser(false as any)
      parser.on('error', (err) => {
        this.logger.error('[XMLParser]: Error parsing XML', err, xml)
      })

      parser.on('end', () => {
        resolve(
          (result.content as RichTextElement[])[0].content as RichTextElement[]
        )
      })

      parser.on('text', (text) => {
        const parent = this.getCurrentElement(result, path)
        if (!parent || !Array.isArray(parent.content)) return
        parent.content.push({
          type: 'text',
          content: text,
          data: {},
        })
      })

      parser.on('opentag', (tag) => {
        const parent = this.getCurrentElement(result, path)
        if (!parent || !Array.isArray(parent.content)) return
        const elementIndex = parent.content.push(
          this.createRichTextElement(tag)
        )
        path = [...path, 'content', elementIndex - 1 + '']
      })

      parser.on('closetag', (tag) => {
        path.splice(-2, 2)
      })

      // we will sanitize the incoming xml and wrap it with a root node, so we can be sure, that there will only be one root - node
      // this node will not be returned in the result
      parser.write(`<root>${sanitizedXml}</root>`).close()
    })
  }

  getCurrentElement = (result: RichTextElement, path: string[]) => {
    return path.length === 0 ? result : get(result, path, null)
  }

  createRichTextElement(tag: saxes.SaxesTag): RichTextElement {
    switch (tag.name) {
      case 'b':
        return {
          data: {
            format: 'bold',
            ...tag.attributes,
          },
          content: [],
          type: 'text',
        }
      case 'i':
        return {
          data: {
            format: 'italic',
            ...tag.attributes,
          },
          content: [],
          type: 'text',
        }
      case 'ul':
        return {
          data: tag.attributes,
          content: [],
          type: 'list',
        }
      case 'li':
        return {
          data: tag.attributes,
          content: [],
          type: 'listitem',
        }
      case 'br':
        return {
          data: tag.attributes,
          content: [],
          type: 'linebreak',
        }
      case 'p':
        return {
          data: tag.attributes,
          content: [],
          type: 'paragraph',
        }
      case 'div':
        return {
          data: tag.attributes,
          content: [],
          type: 'block',
        }
      case 'link':
        const data = tag.attributes
        if (data.data) {
          try {
            data.data = JSON.parse(data.data as string)
          } catch (err) {
            this.logger.error(
              '[XMLParser]: Error parsing data-attribute of link-element',
              data.data
            )
          }
        }
        return {
          data,
          content: [],
          type: 'link',
        }
      default:
        return {
          data: tag.attributes,
          content: [],
          type: tag.name,
        }
    }
  }
}
export default XMLParser
