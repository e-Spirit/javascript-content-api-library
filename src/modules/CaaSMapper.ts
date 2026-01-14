import { ComparisonQueryOperatorEnum } from './'
import {
  CaaSApi_Body,
  CaaSApi_CMSImageMap,
  CaaSApi_Content2Section,
  CaaSApi_DataEntries,
  CaaSApi_DataEntry,
  CaaSApi_Dataset,
  CaaSApi_GCAPage,
  CaaSApi_ImageMapArea,
  CaaSApi_ImageMapAreaCircle,
  CaaSApi_ImageMapAreaPoly,
  CaaSApi_ImageMapAreaRect,
  CaasApi_Item,
  CaaSApi_Media,
  CaaSApi_Media_File,
  CaaSApi_Media_Picture,
  CaaSApi_PageRef,
  CaaSAPI_PermissionGroup,
  CaaSApi_ProjectProperties,
  CaaSApi_Section,
  CaaSApi_SectionReference,
  CaaSApiMediaPictureResolutions,
  CustomMapper,
  DataEntries,
  DataEntry,
  Dataset,
  File,
  GCAPage,
  Image,
  ImageMap,
  ImageMapArea,
  ImageMapAreaCircle,
  ImageMapAreaPoly,
  ImageMapAreaRect,
  Link,
  MappedCaasItem,
  NestedPath,
  Option,
  Page,
  PageBody,
  PageBodyContent,
  Permission,
  PermissionActivity,
  PermissionGroup,
  ProjectProperties,
  Reference,
  RemoteProjectConfigurationEntry,
  RichTextElement,
  Section,
} from '../types'
import { parseISO } from 'date-fns'
import XMLParser from './XMLParser'
import { Logger, LogLevel } from './Logger'
import { FSXARemoteApi } from './FSXARemoteApi'
import { FSXAContentMode, ImageMapAreaType } from '../enums'
import { findResolvedReferencesByIds, getItemId } from './MappingUtils'

const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export enum CaaSMapperErrors {
  UNKNOWN_BODY_CONTENT = 'Unknown BodyContent could not be mapped.',
  UNKNOWN_FSTYPE = 'Unknown fsType could not be mapped',
}

const REFERENCED_ITEMS_CHUNK_SIZE = 30
export const DEFAULT_MAX_REFERENCE_DEPTH = 2

export interface ReferencedItemsInfo {
  [identifier: string]: NestedPath[]
}

export interface ResolvedReferencesInfo {
  [id: string]: MappedCaasItem | CaasApi_Item
}

export interface MapResponse {
  resolvedReferences: ResolvedReferencesInfo
  mappedItems: (MappedCaasItem | CaasApi_Item)[]
  referenceMap: ReferencedItemsInfo
}

export class CaaSMapper {
  public logger: Logger
  api: FSXARemoteApi
  locale: string | undefined
  xmlParser: XMLParser
  customMapper?: CustomMapper
  referenceDepth: number
  maxReferenceDepth: number
  resolvedReferences: ResolvedReferencesInfo = {}
  // stores references to items of current Project
  _referencedItems: ReferencedItemsInfo = {}
  // stores References to remote Items
  _remoteReferences: {
    [projectId: string]: ReferencedItemsInfo
  } = {}
  // stores items that are being or have been processed and should not be fetched
  // Again. They cannot be added to resolvedReferences yet, since the fetch call
  // just started, when we need to keep track of them.
  _processedItems: Record<string, true> = {}

  constructor(
    api: FSXARemoteApi,
    locale: string | undefined,
    utils: {
      customMapper?: CustomMapper
      referenceDepth?: number
      maxReferenceDepth?: number
    },
    logger: Logger
  ) {
    this.api = api
    this.locale = locale
    this.customMapper = utils.customMapper
    this.xmlParser = new XMLParser(logger)
    Object.values(this.api.remotes || {}).forEach(
      (entry) => (this._remoteReferences[entry.id] = {})
    )
    this.logger = logger
    this.referenceDepth = utils.referenceDepth ?? 0
    this.maxReferenceDepth =
      utils.maxReferenceDepth ?? DEFAULT_MAX_REFERENCE_DEPTH

    this.logger.debug('Created new CaaSMapper')
  }

