import { FSXAApi } from './modules'
import {
  ArrayQueryOperatorEnum,
  ComparisonQueryOperatorEnum,
  LogicalQueryOperatorEnum
} from './modules/QueryBuilder'

export interface CaaSApi_Template {
  fsType: 'PageTemplate' | 'SectionTemplate' | 'LinkTemplate'
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
  value: CaaSApi_Option[]
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
   * This contains xml
   */
  value: string
}

export interface CaaSApi_CMSInputDOMTable {
  fsType: 'CMS_INPUT_DOMTABLE'
  name: string
  /**
   * This contains xml
   */
  value: string
}

export interface CaaSApi_CMSInputToggle {
  fsType: 'CMS_INPUT_TOGGLE'
  name: string
  value: boolean | null
}

export interface CaaSApi_CMSInputCheckbox {}

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

export interface CaaSApi_CMSInputRadioButton {
  fsType: 'CMS_INPUT_RADIOBUTTON'
  name: string
  value: CaaSApi_Option | null
}

export interface CaaSApi_CMSInputDate {
  fsType: 'CMS_INPUT_DATE'
  name: string
  value: string | null
}

export interface CaaSApi_FSDataset {
  fsType: 'FS_DATASET'
  name: string
  value:
    | {
        fsType: 'DatasetReference'
        target: {
          fsType: 'Dataset'
          schema: string
          entityType: string
          identifier: string
        }
      }
    | CaaSApi_DataEntry[]
    | null
}

export interface CaaSApi_FSButton {
  fsType: 'FS_BUTTON'
  name: string
  value: {}
}

