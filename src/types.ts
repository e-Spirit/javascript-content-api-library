import { FSXAContentMode, ImageMapAreaType } from './enums'
import {
  FSXAProxyApi,
  FSXARemoteApi,
  LogLevel,
  MapResponse,
  ReferencedItemsInfo,
  ResolvedReferencesInfo,
} from './modules'
import {
  ArrayQueryOperatorEnum,
  ComparisonQueryOperatorEnum,
  EvaluationQueryOperatorEnum,
  LogicalQueryOperatorEnum,
} from './modules/QueryBuilder'
import XMLParser from './modules/XMLParser'

export interface MasterLocale {
  country: string
  language: string
  identifier: string
}

export interface CaaSApi_Lifespan {
  start: string
  end?: string
}

export interface Lifespan {
  start: Date
  end?: Date
}

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

export interface Point2D {
  x: number
  y: number
}

export interface CaaSApi_ImageMapArea {
  fsType: 'Area'
  areaType: ImageMapAreaType
  link: {
    template: CaaSApi_Template
    formData: CaaSApi_DataEntries
  } | null
}

export interface CaaSApi_ImageMapAreaCircle extends CaaSApi_ImageMapArea {
  areaType: ImageMapAreaType.CIRCLE
  radius: number
  center: Point2D
}

export interface CaaSApi_ImageMapAreaRect extends CaaSApi_ImageMapArea {
  areaType: ImageMapAreaType.RECT
  leftTop: Point2D
  rightBottom: Point2D
}

export interface CaaSApi_ImageMapAreaPoly extends CaaSApi_ImageMapArea {
  areaType: ImageMapAreaType.POLY
  points: Point2D[]
}

export interface CaaSApi_ImageMapMedia
  extends Pick<
    CaaSApi_Media,
    | 'fsType'
    | 'name'
    | 'displayName'
    | 'identifier'
    | 'uid'
    | 'uidType'
    | 'mediaType'
  > {
  url: string
  pictureMetaData: Omit<CaaSApi_Media_Picture_Resolution_MetaData, 'url'>
}