  addToResolvedReferences(
    item: MappedCaasItem | CaasApi_Item,
    remoteProjectId?: string
  ) {
    // Page has pageId as id instead of PageRef Id. --> use refId instead for mapped Pages
    const id = getItemId(item, remoteProjectId)
    if (id) {
      this.logger.debug('Add to resolvedReferences', id)
      this.resolvedReferences[id] = item
    } else {
      this.logger.warn('No id for item', item)
    }
  }

  /**
   * unifies the two different id formats {id}.{locale} and {id} to {id}.{locale}
   * if remoteProjectConfiguration is passed, prefix with project id to avoid uuid clashes
   *
   * @param id uuid, may be of form {id}.{locale} or {id}
   * @param remoteProjectConfiguration remoteProjectConfig
   * @returns uuid of form {id}.{locale} or {remoteProjectId}#{id}.{locale}
   */
  unifyId(
    id: string,
    remoteProjectConfiguration?: RemoteProjectConfigurationEntry
  ) {
    const indexOfSeparator = id.indexOf('.')
    const remoteLocale = remoteProjectConfiguration?.locale
    let idWithLocale
    if (indexOfSeparator > 0) {
      // id has form {id}.{locale}. Override Locale if set
      idWithLocale = remoteLocale
        ? `${id.substring(0, indexOfSeparator)}.${remoteLocale}`
        : id
    } else {
      // id has form {id}. transform to {id}.{locale}
      idWithLocale = `${id}.${remoteLocale || this.locale}`
    }
    return remoteProjectConfiguration
      ? `${remoteProjectConfiguration.id}#${idWithLocale}`
      : idWithLocale
  }

  /**
   * registers a referenced Item to be fetched later. If a remoteProjectId is passed,
   * the item will be fetched from the remote Project.
   * @param identifier item identifier
   * @param path after fetch, items are inserted at all registered paths
   * @param remoteProjectId optional. If passed, the item will be fetched from the specified project
   * @returns placeholder string
   */
  registerReferencedItem(
    identifier: string,
    path: NestedPath,
    remoteProjectId?: string,
    imageMapResolution?: string
  ): string {
    const remoteData = this.getRemoteConfigForProject(remoteProjectId)
    const remoteProjectKey = remoteData?.id

    if (remoteProjectId && !remoteProjectKey) {
      this.logger.warn(
        `Item with identifier '${identifier}' was tried to register from remoteProject '${remoteProjectId}' but no remote key was found in the config.`
      )
    }

    const unifiedId = this.unifyId(identifier, remoteData)

    // Preflight check to avoid costly operations in non debug mode
    this.logger.logLevel === LogLevel.DEBUG &&
      this.logger.debug('Registering Referenced Item ', {
        remoteProjectKey,
        identifier,
        path: path.join('/'),
      })

    if (remoteProjectKey) {
      this._remoteReferences[remoteProjectKey][unifiedId] = [
        ...(this._remoteReferences[remoteProjectKey][unifiedId] || []),
        path,
      ]
      return imageMapResolution
        ? `IMAGEMAP___${imageMapResolution}___${unifiedId}`
        : `[REFERENCED-REMOTE-ITEM-${unifiedId}]`
    }

    this._referencedItems[unifiedId] = [
      ...(this._referencedItems[unifiedId] || []),
      path,
    ]
    return imageMapResolution
      ? `IMAGEMAP___${imageMapResolution}___${unifiedId}`
      : `[REFERENCED-ITEM-${unifiedId}]`
  }

  buildPreviewId(identifier: string, remoteProjectLocale?: string) {
    return [identifier, remoteProjectLocale || this.locale].join('.')
  }

  buildMediaUrl(url: string, rev?: number) {
    if (rev && this.api.contentMode === FSXAContentMode.PREVIEW) {
      url += `${url.includes('?') ? '&' : '?'}rev=${rev}`
    }
    return url
  }

