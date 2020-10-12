export type DataEntry = string | number | boolean | null | Option[] | Option | Link | Card[]

export interface DataEntries {
  [key: string]: DataEntry
}

export interface PageBody {
  name: string
  previewId: string
  children: (Section | Content2Section)[]
}

export interface Page {
  id: string
  refId: string
  previewId: string
  name: string
  layout: string | null
  children: PageBody[]
  data: DataEntries
  meta: DataEntries
}

export interface Option {
  key: string
  value: string
}

export interface Link {
  template: string
  data: DataEntries
  meta: DataEntries
}

export interface Card {
  id: string
  previewId: string
  template: string
  data: DataEntries
}

export interface Media {}

export interface GCAPage {}

export interface Content2Section {
  template: string
  children: Dataset[]
}

export interface Section {
  id: string
  previewId: string
  type: string
  data: DataEntries
}

export interface Dataset {
  id: string
  previewId: string
  schema: string
  entityType: string
  template: string
  data: DataEntries
  route: string
}

export interface Image {
  id: string
  resolutions: {
    [resolution: string]: {
      fileSize: number
      extension: string
      mimeType: string
      width: number
      height: number
      url: string
    }
  }
}
