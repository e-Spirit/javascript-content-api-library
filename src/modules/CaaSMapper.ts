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
  CaaSApi_Media_File,
  CaaSApi_Media_Picture,
  CaaSApi_Media,
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
  RichTextElement,
  Section,
  CaasApi_Item,
  MappedCaasItem,
  RemoteProjectConfigurationEntry,
} from '../types'
import { parseISO } from 'date-fns'
import { chunk, update } from 'lodash'
import XMLParser from './XMLParser'
import { Logger } from './Logger'
import { FSXARemoteApi } from './FSXARemoteApi'
import { FSXAContentMode, ImageMapAreaType } from '../enums'
import { findResolvedReferencesByIds, getItemId } from './MappingUtils'

export enum CaaSMapperErrors {
  UNKNOWN_BODY_CONTENT = 'Unknown BodyContent could not be mapped.',
  UNKNOWN_FSTYPE = 'Unknown fsType could not be mapped',
}

const REFERENCED_ITEMS_CHUNK_SIZE = 30
export const DEFAULT_MAX_REFERENCE_DEPTH = 10

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
  locale: string
  xmlParser: XMLParser
  customMapper?: CustomMapper
  referenceDepth: number
  maxReferenceDepth: number
  resolvedReferences: ResolvedReferencesInfo = {}

  constructor(
    api: FSXARemoteApi,
    locale: string,
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
    this.maxReferenceDepth = utils.maxReferenceDepth ?? DEFAULT_MAX_REFERENCE_DEPTH

    this.logger.debug('Created new CaaSMapper')
  }

  // stores references to items of current Project
  _referencedItems: ReferencedItemsInfo = {}
  // stores the forced resolution for image map media, which could applied after reference resolving
  _imageMapForcedResolutions: { imageId: string; resolution: string }[] = []
  // stores References to remote Items
  _remoteReferences: {
    [projectId: string]: ReferencedItemsInfo
  } = {}

  private getRemoteConfigForProject(
    projectId?: string
  ): RemoteProjectConfigurationEntry | undefined {
    return projectId
      ? Object.values(this.api.remotes || {}).find((entry) => entry.id === projectId)
      : undefined
  }

  addToResolvedReferences(item: MappedCaasItem | CaasApi_Item) {
    // Page has pageId as id instead of PageRef Id. --> use refId instead for mapped Pages
    const id = getItemId(item)

    if (id) {
      this.resolvedReferences[id] = item
    }
  }

  /**
   * unifies the two different id formats {id}.{locale} and {id} to {id}.{locale}
   *
   * @param id uuid, may be of form {id}.{locale} or {id}
   * @param overrideLocale force specific locale
   * @returns uuid of form {id}.{locale}
   */
  unifyId(id: string, overrideLocale?: string) {
    const indexOfSeparator = id.indexOf('.')

    if (indexOfSeparator > 0) {
      // id has form {id}.{locale}. Override Locale if set
      return overrideLocale ? `${id.substring(0, indexOfSeparator)}.${overrideLocale}` : id
    }
    // id has form {id}. transform to {id}.{locale}
    return `${id}.${overrideLocale || this.locale}`
  }

  /**
   * registers a referenced Item to be fetched later. If a remoteProjectId is passed,
   * the item will be fetched from the remote Project.
   * @param identifier item identifier
   * @param path after fetch, items are inserted at all registered paths
   * @param remoteProjectId optional. If passed, the item will be fetched from the specified project
   * @returns placeholder string
   */
  registerReferencedItem(identifier: string, path: NestedPath, remoteProjectId?: string): string {
    const remoteData = this.getRemoteConfigForProject(remoteProjectId)
    const remoteProjectKey = remoteData?.id
    const remoteProjectLocale = remoteData?.locale

    if (remoteProjectId && !remoteProjectKey) {
      this.logger.warn(
        `Item with identifier '${identifier}' was tried to register from remoteProject '${remoteProjectId}' but no remote key was found in the config.`
      )
    }

    const unifiedId = this.unifyId(identifier, remoteProjectLocale)

    if (remoteProjectKey) {
      this._remoteReferences[remoteProjectKey][unifiedId] = [
        ...(this._remoteReferences[remoteProjectKey][unifiedId] || []),
        path,
      ]
      return `[REFERENCED-REMOTE-ITEM-${unifiedId}]`
    }

    this._referencedItems[unifiedId] = [...(this._referencedItems[unifiedId] || []), path]
    return `[REFERENCED-ITEM-${unifiedId}]`
  }

  buildPreviewId(identifier: string) {
    return [identifier, this.locale].join('.')
  }

  buildMediaUrl(url: string, rev?: number) {
    if (rev && this.api.contentMode === FSXAContentMode.PREVIEW) {
      url += `${url.includes('?') ? '&' : '?'}rev=${rev}`
    }
    return url
  }

  async mapDataEntry(entry: CaaSApi_DataEntry, path: NestedPath): Promise<DataEntry> {
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
          ? { type: 'Option', key: entry.value.identifier, value: entry.value.label }
          : null
        return comboboxOption
      case 'CMS_INPUT_DOM':
      case 'CMS_INPUT_DOMTABLE':
        const richTextElements: RichTextElement[] = entry.value
          ? await this.xmlParser.parse(entry.value)
          : []
        return this.mapLinksInRichTextElements(richTextElements, path)
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
        const dateValue: Date | null = entry.value ? parseISO(entry.value) : null
        return dateValue
      case 'CMS_INPUT_LINK':
        const link: Link | null = entry.value
          ? {
              type: 'Link',
              template: entry.value.template.uid,
              data: await this.mapDataEntries(entry.value.formData, [...path, 'data']),
              meta: await this.mapDataEntries(entry.value.metaFormData, [...path, 'meta']),
            }
          : null
        return link
      case 'CMS_INPUT_LIST':
        if (!entry.value) return []
        return Promise.all(
          entry.value.map((childEntry, index) => this.mapDataEntry(childEntry, [...path, index]))
        )
      case 'CMS_INPUT_CHECKBOX':
        if (!entry.value) return []
        return Promise.all(
          entry.value.map((childEntry, index) => this.mapDataEntry(childEntry, [...path, index]))
        )
      case 'CMS_INPUT_IMAGEMAP':
        if (!entry || !entry.value) {
          return null
        }
        return this.mapImageMap(entry as CaaSApi_CMSImageMap, path)
      case 'FS_DATASET':
        if (!entry.value) return null
        if (Array.isArray(entry.value)) {
          return Promise.all(
            entry.value.map((childEntry, index) => this.mapDataEntry(childEntry, [...path, index]))
          )
        } else if (entry.value.fsType === 'DatasetReference') {
          return this.registerReferencedItem(entry.value.target.identifier, path)
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
                  [...path, index]
                )
              case 'PageTemplate':
                return {
                  id: card.identifier,
                  previewId: this.buildPreviewId(card.identifier),
                  template: card.template.uid,
                  data: await this.mapDataEntries(card.formData, [...path, index, 'data']),
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
            entry.value.remoteProject
          )
        } else if (['PageRef', 'GCAPage'].includes(entry.value.fsType)) {
          const reference: Reference = {
            type: 'Reference',
            referenceId: entry.value.identifier,
            referenceRemoteProject: entry.value.remoteProject,
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
              const identifier = record?.value?.target?.identifier
              if (!identifier) return null
              return this.registerReferencedItem(identifier, [...path, index])
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
              allowed: activity.allowed.map((group) => this._mapPermissionGroup(group)),
              forbidden: activity.forbidden.map((group) => this._mapPermissionGroup(group)),
            } as PermissionActivity
          }),
        }
        return permission
      default:
        return entry
    }
  }

  async mapLinksInRichTextElements(richTextElements: RichTextElement[], path: NestedPath) {
    await Promise.all(
      richTextElements.map(async (richTextElement, index) => {
        if (richTextElement.type === 'link') {
          const link = {
            type: 'Link',
            template: richTextElement.data.type as string,
            data: await this.mapDataEntries(richTextElement.data.data, [
              ...path,
              index,
              'data',
              'data',
            ]),
            meta: {},
          }
          richTextElement.data = link
        }
        if (Array.isArray(richTextElement.content)) {
          richTextElement.content = await this.mapLinksInRichTextElements(richTextElement.content, [
            ...path,
            index,
            'content',
          ])
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

  async mapDataEntries(entries: CaaSApi_DataEntries, path: NestedPath): Promise<DataEntries> {
    const keys = Object.keys(entries || {})
    const mappedEntries: any[] = await Promise.all(
      Object.keys(entries || {}).map((key) => this.mapDataEntry(entries[key], [...path, key]))
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
    path: NestedPath
  ): Promise<Section> {
    return {
      id: section.identifier,
      type: 'Section',
      sectionType: section.template.uid,
      previewId: this.buildPreviewId(section.identifier),
      data: await this.mapDataEntries(section.formData, [...path, 'data']),
      children: [],
    }
  }

  async mapContent2Section(content2Section: CaaSApi_Content2Section): Promise<Section> {
    return {
      id: content2Section.identifier,
      previewId: this.buildPreviewId(content2Section.identifier),
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
    content: CaaSApi_Content2Section | CaaSApi_Section | CaaSApi_SectionReference,
    path: NestedPath
  ): Promise<PageBodyContent> {
    switch (content.fsType) {
      case 'Content2Section':
        return this.mapContent2Section(content)
      case 'Section':
      case 'SectionReference':
      case 'GCASection':
        return this.mapSection(content, path)
      default:
        throw new Error(
          CaaSMapperErrors.UNKNOWN_BODY_CONTENT + ` fsType=[${(content as any)?.fsType}]`
        )
    }
  }

  async mapPageBody(body: CaaSApi_Body, path: NestedPath): Promise<PageBody> {
    return {
      type: 'PageBody',
      name: body.name,
      previewId: this.buildPreviewId(body.identifier),
      children: await Promise.all(
        body.children.map((child, index) =>
          this.mapBodyContent(child, [...path, 'children', index])
        )
      ),
    }
  }

  async mapPageRef(pageRef: CaaSApi_PageRef, path: NestedPath = []): Promise<Page> {
    return {
      type: 'Page',
      id: pageRef.page.identifier,
      refId: pageRef.identifier,
      previewId: this.buildPreviewId(pageRef.identifier),
      name: pageRef.page.name,
      layout: pageRef.page.template.uid,
      children: await Promise.all(
        pageRef.page.children.map((child, index) =>
          this.mapPageBody(child, [...path, 'children', index])
        )
      ),
      data: await this.mapDataEntries(pageRef.page.formData, [...path, 'data']),
      meta: await this.mapDataEntries(pageRef.page.metaFormData, [...path, 'meta']),
      ...(pageRef.metaFormData && {
        metaPageRef: await this.mapDataEntries(pageRef.metaFormData, [...path, 'metaPageRef']),
      }),
    }
  }

  async mapProjectProperties(
    properties: CaaSApi_ProjectProperties,
    path: NestedPath = []
  ): Promise<ProjectProperties> {
    return {
      type: 'ProjectProperties',
      data: await this.mapDataEntries(properties.formData, [...path, 'data']),
      layout: properties.template.uid,
      meta: await this.mapDataEntries(properties.metaFormData, [...path, 'meta']),
      name: properties.name,
      previewId: this.buildPreviewId(properties.identifier),
      id: properties.identifier,
    }
  }

  async mapImageMapArea(
    area: CaaSApi_ImageMapArea,
    path: NestedPath
  ): Promise<ImageMapArea | null> {
    const base: Partial<ImageMapArea> = {
      areaType: area.areaType,
      link: area.link && {
        template: area.link.template.uid,
        data: await this.mapDataEntries(area.link.formData, [...path, 'link', 'data']),
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

  async mapImageMap(imageMap: CaaSApi_CMSImageMap, path: NestedPath): Promise<ImageMap> {
    if (!imageMap.value) {
      throw new Error('ImageMap value is null')
    }
    const {
      value: { media, areas, resolution },
    } = imageMap

    this.logger.debug('CaaSMapper.mapImageMap - imageMap', imageMap)
    const mappedAreas = await Promise.all(
      areas.map(async (area, index) => this.mapImageMapArea(area, [...path, 'areas', index]))
    )

    let image = null
    if (media) {
      image = this.registerReferencedItem(media.identifier, [...path, 'media'], media.remoteProject)
      this._imageMapForcedResolutions.push({
        imageId: `${media.identifier}.${this.locale}`,
        resolution: resolution.uid,
      })
    }

    return {
      type: 'ImageMap',
      areas: mappedAreas.filter(Boolean) as ImageMapArea[],
      // image is just a "fake" image, it's a string that is used for an unresolved reference (see also TNG-1169)
      media: image as unknown as Image,
    }
  }

  async mapGCAPage(gcaPage: CaaSApi_GCAPage, path: NestedPath = []): Promise<GCAPage> {
    return {
      type: 'GCAPage',
      id: gcaPage.identifier,
      previewId: this.buildPreviewId(gcaPage.identifier),
      name: gcaPage.name,
      layout: gcaPage.template.uid,
      children: await Promise.all(
        gcaPage.children.map((child, index) =>
          this.mapPageBody(child, [...path, 'children', index])
        )
      ),
      data: await this.mapDataEntries(gcaPage.formData, [...path, 'data']),
      meta: await this.mapDataEntries(gcaPage.metaFormData, [...path, 'meta']),
    }
  }

  async mapDataset(dataset: CaaSApi_Dataset, path: NestedPath = []): Promise<Dataset> {
    return {
      type: 'Dataset',
      id: dataset.identifier,
      previewId: this.buildPreviewId(dataset.identifier),
      schema: dataset.schema,
      entityType: dataset.entityType,
      data: await this.mapDataEntries(dataset.formData, [...path, 'data']),
      route: dataset.route,
      routes: dataset.routes,
      template: dataset.template?.uid,
      children: [],
    }
  }

  async mapMediaPicture(item: CaaSApi_Media_Picture, path: NestedPath = []): Promise<Image> {
    return {
      type: 'Image',
      id: item.identifier,
      previewId: this.buildPreviewId(item.identifier),
      meta: await this.mapDataEntries(item.metaFormData, [...path, 'meta']),
      description: item.description,
      resolutions: this.mapMediaPictureResolutionUrls(
        item.resolutionsMetaData,
        item.changeInfo?.revision
      ),
    }
  }

  mapMediaPictureResolutionUrls(
    resolutions: CaaSApiMediaPictureResolutions,
    rev?: number
  ): CaaSApiMediaPictureResolutions {
    for (let resolution in resolutions) {
      resolutions[resolution].url = this.buildMediaUrl(resolutions[resolution].url, rev)
    }
    return resolutions
  }

  async mapMediaFile(item: CaaSApi_Media_File, path: NestedPath): Promise<File> {
    return {
      type: 'File',
      id: item.identifier,
      previewId: this.buildPreviewId(item.identifier),
      meta: await this.mapDataEntries(item.metaFormData, [...path, 'meta']),
      fileName: item.fileName,
      fileMetaData: item.fileMetaData,
      url: item.url,
    }
  }

  async mapMedia(item: CaaSApi_Media, path: NestedPath): Promise<Image | File | null> {
    if (item === null) {
      return null
    }
    switch (item.mediaType) {
      case 'PICTURE':
        return this.mapMediaPicture(item, path)
      case 'FILE':
        return this.mapMediaFile(item, path)
      default:
        return item
    }
  }

  async mapFilterResponse(
    unmappedItems: (CaasApi_Item | any)[],
    additionalParams?: Record<string, any>,
    filterContext?: unknown
  ): Promise<MapResponse> {
    let items: (MappedCaasItem | CaasApi_Item)[] = additionalParams?.keys
      ? unmappedItems // don't map data, if additional params have been set
      : (
          await Promise.all(
            unmappedItems.map((unmappedItem, index) => {
              switch (unmappedItem.fsType) {
                case 'Dataset':
                  return this.mapDataset(unmappedItem, [getItemId(unmappedItem)])
                case 'PageRef':
                  return this.mapPageRef(unmappedItem, [getItemId(unmappedItem)])
                case 'Media':
                  return this.mapMedia(unmappedItem, [getItemId(unmappedItem)])
                case 'GCAPage':
                  return this.mapGCAPage(unmappedItem, [getItemId(unmappedItem)])
                case 'ProjectProperties':
                  return this.mapProjectProperties(unmappedItem, [getItemId(unmappedItem)])
                default:
                  this.logger.warn(`Item at index'${index}' could not be mapped!`)
                  return unmappedItem
              }
            })
          )
        ).filter(Boolean)

    // cache items to avoid fetching them multiple times
    items.forEach((item) => {
      if (item) {
        this.addToResolvedReferences(item)
      }
    })

    // resolve refs
    if (items.length > 0) await this.resolveAllReferences(filterContext)

    // find resolved refs and puzzle them back together
    const mappedItems = findResolvedReferencesByIds(
      items.map((item) => getItemId(item)),
      this.resolvedReferences
    )

    // merge all remote references into one object
    const remoteReferencesValues = Object.values(this._remoteReferences)
    const remoteReferencesMerged =
      remoteReferencesValues.length > 0
        ? remoteReferencesValues.reduce((result, current) => Object.assign(result, current))
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
      this.logger.warn(`Maximum reference depth of ${this.maxReferenceDepth} has been exceeded.`)
      return
    }
    this.referenceDepth++
    const remoteIds = Object.keys(this._remoteReferences)
    this.logger.debug('CaaSMapper.resolveAllReferences', { remoteIds })

    await Promise.all([
      this.resolveReferencesPerProject(undefined, filterContext),
      ...remoteIds.map((remoteId) => this.resolveReferencesPerProject(remoteId, filterContext)),
    ])

    // force a single resolution for image map media
    this._imageMapForcedResolutions.forEach(({ imageId, resolution }, index) => {
      const resolvedImage = this.resolvedReferences[imageId]
      if ((resolvedImage as Image).resolutions) {
        update(resolvedImage, 'resolutions', (resolutions) => {
          if (resolution in resolutions) {
            return { [resolution]: resolutions[resolution] }
          }
          return resolutions
        })
      }
    })
  }

  /**
   * This method will create a filter for all referenced items that are registered inside of the referencedItems
   * and fetch them in a single CaaS-Request. If remoteProjectId is set, referenced Items from the remoteProject are fetched
   * After a successful fetch all references in the json structure will be replaced with the fetched and mapped item
   */
  async resolveReferencesPerProject(remoteProjectId?: string, filterContext?: unknown) {
    this.logger.debug('CaaSMapper.resolveReferencesPerProject', { remoteProjectId })
    const referencedItems = remoteProjectId
      ? this._remoteReferences[remoteProjectId]
      : this._referencedItems

    // use remoteProjectLocale if provided. normal locale as standard
    const remoteProjectData = this.getRemoteConfigForProject(remoteProjectId)
    const remoteProjectLocale = remoteProjectData?.locale
    const locale = remoteProjectLocale || this.locale

    const referencedIds = Object.keys(referencedItems)

    const resolvedIds = new Set(Object.keys(this.resolvedReferences))

    const idsToFetchFromCaaS = referencedIds
      .filter((id) => !resolvedIds.has(id))
      .map((id) => id.substring(0, id.indexOf('.')))

    const idChunks = chunk(idsToFetchFromCaaS, REFERENCED_ITEMS_CHUNK_SIZE)

    this.logger.debug('CaaSMapper.resolveReferencesPerProject: Id data', {
      resolvedIds,
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
              locale,
              pagesize: REFERENCED_ITEMS_CHUNK_SIZE,
              remoteProject: remoteProjectId,
              filterContext,
              normalized: true,
            },
            this
          )
        )
      )
    }
  }
}
