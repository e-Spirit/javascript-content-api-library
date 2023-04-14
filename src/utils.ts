export const removeFromSeoRouteMap = (
  seoRouteMap: Record<string, string>,
  ids: string[]
) => {
  Object.keys(seoRouteMap).forEach((key) => {
    if (!ids.includes(seoRouteMap[key])) {
      delete seoRouteMap[key]
    }
  })
  return seoRouteMap
}

export const removeFromStructure = (
  structure: { id: string; children: any }[],
  ids: string[]
) => {
  return structure.filter((item) => {
    if (ids.includes(item.id)) {
      item.children = removeFromStructure(item.children, ids)
      return true
    }
    return false
  })
}

export const removeFromIdMap = (idMap: any, ids: string[]) => {
  const copyOfIdMap = { ...idMap }
  for (const route in copyOfIdMap) {
    if (!ids.includes(route)) {
      delete copyOfIdMap[route]
    }
  }
  return copyOfIdMap
}

export const isValidRegex = (str: string) => {
  try {
    // throws an error if not a valid regex
    const regex = new RegExp(str)
    return true
  } catch (e) {
    return false
  }
}

function findOpeningLinkTags(
  input: string
): { index: number; openingTag: string }[] {
  const openingTagRegex =
    /<div data-fs-type=\\*?"link\.(.*?)\\*?">\\*?<script type=\\*?"application\/json\\*?">/
  let result: { index: number; openingTag: string }[] = []
  let i = 0
  while (i < input.length) {
    const openingTagMatch = openingTagRegex.exec(input.substring(i))
    if (openingTagMatch) {
      result.push({
        index: openingTagMatch.index + i,
        openingTag: openingTagMatch[0],
      })
      i += openingTagMatch.index + openingTagMatch[0].length
    } else {
      break
    }
  }
  return result
}

// restructure the link structure into one single link element  (hint: *? matches non-eager)
// we need to find only the top-level link templates and replace them
// as there can be link templates inside link templates as well as multiple top-level link templates in one element
// the tricky part is that the closing tag for a nested link template does not "end" the wrapping link template
export function replaceUnnestedLinkTemplatesWithOneLinkElement(
  input: string,
  ENTITIES: Map<string, string>
): string {
  const openingTags = findOpeningLinkTags(input)
  // replace link templates if there are any
  if (openingTags.length <= 0) {
    return input
  }

  const openingTagRegex =
    /<div data-fs-type=\\*?"link\.(.*?)\\*?">\\*?<script type=\\*?"application\/json\\*?">/
  const closingTagRegex = /<\/script>\s*<a>(.*?)<\/a>\s*<\/div>/
  let result = input
  let openingTagsIndex = 0
  let currentIndex = openingTags[openingTagsIndex].index
  const stack = []
  stack.push(openingTags[openingTagsIndex])

  while (stack.length > 0 && currentIndex < input.length) {
    // Find the next closing tag between opening index and next opening tag (or input end if there are no more opening tags)

    const nextOpeningTag =
      openingTags[openingTagsIndex + 1]?.index || input.length
    const closingTags = closingTagRegex.exec(
      input.substring(currentIndex, nextOpeningTag)
    )
    if (closingTags) {
      // if we are at outermost level (not nested into another link template) replace the element in result with link element
      if (stack.length === 1) {
        const realClosingTagIndex = currentIndex + closingTags.index
        const opening = stack[0]
        const elementToReplace = input.substring(
          opening.index,
          realClosingTagIndex + closingTags[0].length
        )
        const data = input
          .substring(
            opening.index + opening.openingTag.length,
            realClosingTagIndex
          )
          // Since java 4 backslashes are considered as one backslash, we need to replace them with two backslashes
          .replace(/\\\\/g, '\\')
          .replace(
            /(["&<\\])/g,
            (...args: any[]) => ENTITIES.get(args[1]) || args[1]
          )
          .replace(/&#34;/g, '\\&quot;')
        const type = opening.openingTag.replace(
          openingTagRegex,
          (...args: any[]) => args[1]
        )
        const content = closingTags[0].replace(
          closingTagRegex,
          (...args: any[]) => args[1]
        )
        result = result.replace(
          elementToReplace,
          `<link type="${type}" data="${data}">${content}</link>`
        )
      }
      // remove the corresponding opening tag from stack as it is closed now
      stack.pop()
      // set current index to end of closing tag, this is where we want to continue our search for closing tags
      currentIndex += closingTags.index + closingTags[0].length
    } else {
      // no closing tag was found, set the current index to the next opening tag or to the end of the input if there are no more opening tags
      currentIndex = openingTags[openingTagsIndex + 1]?.index || input.length
    }
    // add the next opening tag to the stack if there are any
    // but only if there are no open tags left, or there are open tags but the next opening tag needs to be checked as there was no closing tag found in the currently checked substring
    if (
      openingTagsIndex < openingTags.length - 1 &&
      (stack.length == 0 ||
        openingTags[openingTagsIndex + 1].index <= currentIndex)
    ) {
      openingTagsIndex += 1
      stack.push(openingTags[openingTagsIndex])
    }
  }
  return result
}