  async mapDataEntry(
    entry: CaaSApi_DataEntry,
    path: NestedPath,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<DataEntry> {
    if (this.customMapper) {
      const result = await this.customMapper(entry, path, {
        api: this.api as any,
        xmlParser: this.xmlParser,
        registerReferencedItem: this.registerReferencedItem.bind(this),
        buildPreviewId: this.buildPreviewId.bind(this),
        buildMediaUrl: this.buildMediaUrl.bind(this),
        mapDataEntries: this.mapDataEntries.bind(this),
      })
      if (typeof result !== 'undefined') return result
    }
    switch (entry.fsType) {
      case 'CMS_INPUT_COMBOBOX':
        const comboboxOption: Option | null = entry.value
          ? {
              type: 'Option',
              key: entry.value.identifier,
              value: entry.value.label,
            }
          : null
        return comboboxOption
      case 'CMS_INPUT_DOM':
      case 'CMS_INPUT_DOMTABLE':
        const richTextElements: RichTextElement[] = entry.value
          ? await this.xmlParser.parse(entry.value)
          : []
        return this.mapLinksInRichTextElements(
          richTextElements,
          path,
          remoteProjectLocale,
          remoteProjectId
        )
      case 'CMS_INPUT_NUMBER':
      case 'CMS_INPUT_TEXT':
      case 'CMS_INPUT_TEXTAREA':
        const simpleValue: string | number = entry.value
        return simpleValue
      case 'CMS_INPUT_RADIOBUTTON':
        const radiobuttonOption: Option | null = entry.value
          ? {
              type: 'Option',
              key: entry.value.identifier,
              value: entry.value.label,
              // TODO: Remove this spread with next major release (Breaking Change!)
              ...entry.value,
            }
          : null
        return radiobuttonOption
      case 'CMS_INPUT_DATE':
        const dateValue: Date | null = entry.value
          ? parseISO(entry.value)
          : null
        return dateValue
      case 'CMS_INPUT_LINK':
        const link: Link | null = entry.value
          ? {
              type: 'Link',
              template: entry.value.template.uid,
              data: await this.mapDataEntries(
                entry.value.formData,
                [...path, 'data'],
                remoteProjectLocale,
                remoteProjectId
              ),
              meta: await this.mapDataEntries(
                entry.value.metaFormData,
                [...path, 'meta'],
                remoteProjectLocale,
                remoteProjectId
              ),
            }
          : null
        return link
      case 'CMS_INPUT_LIST':
        if (!entry.value) return []
        return Promise.all(
          entry.value.map((childEntry, index) =>
            this.mapDataEntry(
              childEntry,
              [...path, index],
              remoteProjectLocale,
              remoteProjectId
            )
          )
        )
      case 'CMS_INPUT_CHECKBOX':
        if (!entry.value) return []
        return Promise.all(
          entry.value.map((childEntry, index) =>
            this.mapDataEntry(
              childEntry,
              [...path, index],
              remoteProjectLocale,
              remoteProjectId
            )
          )
        )
      case 'CMS_INPUT_IMAGEMAP':
        if (!entry || !entry.value) {
          return null
        }
        return this.mapImageMap(
          entry as CaaSApi_CMSImageMap,
          path,
          remoteProjectLocale,
          remoteProjectId
        )
      case 'FS_DATASET':
        if (!entry.value) return null
        if (Array.isArray(entry.value)) {
          return Promise.all(
            entry.value.map((childEntry, index) =>
              this.mapDataEntry(
                childEntry,
                [...path, index],
                remoteProjectLocale,
                remoteProjectId
              )
            )
          )
        } else if (entry.value.fsType === 'DatasetReference') {
          return this.registerReferencedItem(
            entry.value.target.identifier,
            path,
            remoteProjectId
          )
        }
        return null
      case 'CMS_INPUT_TOGGLE':
        return entry.value || false
      case 'FS_CATALOG':
        return Promise.all(
          (entry.value || []).map(async (card, index) => {
            switch (card.template.fsType) {
              case 'SectionTemplate':
              case 'LinkTemplate':
                return this.mapSection(
                  {
                    ...card,
                    fsType: 'Section',
                    name: card.template.name,
                    displayName: card.template.displayName,
                  },
                  [...path, index],
                  remoteProjectLocale,
                  remoteProjectId
                )
              case 'PageTemplate':
                return {
                  id: card.identifier,
                  previewId: this.buildPreviewId(
                    card.identifier,
                    remoteProjectLocale
                  ),
                  template: card.template.uid,
                  data: await this.mapDataEntries(
                    card.formData,
                    [...path, index, 'data'],
                    remoteProjectLocale,
                    remoteProjectId
                  ),
                }
              default:
                return card
            }
          })
        )
      case 'FS_REFERENCE':
        if (!entry.value) return null
        if (entry.value.fsType === 'Media') {
          return this.registerReferencedItem(
            entry.value.identifier,
            path,
            entry.value.remoteProject || remoteProjectId
          )
        } else if (['PageRef', 'GCAPage'].includes(entry.value.fsType)) {
          const reference: Reference = {
            type: 'Reference',
            referenceId: entry.value.identifier,
            referenceRemoteProject:
              entry.value.remoteProject || remoteProjectId,
            referenceType: entry.value.fsType,
          }
          Object.keys(entry.value).includes('section') &&
            Object.assign(reference, { section: entry.value.section })
          return reference
        }
        return entry
      case 'FS_INDEX':
        if (entry.dapType === 'DatasetDataAccessPlugin') {
          return entry.value
            .map((record, index) => {
              const identifier: string | undefined =
                record?.value?.target?.identifier
              if (!identifier) return null
              return this.registerReferencedItem(
                identifier,
                [...path, index],
                remoteProjectId
              )
            })
            .filter(Boolean)
        }
        return entry
      case 'Option':
        const option: Option = {
          type: 'Option',
          key: entry.identifier,
          value: entry.label,
        }
        return option
      case 'CMS_INPUT_PERMISSION':
        const permission: Permission = {
          type: 'Permission',
          fsType: entry.fsType,
          name: entry.name,
          value: entry.value.map((activity) => {
            return {
              allowed: activity.allowed.map((group) =>
                this._mapPermissionGroup(group)
              ),
              forbidden: activity.forbidden.map((group) =>
                this._mapPermissionGroup(group)
              ),
            } as PermissionActivity
          }),
        }
        return permission
      default:
        return entry
    }
  }

  async mapLinksInRichTextElements(
    richTextElements: RichTextElement[],
    path: NestedPath,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ) {
    await Promise.all(
      richTextElements.map(async (richTextElement, index) => {
        if (richTextElement.type === 'link') {
          const link = {
            type: 'Link',
            template: richTextElement.data.type as string,
            data: await this.mapDataEntries(
              richTextElement.data.data,
              [...path, index, 'data', 'data'],
              remoteProjectLocale,
              remoteProjectId
            ),
            meta: {},
          }
          richTextElement.data = link
        }
        if (Array.isArray(richTextElement.content)) {
          richTextElement.content = await this.mapLinksInRichTextElements(
            richTextElement.content,
            [...path, index, 'content'],
            remoteProjectLocale,
            remoteProjectId
          )
        }
      })
    )
    return richTextElements
  }

  _mapPermissionGroup(group: CaaSAPI_PermissionGroup): PermissionGroup {
    return {
      groupId: group.groupPath.split('/').pop(),
      groupName: group.groupName,
      groupPath: group.groupPath,
    } as PermissionGroup
  }

  async mapDataEntries(
    entries: CaaSApi_DataEntries,
    path: NestedPath,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<DataEntries> {
    const keys = Object.keys(entries || {})
    const mappedEntries: any[] = await Promise.all(
      Object.keys(entries || {}).map((key) =>
        this.mapDataEntry(
          entries[key],
          [...path, key],
          remoteProjectLocale,
          remoteProjectId
        )
      )
    )
    return keys.reduce(
      (result, key, index) => ({
        ...result,
        [key]: mappedEntries[index],
      }),
      {}
    )
  }

  async mapSection(
    section: CaaSApi_Section | CaaSApi_SectionReference,
    path: NestedPath,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<Section> {
    return {
      id: section.identifier,
      type: 'Section',
      name: section.name,
      displayName: section.displayName,
      sectionType: section.template.uid,
      previewId: this.buildPreviewId(section.identifier, remoteProjectLocale),
      data: await this.mapDataEntries(
        section.formData,
        [...path, 'data'],
        remoteProjectLocale,
        remoteProjectId
      ),
      displayed: section.displayed,
      ...(section.lifespan && {
        lifespan: {
          start: new Date(section.lifespan.start),
          ...(section.lifespan.end && { end: new Date(section.lifespan.end) }),
        },
      }),
      children: [],
    }
  }

  async mapContent2Section(
    content2Section: CaaSApi_Content2Section,
    remoteProjectLocale?: string
  ): Promise<Section> {
    return {
      id: content2Section.identifier,
      previewId: this.buildPreviewId(
        content2Section.identifier,
        remoteProjectLocale
      ),
      name: content2Section.name,
      displayName: content2Section.displayName,
      type: 'Section',
      data: {
        entityType: content2Section.entityType,
        filterParams: content2Section.filterParams,
        maxPageCount: content2Section.maxPageCount,
        ordering: content2Section.ordering,
        query: content2Section.query,
        recordCountPerPage: content2Section.recordCountPerPage,
        schema: content2Section.schema,
      },
      sectionType: content2Section.template.uid,
      children: [],
    }
  }

  async mapBodyContent(
    content:
      | CaaSApi_Content2Section
      | CaaSApi_Section
      | CaaSApi_SectionReference,
    path: NestedPath,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<PageBodyContent> {
    switch (content.fsType) {
      case 'Content2Section':
        return this.mapContent2Section(content, remoteProjectLocale)
      case 'Section':
      case 'SectionReference':
      case 'GCASection':
        return this.mapSection(
          content,
          path,
          remoteProjectLocale,
          remoteProjectId
        )
      default:
        throw new Error(
          CaaSMapperErrors.UNKNOWN_BODY_CONTENT +
            ` fsType=[${(content as any)?.fsType}]`
        )
    }
  }

  async mapPageBody(
    body: CaaSApi_Body,
    path: NestedPath,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<PageBody> {
    return {
      type: 'PageBody',
      name: body.name,
      previewId: this.buildPreviewId(body.identifier, remoteProjectLocale),
      children: await Promise.all(
        body.children.map((child, index) =>
          this.mapBodyContent(
            child,
            [...path, 'children', index],
            remoteProjectLocale,
            remoteProjectId
          )
        )
      ),
    }
  }

  async mapPageRef(
    pageRef: CaaSApi_PageRef,
    path: NestedPath = [],
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<Page> {
    return {
      type: 'Page',
      id: pageRef.page.identifier,
      refId: pageRef.identifier,
      previewId: this.buildPreviewId(pageRef.identifier, remoteProjectLocale),
      name: pageRef.page.name,
      layout: pageRef.page.template.uid,
      children: await Promise.all(
        pageRef.page.children.map((child, index) =>
          this.mapPageBody(
            child,
            [...path, 'children', index],
            remoteProjectLocale,
            remoteProjectId
          )
        )
      ),
      data: await this.mapDataEntries(
        pageRef.page.formData,
        [...path, 'data'],
        remoteProjectLocale,
        remoteProjectId
      ),
      meta: await this.mapDataEntries(
        pageRef.page.metaFormData,
        [...path, 'meta'],
        remoteProjectLocale,
        remoteProjectId
      ),
      ...(pageRef.metaFormData && {
        metaPageRef: await this.mapDataEntries(
          pageRef.metaFormData,
          [...path, 'metaPageRef'],
          remoteProjectLocale,
          remoteProjectId
        ),
      }),
      remoteProjectId,
      route: pageRef.route,
    }
  }

  async mapProjectProperties(
    properties: CaaSApi_ProjectProperties,
    path: NestedPath = [],
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<ProjectProperties> {
    return {
      type: 'ProjectProperties',
      data: await this.mapDataEntries(
        properties.formData,
        [...path, 'data'],
        remoteProjectLocale,
        remoteProjectId
      ),
      layout: properties.template.uid,
      meta: await this.mapDataEntries(
        properties.metaFormData,
        [...path, 'meta'],
        remoteProjectLocale,
        remoteProjectId
      ),
      name: properties.name,
      previewId: this.buildPreviewId(
        properties.identifier,
        remoteProjectLocale
      ),
      id: properties.identifier,
      masterLocale: properties.projectConfiguration?.masterLocale,
      remoteProjectId,
    }
  }

  async mapImageMapArea(
    area: CaaSApi_ImageMapArea,
    path: NestedPath,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<ImageMapArea | null> {
    const base: Partial<ImageMapArea> = {
      areaType: area.areaType,
      link: area.link && {
        template: area.link.template.uid,
        data: await this.mapDataEntries(
          area.link.formData,
          [...path, 'link', 'data'],
          remoteProjectLocale,
          remoteProjectId
        ),
      },
    }
    switch (area.areaType) {
      case ImageMapAreaType.RECT:
        return {
          ...base,
          leftTop: (area as CaaSApi_ImageMapAreaRect).leftTop,
          rightBottom: (area as CaaSApi_ImageMapAreaRect).rightBottom,
        } as ImageMapAreaRect
      case ImageMapAreaType.CIRCLE:
        return {
          ...base,
          center: (area as CaaSApi_ImageMapAreaCircle).center,
          radius: (area as CaaSApi_ImageMapAreaCircle).radius,
        } as ImageMapAreaCircle
      case ImageMapAreaType.POLY:
        return {
          ...base,
          points: (area as CaaSApi_ImageMapAreaPoly).points,
        } as ImageMapAreaPoly
      default:
        return null
    }
  }

  async mapImageMap(
    imageMap: CaaSApi_CMSImageMap,
    path: NestedPath,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<ImageMap> {
    if (!imageMap.value) {
      throw new Error('ImageMap value is null')
    }
    const {
      value: { media, areas, resolution },
    } = imageMap

    this.logger.debug('CaaSMapper.mapImageMap - imageMap', imageMap)
    const mappedAreas = await Promise.all(
      areas.map(async (area, index) =>
        this.mapImageMapArea(
          area,
          [...path, 'areas', index],
          remoteProjectLocale,
          remoteProjectId
        )
      )
    )

    let image = null
    if (media) {
      image = this.registerReferencedItem(
        media.identifier,
        [...path, 'media'],
        media.remoteProject,
        resolution.uid
      )
    }

    return {
      type: 'ImageMap',
      areas: mappedAreas.filter(Boolean) as ImageMapArea[],
      // image is just a "fake" image, it's a string that is used for an unresolved reference (see also TNG-1169)
      media: image as unknown as Image,
    }
  }

  async mapGCAPage(
    gcaPage: CaaSApi_GCAPage,
    path: NestedPath = [],
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<GCAPage> {
    return {
      type: 'GCAPage',
      id: gcaPage.identifier,
      previewId: this.buildPreviewId(gcaPage.identifier, remoteProjectLocale),
      name: gcaPage.name,
      layout: gcaPage.template.uid,
      children: await Promise.all(
        gcaPage.children.map((child, index) =>
          this.mapPageBody(
            child,
            [...path, 'children', index],
            remoteProjectLocale,
            remoteProjectId
          )
        )
      ),
      data: await this.mapDataEntries(
        gcaPage.formData,
        [...path, 'data'],
        remoteProjectLocale,
        remoteProjectId
      ),
      meta: await this.mapDataEntries(
        gcaPage.metaFormData,
        [...path, 'meta'],
        remoteProjectLocale,
        remoteProjectId
      ),
      remoteProjectId,
    }
  }

  async mapDataset(
    dataset: CaaSApi_Dataset,
    path: NestedPath = [],
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<Dataset> {
    return {
      type: 'Dataset',
      id: dataset.identifier,
      previewId: this.buildPreviewId(dataset.identifier, remoteProjectLocale),
      schema: dataset.schema,
      entityType: dataset.entityType,
      data: await this.mapDataEntries(
        dataset.formData,
        [...path, 'data'],
        remoteProjectLocale,
        remoteProjectId
      ),
      route: dataset.route,
      routes: dataset.routes,
      template: dataset.template?.uid,
      children: [],
      remoteProjectId,
      locale: dataset.locale.language + '_' + dataset.locale.country,
    }
  }

  async mapMediaPicture(
    item: CaaSApi_Media_Picture,
    path: NestedPath = [],
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<Image> {
    return {
      type: 'Image',
      id: item.identifier,
      previewId: this.buildPreviewId(item.identifier, remoteProjectLocale),
      meta: await this.mapDataEntries(
        item.metaFormData,
        [...path, 'meta'],
        remoteProjectLocale,
        remoteProjectId
      ),
      description: item.description,
      resolutions: this.mapMediaPictureResolutionUrls(
        item.resolutionsMetaData,
        item.changeInfo?.revision
      ),
      remoteProjectId,
    }
  }

  mapMediaPictureResolutionUrls(
    resolutions: CaaSApiMediaPictureResolutions,
    rev?: number
  ): CaaSApiMediaPictureResolutions {
    for (let resolution in resolutions) {
      resolutions[resolution].url = this.buildMediaUrl(
        resolutions[resolution].url,
        rev
      )
    }
    return resolutions
  }

  async mapMediaFile(
    item: CaaSApi_Media_File,
    path: NestedPath,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<File> {
    return {
      type: 'File',
      id: item.identifier,
      previewId: this.buildPreviewId(item.identifier, remoteProjectLocale),
      meta: await this.mapDataEntries(
        item.metaFormData,
        [...path, 'meta'],
        remoteProjectLocale,
        remoteProjectId
      ),
      fileName: item.fileName,
      fileMetaData: item.fileMetaData,
      url: item.url,
      remoteProjectId,
    }
  }

  async mapMedia(
    item: CaaSApi_Media,
    path: NestedPath,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<Image | File | null> {
    if (item === null) {
      return null
    }
    switch (item.mediaType) {
      case 'PICTURE':
        return this.mapMediaPicture(
          item,
          path,
          remoteProjectLocale,
          remoteProjectId
        )
      case 'FILE':
        return this.mapMediaFile(
          item,
          path,
          remoteProjectLocale,
          remoteProjectId
        )
      default:
        return item
    }
  }

  // reassigned locale to avoid wrong preview ids
  // each item has its own locale
  private setLocaleFromCaasItem(item: CaasApi_Item | any) {
    if (item.locale) {
      this.locale = item.locale.language + '_' + item.locale.country
    }
  }

  async mapFilterResponse(
    unmappedItems: (CaasApi_Item | any)[],
    additionalParams?: Record<string, any>,
    filterContext?: unknown,
    remoteProjectLocale?: string,
    remoteProjectId?: string
  ): Promise<MapResponse> {
    let items: (MappedCaasItem | CaasApi_Item)[] = additionalParams?.keys
      ? unmappedItems // don't map data, if additional params have been set
      : (
          await Promise.all(
            unmappedItems.map((unmappedItem, index) => {
              this.setLocaleFromCaasItem(unmappedItem)
              switch (unmappedItem.fsType) {
                case 'Dataset':
                  return this.mapDataset(
                    unmappedItem,
                    [getItemId(unmappedItem, remoteProjectId)],
                    remoteProjectLocale,
                    remoteProjectId
                  )
                case 'PageRef':
                  return this.mapPageRef(
                    unmappedItem,
                    [getItemId(unmappedItem, remoteProjectId)],
                    remoteProjectLocale,
                    remoteProjectId
                  )
                case 'Media':
                  return this.mapMedia(
                    unmappedItem,
                    [getItemId(unmappedItem, remoteProjectId)],
                    remoteProjectLocale,
                    remoteProjectId
                  )
                case 'GCAPage':
                  return this.mapGCAPage(
                    unmappedItem,
                    [getItemId(unmappedItem, remoteProjectId)],
                    remoteProjectLocale,
                    remoteProjectId
                  )
                case 'ProjectProperties':
                  return this.mapProjectProperties(
                    unmappedItem,
                    [getItemId(unmappedItem, remoteProjectId)],
                    remoteProjectLocale,
                    remoteProjectId
                  )
                default:
                  this.logger.warn(
                    `Item at index [${index}] with type [${unmappedItem.fsType}] could not be mapped!`
                  )
                  return unmappedItem
              }
            })
          )
        ).filter(Boolean)

    // cache items to avoid fetching them multiple times
    items.forEach((item) => {
      if (item) {
        this.addToResolvedReferences(item, remoteProjectId)
      }
    })

    // resolve refs
    if (items.length > 0) await this.resolveAllReferences(filterContext)

    // find resolved refs and puzzle them back together
    const mappedItems = findResolvedReferencesByIds(
      items.map((item) => getItemId(item, remoteProjectId)),
      this.resolvedReferences
    )

    // merge all remote references into one object
    const remoteReferencesValues = Object.values(this._remoteReferences)
    const remoteReferencesMerged =
      remoteReferencesValues.length > 0
        ? remoteReferencesValues.reduce((result, current) =>
            Object.assign(result, current)
          )
        : {}

    // return
    return {
      mappedItems,
      referenceMap: { ...this._referencedItems, ...remoteReferencesMerged },
      resolvedReferences: this.resolvedReferences,
    }
  }

  /**
   * Calls ResolveReferences for currentProject and each RemoteProject
   *
   * @param data
   * @returns data
   */
  async resolveAllReferences(filterContext?: unknown): Promise<void> {
    if (this.referenceDepth >= this.maxReferenceDepth) {
      // hint: handle unresolved references TNG-1169
      this.logger.warn(
        `Maximum reference depth of ${this.maxReferenceDepth} has been reached.`
      )
      return
    }
    this.referenceDepth++
    const remoteIds = Object.keys(this._remoteReferences)
    this.logger.debug('CaaSMapper.resolveAllReferences', { remoteIds })

    await Promise.all([
      this.resolveReferencesPerProject(undefined, filterContext),
      ...remoteIds.map((remoteId) =>
        this.resolveReferencesPerProject(remoteId, filterContext)
      ),
    ])
  }

  /**
   * This method will create a filter for all referenced items that are registered inside of the referencedItems
   * and fetch them in a single CaaS-Request. If remoteProjectId is set, referenced Items from the remoteProject are fetched
   * After a successful fetch all references in the json structure will be replaced with the fetched and mapped item
   */
  async resolveReferencesPerProject(
    remoteProjectId?: string,
    filterContext?: unknown
  ) {
    this.logger.debug('CaaSMapper.resolveReferencesPerProject', {
      remoteProjectId,
    })
    const referencedItems = remoteProjectId
      ? this._remoteReferences[remoteProjectId]
      : this._referencedItems

    // use remoteProjectLocale if provided. normal locale as standard
    const remoteProjectData = this.getRemoteConfigForProject(remoteProjectId)
    const remoteProjectLocale = remoteProjectData?.locale
    const locale = remoteProjectLocale || this.locale

    const referencedIds = Object.keys(referencedItems)

    const resolvedIdsArray = Object.keys(this.resolvedReferences)
    const resolvedIds = new Set(resolvedIdsArray)

    const idsToFetchFromCaaS = referencedIds
      .filter((id) => !resolvedIds.has(id) && !this._processedItems[id])
      .map((id) => id.substring(id.indexOf('#') + 1, id.indexOf('.')))

    referencedIds.forEach((id) => (this._processedItems[id] = true))

    const idChunks = chunk(idsToFetchFromCaaS, REFERENCED_ITEMS_CHUNK_SIZE)

    // skip stringification if logLevel is higher than debug
    this.logger.logLevel === LogLevel.DEBUG &&
      this.logger.debug('CaaSMapper.resolveReferencesPerProject: Id data', {
        project: remoteProjectId || 'localProject',
        resolvedIdsArray,
        referencedIds,
        idsToFetchFromCaaS,
      })

    // we need to resolve some refs
    if (idsToFetchFromCaaS.length > 0) {
      // we pass "this" as context to fetchByFilter
      await Promise.all(
        idChunks.map((ids) =>
          this.api.fetchByFilter(
            {
              filters: [
                {
                  operator: ComparisonQueryOperatorEnum.IN,
                  value: ids,
                  field: 'identifier',
                },
              ],
              locale: remoteProjectLocale || locale,
              pagesize: REFERENCED_ITEMS_CHUNK_SIZE,
              remoteProject: remoteProjectId,
              filterContext,
              normalized: true,
            },
            this
          )
        )
      )
    } else {
      this.logger.debug(
        'CaaSMapper.resolveReferencesPerProject: Nothing to fetch'
      )
    }
  }

  private getRemoteConfigForProject(
    projectId?: string
  ): RemoteProjectConfigurationEntry | undefined {
    return projectId
      ? Object.values(this.api.remotes || {}).find(
          (entry) => entry.id === projectId
        )
      : undefined
  }
}
