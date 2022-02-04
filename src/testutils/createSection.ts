import { CaaSApi_Section } from '../types'
import { createNumberEntry } from './createNumberEntry'
import { createDataEntry } from './createDataEntry'

export function createSection(): CaaSApi_Section {
  const template = createDataEntry()
  return {
    ...createDataEntry(),
    fsType: 'Section',
    template: {
      ...template,
      fsType: 'SectionTemplate',
    },
    formData: {
      v1: createNumberEntry(32),
      v2: createNumberEntry(64),
    },
  }
}