export interface CaaSApi_Card {
  fsType: 'Card'
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
  value: any
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
  | CaaSApi_CMSInputCheckbox
  | CaaSApi_CMSInputCombobox
  | CaaSApi_CMSInputDOM
  | CaaSApi_CMSInputDOMTable
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
  | CaaSApi_CMSInputRadioButton
  | CaaSApi_CMSInputDate
  | CaaSApi_Option

export interface CaaSApi_DataEntries {
  [key: string]: CaaSApi_DataEntry
}

export interface CaaSApi_Content2Section {
  fsType: 'Content2Section'
  identifier: string
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

export interface CaaSApi_SectionReference {
  fsType: 'SectionReference'
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
  children: (CaaSApi_Section | CaaSApi_Content2Section | CaaSApi_SectionReference)[]
}

export interface CaaSApi_GCAPage {
  _id: string
  fsType: 'GCAPage'
  name: string
  displayName: string
  identifier: string
  uid: string
  uidType: string
  template: CaaSApi_Template
  formData: CaaSApi_DataEntries
  metaFormData: CaaSApi_DataEntries
}
export interface CaaSApi_ProjectProperties {
  _id: string
  fsType: 'ProjectProperties'
  name: string
  displayName: string
  identifier: string
  template: CaaSApi_Template
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
  metaFormData: CaaSApi_DataEntries
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
    'rh:doc': (CaaSApi_PageRef | CaaSApi_Dataset | CaaSApi_Media | CaaSApi_GCAPage | any)[]
  }
}

export type DataEntry = any

export interface DataEntries {
  [key: string]: DataEntry
}

export type PageBodyContent = Section | Content2Section | Dataset

export interface PageBody {
  name: string
  previewId: string
  children: PageBodyContent[]
}

export interface Page {
  id: string
  refId: string
  previewId: string
  name: string
  layout: string
  children: PageBody[]
  data: DataEntries
  meta: DataEntries
  metaPageRef: DataEntries
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

export interface GCAPage {
  id: string
  previewId: string
  name: string
  layout: string
  data: DataEntries
  meta: DataEntries
}

export interface ProjectProperties {
  id: string
  previewId: string
  name: string
  layout: string
  data: DataEntries
  meta: DataEntries
}

export interface Content2Section {
  type: 'Content2Section'
  sectionType: string
  data: {
    schema: string
    entityType: string
    query: string | null
    recordCountPerPage: number
    maxPageCount: number
    filterParams: Record<string, any>
    ordering: {
      attribute: string
      ascending: boolean
    }[]
  }
  children: Dataset[]
}

export interface Section {
  id: string
  previewId: string
  type: 'Section'
  sectionType: string
  data: DataEntries
  children: Section[]
}

export interface Dataset {
  id: string
  previewId: string
  schema: string
  type: 'Dataset'
  entityType: string
  template: string
  children: Section[]
  data: DataEntries
  route: string
}

export interface Image {
  id: string
  previewId: string
  meta: DataEntries
  description: string | null
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

export interface File {
  id: string
  previewId: string
  meta: DataEntries
  fileName: string
  url: string
  fileMetaData: {
    fileSize: number
    extension: string
    mimeType: string
    encoding: string | null
  }
}

export interface RegisteredDatasetQuery {
  name: string
  filterParams: Record<string, string>
  ordering: {
    attribute: string
    ascending: boolean
  }[]
  path: NestedPath
  schema: string
  entityType: string
}
export type NestedPath = (string | number)[]

export type CustomMapper = (
  entry: CaaSApi_DataEntry,
  utils: {
    api: FSXAApi
    registerReferencedItem: (identifier: string, path: NestedPath) => string
  }
) => Promise<any | undefined>

export type FSXAApiParams =
  | {
      mode: 'proxy'
      baseUrl: string
    }
  | {
      mode: 'remote'
      config: FSXAConfiguration
    }

export interface FSXAConfiguration {
  apiKey: string
  navigationService: string
  caas: string
  projectId: string
  tenantId: string
  customMapper?: CustomMapper
  remotes?: Record<string, string>
}

export interface ObjectMap<ValueType = any> {
  [key: string]: ValueType
}

export interface StructureItem {
  id: string
  children: StructureItem[]
}

export interface NavigationItem {
  id: string
  parentIds: string[]
  label: string
  contentReference: string | null
  caasDocumentId: string
  seoRoute: string
  seoRouteRegex: string | null
  customData: any
}

export interface NavigationData {
  idMap: {
    [id: string]: NavigationItem
  }
  seoRouteMap: {
    [route: string]: string
  }
  structure: StructureItem[]
  pages: {
    index: string
  }
  meta: {
    identifier: {
      tenantId: string
      navigationId: string
      languageId: string
    }
  }
}

export type ComparisonFilterValue = string | number | RegExp

export type ComparisonFilter =
  | {
      field: string
      operator:
        | ComparisonQueryOperatorEnum.GREATER_THAN
        | ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS
        | ComparisonQueryOperatorEnum.LESS_THAN
        | ComparisonQueryOperatorEnum.LESS_THAN_EQUALS
      value: number
    }
  | {
      field: string
      operator: ComparisonQueryOperatorEnum.IN | ComparisonQueryOperatorEnum.NOT_IN
      value: ComparisonFilterValue[]
    }
  | {
      field: string
      operator: ComparisonQueryOperatorEnum.EQUALS | ComparisonQueryOperatorEnum.NOT_EQUALS
      value: ComparisonFilterValue | ComparisonFilterValue[]
    }

export type LogicalFilter =
  | {
      operator: LogicalQueryOperatorEnum.AND
      filters: (LogicalFilter | ComparisonFilter | ArrayFilter)[]
    }
  | {
      field: string
      operator: LogicalQueryOperatorEnum.NOT
      filter: {
        operator: ComparisonQueryOperatorEnum
        value: any
      }
    }
  | {
      operator: LogicalQueryOperatorEnum.NOR
      filters: (LogicalFilter | ComparisonFilter | ArrayFilter)[]
    }
  | {
      operator: LogicalQueryOperatorEnum.OR
      filters: (LogicalFilter | ComparisonFilter | ArrayFilter)[]
    }

export type ArrayFilter = {
  field: string
  operator: ArrayQueryOperatorEnum.ALL
  value: string[] | number[]
}

export type QueryBuilderQuery = LogicalFilter | ComparisonFilter | ArrayFilter

export interface MappedFilter {
  [key: string]: MappedFilter | MappedFilter[] | ComparisonFilterValue | ComparisonFilterValue[]
}

export interface RichTextElement {
  type: 'block' | 'text' | 'paragraph' | 'list' | 'listitem' | 'linebreak' | 'link' | string
  content: RichTextElement[] | string
  data: Record<string, any>
}
