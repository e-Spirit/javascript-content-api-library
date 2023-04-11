import { Logger } from './Logger'
import * as saxes from 'saxes'
import { RichTextElement } from '../types'
import { get } from 'lodash'

// map characters which are not valid inside XML attributes enclosed in double quotes to their
// entity representation
const ENTITIES = new Map([
  ['"', '&quot;'],
  ['&', '&amp;'],
  ['<', '&lt;'],
])

class XMLParser {
  logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }
  
  // restructure the link structure into one single link element  (hint: *? matches non-eager)
  // we need to find only the top-level link templates and replace them
  // as we have link templates inside link templates as well as multiple top-level link templates in one element
  // the tricky part is that the closing tag for a nested link template does not "end" the wrapping link template
  replaceUnnestedLinkTemplatesWithOneLinkElement(input: string): string {
    const openingTagRegex =
      /<div data-fs-type=\\*?"link\.(.*?)\\*?">\\*?<script type=\\*?"application\/json\\*?">/
    const closingTagRegex = /<\/script>\s*<a>(.*?)<\/a>\s*<\/div>/
    let result = input

    // Find all opening link tags in the input
    let i = 0
    const openingTags: { index: number; openingTag: string }[] = []
    while (i < input.length) {
      const openingTagMatch = openingTagRegex.exec(input.substring(i))
      if (openingTagMatch) {
        openingTags.push({ index: openingTagMatch.index + i, openingTag: openingTagMatch[0] })
        i += openingTagMatch.index + openingTagMatch[0].length
      } else {
        break
      }
    }

    // replace link templates if there are any
    if (openingTags.length > 0) {
      let openingTagsIndex = 0
      let currentIndex = openingTags[openingTagsIndex].index
      const stack = []
      stack.push(openingTags[openingTagsIndex])

      while (stack.length > 0 && currentIndex < input.length) {
        // Find the next closing tag between opening index and next opening tag (or input end if there are no more opening tags)
        const closingTagMatch = closingTagRegex.exec(
          input.substring(currentIndex, openingTags[openingTagsIndex + 1]?.index || input.length)
        )
        if (closingTagMatch) {
          // if we are at outermost level (not nested into another link template) replace the element in result with link element
          if (stack.length === 1) {
            const realClosingTagIndex = currentIndex + closingTagMatch.index
            const opening = stack[0]
            const elementToReplace = input.substring(
              opening.index,
              realClosingTagIndex + closingTagMatch[0].length
            )
            const data = input
              .substring(opening.index + opening.openingTag.length, realClosingTagIndex)
              .replace(/(["<\\])/g, (...args: any[]) => ENTITIES.get(args[1]) || args[1])
              .replace(/&#34;/g, '\\&quot;')
            const type = opening.openingTag.replace(openingTagRegex, (...args: any[]) => args[1])
            const content = closingTagMatch[0].replace(closingTagRegex, (...args: any[]) => args[1])
            result = result.replace(
              elementToReplace,
              `<link type="${type}" data="${data}">${content}</link>`
            )
          }
          // remove the corresponding opening tag from stack as it is closed now
          stack.pop()
          // set current index to end of closing tag, this is where we want to continue our search for closing tags
          currentIndex += closingTagMatch.index + closingTagMatch[0].length
        } else {
          // no closing tag was found, set the current index to the next opening tag or to the end of the input if there are no more opening tags
          currentIndex = openingTags[openingTagsIndex + 1]?.index || input.length
        }
        // add the next opening tag to the stack if there are any
        // but only if there are no open tags left, or there are open tags but the next opening tag needs to be checked as there was no closing tag found in the currently checked substring
        if (
          openingTagsIndex < openingTags.length - 1 &&
          (stack.length == 0 || openingTags[openingTagsIndex + 1].index <= currentIndex)
        ) {
          openingTagsIndex += 1
          stack.push(openingTags[openingTagsIndex])
        }
      }
    }
    return result
  }
  
  sanitizeXml(xml: string) {
    try {
      return this.replaceUnnestedLinkTemplatesWithOneLinkElement(
        xml
          .replace(/&nbsp;/g, '&#160;')
          // replace all non closing br tags with self-closing once (legacy, fixed with CORE-13424)
          .replace(/<br>/g, '<br />')
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
