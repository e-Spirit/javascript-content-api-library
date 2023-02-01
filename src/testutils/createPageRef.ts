import { createDataEntry } from './createDataEntry'
import { CaaSApi_Body, CaaSApi_PageRef } from '../types'

export function createPageRef(
  pageChildren: CaaSApi_Body[] = [],
  locale?: string
): CaaSApi_PageRef {
  const base = createDataEntry(locale)
  const page = createDataEntry(locale)
  const template = createDataEntry(locale)

  return {
    ...base,
    url: `https://fs.${base.uid}local`,
    fsType: 'PageRef',
    page: {
      ...page,
      fsType: 'Page',
      children: pageChildren,
      formData: {},
      metaFormData: {},
      template: {
        ...template,
        fsType: 'PageTemplate',
      },
    },
  }
}
