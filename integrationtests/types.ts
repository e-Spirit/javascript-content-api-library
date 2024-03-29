export interface TestDocument {
  _id: string
  locale: { identifier: string; country: string; language: string }
  [key: string | number | symbol]: any
}

export interface Locale {
  identifier: string
  country: string
  language: string
}
