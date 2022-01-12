import { createDataEntry } from './createDataEntry'
import { CaaSApi_PageRef } from '../types'

export function createPageRef(): CaaSApi_PageRef {
  const base = createDataEntry()
  const page = createDataEntry()
  const template = createDataEntry()

  return {
    ...base,
    url: `https://fs.${base.uid}local`,
    fsType: 'PageRef',
    page: {
      ...page,
      fsType: 'Page',
      children: [],
      formData: {},
      metaFormData: {},
      template: {
        ...template,
        fsType: 'PageTemplate',
      },
    },
  }
}