export interface CaaSApi_CMSImageMap {
  fsType: 'CMS_INPUT_IMAGEMAP'
  name: string
  value: {
    fsType: 'MappingMedium'
    media: CaaSApi_MediaRef
    areas: CaaSApi_ImageMapArea[]
    resolution: {
      fsType: 'Resolution'
      uid: string
      width: number
      height: number
    }
  }
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

export interface CaaSApi_Record {
  fsType: 'Record'
  identifier: string
  value: Record<string, any> | null
}

export interface CaaSApi_FSIndex {
  fsType: 'FS_INDEX'
  name: string
  dapType: string
  value: CaaSApi_Record[]
}

export interface CaaSApi_SectionBaseInfo {
  name: string
  displayName: string
  identifier: string
}

export interface CaaSApi_BaseRef {
  fsType: string
  name: string
  identifier: string
  uid: string
  uidType: string
  url: string
  remoteProject?: string
  section?: CaaSApi_SectionBaseInfo
}

export interface CaaSApi_MediaRef extends CaaSApi_BaseRef {
  fsType: 'Media'
  uidType: 'MEDIASTORE_LEAF'
  mediaType: 'PICTURE' | 'FILE'
}

export interface CaaSApi_GCARef extends CaaSApi_BaseRef {
  fsType: 'GCAPage'
  uidType: 'GLOBALSTORE'
  url: ''
}

export interface CaaSApi_PageRefRef extends CaaSApi_BaseRef {
  fsType: 'PageRef'
  uidType: 'SITESTORE_LEAF'
}

export interface CaaSApi_FSReference {
  fsType: 'FS_REFERENCE'
  name: string
  value:
    | CaaSApi_BaseRef
    | CaaSApi_PageRefRef
    | CaaSApi_GCARef
    | CaaSApi_MediaRef
    | null
}

export interface CaaSAPI_PermissionGroup {
  groupName: string
  groupPath: string
}

export interface CaaSAPI_PermissionActivity {
  activity: string
  allowed: CaaSAPI_PermissionGroup[]
  forbidden: CaaSAPI_PermissionGroup[]
}

export interface CaaSApi_CMSInputPermission {
  fsType: 'CMS_INPUT_PERMISSION'
  name: string
  value: CaaSAPI_PermissionActivity[]
}

export interface PermissionGroup extends CaaSAPI_PermissionGroup {
  groupId: string
}

export interface PermissionActivity extends CaaSAPI_PermissionActivity {
  allowed: PermissionGroup[]
  forbidden: PermissionGroup[]
}

export interface Permission extends CaaSApi_CMSInputPermission {
  type: string
  value: PermissionActivity[]
}

export interface DatasetRoute {
  pageRef: string
  route: string
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
  | CaaSApi_CMSImageMap
  | CaaSApi_FSButton
  | CaaSApi_FSCatalog
  | CaaSApi_FSDataset
  | CaaSApi_FSIndex
  | CaaSApi_FSReference
  | CaaSApi_CMSInputRadioButton
  | CaaSApi_CMSInputDate
  | CaaSApi_Option
  | CaaSApi_CMSInputPermission

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
  routes: DatasetRoute[]
  locale: {
    language: string
    country: string
  }
}

export interface CaaSApi_Section {
  fsType: 'Section' | 'GCASection'
  name: string
  displayName: string
  identifier: string
  template: CaaSApi_Template
  formData: CaaSApi_DataEntries
  displayed?: boolean
  lifespan?: CaaSApi_Lifespan
}

export interface CaaSApi_SectionReference {
  fsType: 'SectionReference'
  name: string
  displayName: string
  identifier: string
  template: CaaSApi_Template
  formData: CaaSApi_DataEntries
  displayed?: boolean
  lifespan?: CaaSApi_Lifespan
}

export interface CaaSApi_Body {
  fsType: 'Body' | 'GCABody'
  name: string
  identifier: string
  children: (
    | CaaSApi_Section
    | CaaSApi_Content2Section
    | CaaSApi_SectionReference
  )[]
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
  children: CaaSApi_Body[]
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
  projectConfiguration?: {
    masterLocale: MasterLocale
  }
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
  _id: string
  fsType: 'PageRef'
  name: string
  identifier: string
  uid: string
  uidType: string
  url: string
  page: CaaSApi_Page
  displayName: string
  metaFormData?: CaaSApi_DataEntries
  route: string
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
  changeInfo?: { revision: number }
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

export type CaaSApi_Media_Picture_Resolution_MetaData = {
  fileSize: number
  extension: string
  mimeType: string
  width: number
  height: number
  url: string
}

export interface CaaSApiMediaPictureResolutions {
  [resolution: string]: CaaSApi_Media_Picture_Resolution_MetaData
}
export interface CaaSApi_Media_Picture extends CaaSApi_Media_Base {
  mediaType: 'PICTURE'
  resolutionsMetaData: CaaSApiMediaPictureResolutions
}

export type CaaSApi_Media = CaaSApi_Media_File | CaaSApi_Media_Picture

export interface CaasApi_FilterResponse {
  _id: string
  _etag: { $oid: string }
  _returned: number
  _embedded: {
    'rh:doc': (
      | CaaSApi_PageRef
      | CaaSApi_Dataset
      | CaaSApi_Media
      | CaaSApi_GCAPage
      | any
    )[]
  }
}

export type DataEntry = any

export interface DataEntries {
  [key: string]: DataEntry
}

export type PageBodyContent = Section | Content2Section | Dataset

export interface PageBody {
  type: 'PageBody'
  name: string
  previewId: string
  children: PageBodyContent[]
}

export interface Page {
  type: 'Page'
  id: string
  refId: string
  previewId: string
  name: string
  layout: string
  children: PageBody[]
  data: DataEntries
  meta: DataEntries
  metaPageRef?: DataEntries
  remoteProjectId?: string
  route: string
}

export interface Reference {
  type: 'Reference'
  referenceId: string
  referenceType: string
  referenceRemoteProject?: string
  section?: CaaSApi_SectionBaseInfo
}

export interface Option {
  type: 'Option'
  key: string
  value: string
}

export interface Link {
  type: 'Link'
  template: string
  data: DataEntries
  meta: DataEntries
}

export interface Card {
  type: 'Card'
  id: string
  previewId: string
  template: string
  data: DataEntries
}

/**
 * This type is extended by ImageMapAreaCircle, ImageMapAreaRect, ImageMapAreaPoly
 */
export interface ImageMapArea {
  areaType: ImageMapAreaType
  link: {
    template: string
    data: DataEntries
  } | null
}

export interface ImageMapAreaCircle extends ImageMapArea {
  areaType: ImageMapAreaType.CIRCLE
  radius: number
  center: Point2D
}

export interface ImageMapAreaRect extends ImageMapArea {
  areaType: ImageMapAreaType.RECT
  leftTop: Point2D
  rightBottom: Point2D
}

export interface ImageMapAreaPoly extends ImageMapArea {
  areaType: ImageMapAreaType.POLY
  points: Point2D[]
}

export interface ImageMap {
  type: 'ImageMap'
  media: Image | null
  areas: ImageMapArea[]
}

export interface Media {}

export interface GCAPage {
  type: 'GCAPage'
  id: string
  previewId: string
  name: string
  layout: string
  children: PageBody[]
  data: DataEntries
  meta: DataEntries
  remoteProjectId?: string
}

export interface ProjectProperties {
  type: 'ProjectProperties'
  id: string
  previewId: string
  name: string
  layout: string
  data: DataEntries
  meta: DataEntries
  remoteProjectId?: string
  masterLocale?: MasterLocale
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
  type: 'Section'
  id: string
  name?: string
  displayName?: string
  previewId: string
  sectionType: string
  data: DataEntries
  displayed?: boolean
  lifespan?: Lifespan
  children: Section[]
}

export interface Dataset {
  type: 'Dataset'
  id: string
  previewId: string
  schema: string
  entityType: string
  template: string
  children: Section[]
  data: DataEntries
  route: string
  routes: DatasetRoute[]
  remoteProjectId?: string
  locale: string
}

export interface Image {
  type: 'Image'
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
  remoteProjectId?: string
}

export interface File {
  type: 'File'
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
  remoteProjectId?: string
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
  entryPath: NestedPath,
  utils: {
    api: FSXARemoteApi
    xmlParser: XMLParser
    registerReferencedItem: (
      identifier: string,
      path: NestedPath,
      remoteProjectId?: string
    ) => string
    buildPreviewId: (identifier: string, remoteProjectLocale?: string) => string
    buildMediaUrl: (url: string, rev?: number) => string
    mapDataEntries: (
      entries: CaaSApi_DataEntries,
      path: NestedPath,
      remoteProjectLocale?: string,
      remoteProjectId?: string
    ) => Promise<DataEntries>
  }
) => Promise<any>

export type MappedCaasItem =
  | Page
  | GCAPage
  | Dataset
  | Image
  | File
  | ProjectProperties

export type CaasApi_Item =
  | CaaSApi_Dataset
  | CaaSApi_PageRef
  | CaaSApi_Media
  | CaaSApi_GCAPage
  | CaaSApi_ProjectProperties
export interface FSXAConfiguration {
  apiKey: string
  navigationService: string
  caas: string
  projectId: string
  tenantId: string
  contentMode?: 'preview' | 'release'
  customMapper?: CustomMapper
  remotes?: RemoteProjectConfiguration
  enableEventStream?: boolean
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
  permissions?: {
    allowed: string[]
    denied: string[]
  }
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

export type ComparisonFilterValue = string | number | RegExp | boolean | null

export type ComparisonFilter =
  | {
      field: string
      operator:
        | ComparisonQueryOperatorEnum.GREATER_THAN
        | ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS
        | ComparisonQueryOperatorEnum.LESS_THAN
        | ComparisonQueryOperatorEnum.LESS_THAN_EQUALS
      value: number | string
    }
  | {
      field: string
      operator:
        | ComparisonQueryOperatorEnum.IN
        | ComparisonQueryOperatorEnum.NOT_IN
      value: ComparisonFilterValue[]
    }
  | {
      field: string
      operator:
        | ComparisonQueryOperatorEnum.EQUALS
        | ComparisonQueryOperatorEnum.NOT_EQUALS
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
  value: string[] | number[] | boolean[]
}

export type EvaluationFilter = {
  field: string
  operator: EvaluationQueryOperatorEnum.REGEX
  value: string
  validateRegex?: boolean
}

export type QueryBuilderQuery =
  | LogicalFilter
  | ComparisonFilter
  | ArrayFilter
  | EvaluationFilter

export interface MappedFilter {
  [key: string]:
    | MappedFilter
    | MappedFilter[]
    | ComparisonFilterValue
    | ComparisonFilterValue[]
}

export interface RichTextElement {
  type:
    | 'block'
    | 'text'
    | 'paragraph'
    | 'list'
    | 'listitem'
    | 'linebreak'
    | 'link'
    | string
  content: RichTextElement[] | string
  data: Link | Record<string, any>
}

export type FetchNavigationParams = {
  locale?: string
  initialPath?: string
  fetchOptions?: RequestInit
  filterContext?: unknown
}

export type SortParams = {
  name: string
  order?: 'asc' | 'desc'
}

export type FetchByFilterParams = {
  filters: QueryBuilderQuery[]
  locale?: string
  page?: number
  pagesize?: number
  additionalParams?: Record<'keys' | string, any>
  remoteProject?: string
  fetchOptions?: RequestInit
  filterContext?: unknown
  sort?: SortParams[]
  normalized?: boolean
}

export type FetchElementParams = {
  id: string
  locale: string
  additionalParams?: Record<'keys' | string, any>
  remoteProject?: string
  fetchOptions?: RequestInit
  filterContext?: unknown
  normalized?: boolean
}

export type FetchProjectPropertiesParams = {
  locale: string
  resolver?: string[]
  fetchOptions?: RequestInit
}

export type ConnectEventStreamParams = {
  remoteProject?: string
}

export interface AppContext<T = unknown> {
  app?: T
  fsxaApi?: FSXAApi
}

export type RemoteProjectConfiguration = {
  [name: string]: {
    id: string
    locale: string
  }
}

export type RemoteProjectConfigurationEntry =
  RemoteProjectConfiguration[keyof RemoteProjectConfiguration]

export interface CaasItemFilterParams<FilterContextType> extends MapResponse {
  filterContext?: FilterContextType
  isKeysSet: boolean
}

export type CaasItemFilter<FilterContextType = unknown> = (
  params: CaasItemFilterParams<FilterContextType>
) => Promise<MapResponse> | MapResponse

export interface NavigationItemFilterParams<FilterContextType = unknown> {
  navigationItems: NavigationItem[]
  filterContext?: FilterContextType
}
export type NavigationItemFilter<FilterContextType = unknown> = (
  params: NavigationItemFilterParams<FilterContextType>
) => Promise<NavigationItem[]> | NavigationItem[]

/**
 * Options for filtering data in the {@link FSXARemoteApi FSXARemoteApi}
 *
 * @experimental
 */
export interface RemoteApiFilterOptions<FilterContextType = unknown> {
  navigationItemFilter?: NavigationItemFilter<FilterContextType>
  caasItemFilter?: CaasItemFilter<FilterContextType>
}

export type FSXARemoteApiConfig = {
  apikey: string
  caasURL: string
  navigationServiceURL: string
  tenantID: string
  projectID: string
  contentMode: FSXAContentMode
  remotes?: RemoteProjectConfiguration
  logLevel?: LogLevel
  maxReferenceDepth?: number
  customMapper?: CustomMapper
  filterOptions?: RemoteApiFilterOptions
  enableEventStream?: boolean
}

export type FilterContextProvider = () => unknown | null
/**
 * Options for filtering data in the {@link FSXAProxyApi FSXAProxyApi}
 *
 * @experimental
 */
export interface ProxyApiFilterOptions {
  filterContextProvider?: FilterContextProvider
}

export interface FSXAProxyApiConfig {
  clientUrl: string
  serverUrl: string
  logLevel: LogLevel
  contentMode: FSXAContentMode
  enableEventStream?: boolean
}

export type NormalizedProjectPropertyResponse = {
  projectProperties: ProjectProperties
  projectPropertiesResolvedReferences: NormalizedFetchResponse['resolvedReferences']
  projectPropertiesReferenceMap: NormalizedFetchResponse['referenceMap']
  resolveItems: NormalizedFetchResponse['items']
  resolveResolvedReferences: NormalizedFetchResponse['resolvedReferences']
  resolveReferenceMap: NormalizedFetchResponse['referenceMap']
  idToKeyMap: Record<string, string>
}

export interface FSXAApi {
  mode: 'proxy' | 'remote'
  fetchElement: <T = Page | GCAPage | Dataset | Image | any | null>(
    params: FetchElementParams
  ) => Promise<T>
  fetchByFilter: (params: FetchByFilterParams) => Promise<FetchResponse>
  fetchNavigation: (
    params: FetchNavigationParams
  ) => Promise<NavigationData | null>
  fetchProjectProperties: (
    params: FetchProjectPropertiesParams
  ) => Promise<ProjectProperties | NormalizedProjectPropertyResponse | null>
  enableEventStream: (enable?: boolean) => boolean
}

// Return value of RemoteAPI FetchByFilter normalized = false
export type FetchResponse = DenormalizedFetchRespone | NormalizedFetchResponse

interface FetchResponseBase {
  page: number
  pagesize: number
  totalPages?: number
  size?: number
}

export interface DenormalizedFetchRespone extends FetchResponseBase {
  items: (MappedCaasItem | CaasApi_Item)[] | unknown[]
  resolvedReferences: undefined
  referenceMap: undefined
}

// Return value of RemoteAPI FetchByFilter normalized = true
export interface NormalizedFetchResponse extends FetchResponseBase {
  items: (MappedCaasItem | CaasApi_Item)[] // Mapped Items without resolved refs --> has no circles
  resolvedReferences?: ResolvedReferencesInfo
  referenceMap?: ReferencedItemsInfo
}
