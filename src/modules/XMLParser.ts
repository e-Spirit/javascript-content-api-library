import { Logger } from './Logger'
import * as saxes from 'saxes'
import { RichTextElement } from '../types'
import { get } from 'lodash'

class XMLParser {
  logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  sanitizeXml(xml: string) {
    try {
      return (
        xml
          // we will replace all non closing br tags, with self-closing once
          .replace(/<br>/gm, '<br />')
          .replace(/'(?=[^>]*<)/g, '&apos;')
          // we need to restructure the link structure into one single link element
          .replace(
            /<div data-fs-type="link\.(.*?)">\s*<script type="application\/json">(.*?)<\/script>\s*<a>(.*?)<\/a>\s*<\/div>/g,
            (...args: any[]) => {
              return `<link type="${args[1]}" data="${args[2].replace(/"/g, '&quot;')}">${
                args[3]
              }</link>`
            }
          )
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
        resolve((result.content as RichTextElement[])[0].content as RichTextElement[])
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
        const elementIndex = parent.content.push(this.createRichTextElement(tag))
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
