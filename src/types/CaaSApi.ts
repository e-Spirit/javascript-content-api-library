export interface CaaSApi_Template {
  fsType: 'PageTemplate'
  name: string
  identifier: string
  uid: string
  uidType: string
  displayName: string
}

export interface CaaSApi_Option {
  fsType: 'Option'
  label: string
  identifier: string
}

export interface CaaSApi_CMSInputCheckbox {
  fsType: 'CMS_INPUT_CHECKBOX'
  name: string
  value: CaaSApi_Option
}

export interface CaaSApi_CMSInputRadioButton {
  fsType: 'CMS_INPUT_RADIOBUTTON'
  name: string
  value: CaaSApi_Option | null
}

export interface CaaSApi_CMSInputText {
  fsType: 'CMS_INPUT_TEXT'
  name: string
  value: string
}

export interface CaaSApi_CMSInputTextArea {
  fsType: 'CMS_INPUT_TEXTAREA'
  name: string
  value: string
}

export interface CaaSApi_CMSInputDOM {
  fsType: 'CMS_INPUT_DOM'
  name: string
  /**
   * This contains html
   */
  value: string
}

export interface CaaSApi_CMSInputToggle {
  fsType: 'CMS_INPUT_TOGGLE'
  name: string
  value: boolean | null
}

export interface CaaSApi_CMSInputNumber {
  fsType: 'CMS_INPUT_NUMBER'
  name: string
  value: number
}

export interface CaaSApi_CMSInputLink {
  fsType: 'CMS_INPUT_LINK'
  name: string
  value: {
    template: CaaSApi_Template
    formData: CaaSApi_DataEntries
    metaFormData: CaaSApi_DataEntries
  }
}

export interface CaaSApi_CMSInputList {
  fsType: 'CMS_INPUT_LIST'
  name: string
  value: any[]
}

export interface CaaSApi_CMSInputCombobox {
  fsType: 'CMS_INPUT_COMBOBOX'
  name: string
  value: CaaSApi_Option | null
}

export interface CaaSApi_FSDataset {
  fsType: 'FS_DATASET'
  name: string
  value: {
    fsType: 'DatasetReference'
    target: {
      fsType: 'Dataset'
      schema: string
      entityType: string
      identifier: string
    }
  } | null
}

export interface CaaSApi_FSButton {
  fsType: 'FS_BUTTON'
  name: string
  value: {}
}

export interface CaaSApi_Card {
  fsType: 'Card'
  name: string
  identifier: string
  uuid: string
  template: CaaSApi_Template
  formData: CaaSApi_DataEntries
}

export interface CaaSApi_FSCatalog {
  fsType: 'FS_CATALOG'
  name: string
  value: CaaSApi_Card[] | null
}

export interface CaaSApi_MediaRef {
  fsType: 'Media'
  name: string
  identifier: string
  uid: string
  uidType: string
  mediaType: string
  url: string
}

export interface CaaSApi_Record {
  fsType: 'Record'
  identifier: string
}

export interface CaaSApi_FSIndex {
  fsType: 'FS_INDEX'
  name: string
  dapType: string
  value: CaaSApi_Record[]
}

export interface CaaSApi_FSReference {
  fsType: 'FS_REFERENCE'
  name: string
  value: {
    fsType: 'Media'
    name: string
    identifier: string
    uid: string
    uidType: string
    mediaType: 'PICTURE'
    url: string
  } | null
}

export type CaaSApi_DataEntry =
  | CaaSApi_CMSInputCombobox
  | CaaSApi_CMSInputDOM
  | CaaSApi_CMSInputLink
  | CaaSApi_CMSInputList
  | CaaSApi_CMSInputNumber
  | CaaSApi_CMSInputText
  | CaaSApi_CMSInputTextArea
  | CaaSApi_CMSInputToggle
  | CaaSApi_FSButton
  | CaaSApi_FSCatalog
  | CaaSApi_FSDataset
  | CaaSApi_FSIndex
  | CaaSApi_FSReference

export interface CaaSApi_DataEntries {
  [key: string]: CaaSApi_DataEntry
}

export interface CaaSApi_Content2Section {
  fsType: 'Content2Section'
  schema: string
  entityType: string
  name: string
  displayName: string
  template: CaaSApi_Template
  query: string | null
  recordCountPerPage: number
  maxPageCount: number
  filterParams: {
    [key: string]: any
  }
  ordering: {
    attribute: string
    ascending: boolean
  }[]
}

export interface CaaSApi_Dataset {
  _id: string
  fsType: 'Dataset'
  schema: string
  entityType: string
  displayName: string
  identifier: string
  template: CaaSApi_Template
  formData: CaaSApi_DataEntries
  route: string
}

export interface CaaSApi_Section {
  fsType: 'Section'
  name: string
  displayName: string
  identifier: string
  template: CaaSApi_Template
  formData: CaaSApi_DataEntries
}

export interface CaaSApi_Body {
  fsType: 'Body'
  name: string
  identifier: string
  children: (CaaSApi_Section | CaaSApi_Content2Section)[]
}

export interface CaaSApi_GCAPage {
  _id: string
  fsType: 'GCAPage'
  name: string
  displayName: string
  identifier: string
  uid: string
  uidType: string
  formData: CaaSApi_DataEntries
  metaFormData: CaaSApi_DataEntries
}

export interface CaaSApi_Page {
  fsType: 'Page'
  name: string
  displayName: string
  identifier: string
  uid: string
  uidType: string
  template: CaaSApi_Template
  formData: CaaSApi_DataEntries
  metaFormData: CaaSApi_DataEntries
  children: CaaSApi_Body[]
}

export interface CaaSApi_PageRef {
  fsType: 'PageRef'
  name: string
  identifier: string
  uid: string
  uidType: string
  url: string
  page: CaaSApi_Page
  displayName: string
}

export interface CaaSApi_Media_Base {
  _id: string
  fsType: 'Media'
  name: string
  displayName: string
  identifier: string
  uid: string
  uidType: string
  fileName: string
  languageDependent: boolean
  description: string | null
  metaFormData: CaaSApi_DataEntries
}

export interface CaaSApi_Media_File extends CaaSApi_Media_Base {
  mediaType: 'FILE'
  url: string
  fileMetaData: {
    fileSize: number
    extension: string
    mimeType: string
    encoding: string | null
  }
}

export interface CaaSApi_Media_Picture extends CaaSApi_Media_Base {
  mediaType: 'PICTURE'
  resolutionsMetaData: {
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

export type CaaSApi_Media = CaaSApi_Media_File | CaaSApi_Media_Picture

export interface CaasApi_FilterResponse {
  _id: string
  _etag: { $oid: string }
  _returned: number
  _embedded: {
    'rh:doc': (CaaSApi_PageRef | CaaSApi_Dataset | CaaSApi_Media | any)[]
  }
}
