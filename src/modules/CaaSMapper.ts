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
  CaaSApi_Media,
  CaaSApi_Media_File,
  CaaSApi_Media_Picture,
  CaaSApi_PageRef,
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
  NestedPath,
  Page,
  PageBody,
  PageBodyContent,
  ProjectProperties,
  Section,
} from '../types'
import { parseISO } from 'date-fns'
import { chunk, set } from 'lodash'
import XMLParser from './XMLParser'
import { Logger } from './Logger'
import { FSXARemoteApi } from './FSXARemoteApi'
import {
  FSXAContentMode,
  Link,
  Option,
  Reference,
  RichTextElement,
  ImageMapAreaType,
  ImageMapResolution,
} from '..'

export enum CaaSMapperErrors {
  UNKNOWN_BODY_CONTENT = 'Unknown BodyContent could not be mapped.',
  UNKNOWN_FSTYPE = 'Unknown fsType could not be mapped',
}

const REFERENCED_ITEMS_CHUNK_SIZE = 30

interface ReferencedItemsInfo {
  [identifier: string]: NestedPath[]
}

export class CaaSMapper {
  public logger: Logger
  api: FSXARemoteApi
  locale: string
  xmlParser: XMLParser
  customMapper?: CustomMapper

  constructor(
    api: FSXARemoteApi,
    locale: string,
    utils: {
      customMapper?: CustomMapper
    },
    logger: Logger
  ) {
    this.api = api
    this.locale = locale
    this.customMapper = utils.customMapper
    this.xmlParser = new XMLParser(logger)
    Object.keys(this.api.remotes || {}).forEach(
      (item: string) => (this._remoteReferences[item] = {})
    )
    this.logger = logger
  }

  // stores references to items of current Project
  _referencedItems: {
    [identifier: string]: NestedPath[]
  } = {}
  // stores References to remote Items
  _remoteReferences: {
    [projectId: string]: ReferencedItemsInfo
  } = {}

  /**
   * registers a referenced Item to be fetched later. If a remoteProjectId is passed,
   * the item will be fetched from the remote Project. Multiple Calls for the same item
   * with different paths are intended
   * @param identifier item identifier
   * @param path after fetch, items are inserted at all registered paths
   * @param remoteProjectId optional. If passed, the item will be fetched from the specified project
   * @returns placeholder string
   */
  registerReferencedItem(identifier: string, path: NestedPath, remoteProjectId?: string): string {
    const remoteProjectKey = Object.keys(this.api.remotes || {}).find((key) => {
      return this.api.remotes[key].id === remoteProjectId
    })

    if (remoteProjectId && !remoteProjectKey) {
      this.logger.warn(
        `Item with identifier '${identifier}' was tried to register from remoteProject '${remoteProjectId}' but no remote key was found in the config.`
      )
    }
    if (remoteProjectKey) {
      this._remoteReferences[remoteProjectKey][identifier] = [
        ...(this._remoteReferences[remoteProjectKey][identifier] || []),
        path,
      ]
      return `[REFERENCED-REMOTE-ITEM-${identifier}]`
    }

    this._referencedItems[identifier] = [...(this._referencedItems[identifier] || []), path]
    return `[REFERENCED-ITEM-${identifier}]`
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
        return richTextElements
      case 'CMS_INPUT_NUMBER':
      case 'CMS_INPUT_TEXT':
      case 'CMS_INPUT_TEXTAREA':
        const simpleValue: string | number = entry.value
        return simpleValue
      case 'CMS_INPUT_RADIOBUTTON':
        // TODO: This should be mapped to interface Option
        const radiobuttonOption = entry.value
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
      default:
        return entry
    }
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
        return this.mapSection(content, path)
      default:
        throw new Error(CaaSMapperErrors.UNKNOWN_BODY_CONTENT)
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
        data: await this.mapDataEntries(area.link.formData, [...path, 'data']),
      },
    }
    switch (area.areaType) {
      case ImageMapAreaType.RECT:
        return {
          ...base,
          leftTop: (base as CaaSApi_ImageMapAreaRect).leftTop,
          rightBottom: (base as CaaSApi_ImageMapAreaRect).rightBottom,
        } as ImageMapAreaRect
      case ImageMapAreaType.CIRCLE:
        return {
          ...base,
          center: (base as CaaSApi_ImageMapAreaCircle).center,
          radius: (base as CaaSApi_ImageMapAreaCircle).radius,
        } as ImageMapAreaCircle
      case ImageMapAreaType.POLY:
        return {
          ...base,
          points: (base as CaaSApi_ImageMapAreaPoly).points,
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
    const [mappedAreas, mappedMedia] = await Promise.all([
      Promise.all(
        areas.map(async (area, index) => this.mapImageMapArea(area, [...path, 'areas', index]))
      ),
      this.mapMedia(media, path),
    ])

    const imageMapResolution: ImageMapResolution = {
      width: resolution.width,
      height: resolution.height,
      uid: resolution.uid,
    }

    return {
      type: 'ImageMap',
      areas: mappedAreas.filter(Boolean) as ImageMapArea[],
      resolution: imageMapResolution,
      media: mappedMedia?.type === 'Image' ? mappedMedia : null,
    }
  }

  async mapGCAPage(gcaPage: CaaSApi_GCAPage, path: NestedPath = []): Promise<GCAPage> {
    return {
      type: 'GCAPage',
      id: gcaPage.identifier,
      previewId: this.buildPreviewId(gcaPage.identifier),
      name: gcaPage.name,
      layout: gcaPage.template.uid,
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
      template: dataset.template?.uid,
      children: [],
    }
  }

  async mapMediaPicture(item: CaaSApi_Media_Picture, path: NestedPath): Promise<Image> {
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

  async mapElementResponse(
    element: CaaSApi_Dataset | CaaSApi_PageRef | CaaSApi_Media | CaaSApi_GCAPage | any
  ): Promise<Dataset | Page | Image | GCAPage | null | any> {
    let response
    switch (element.fsType) {
      case 'Dataset':
        response = await this.mapDataset(element, [])
        break
      case 'PageRef':
        response = await this.mapPageRef(element, [])
        break
      case 'Media':
        response = await this.mapMedia(element, [])
        break
      case 'GCAPage':
        response = await this.mapGCAPage(element, [])
        break
      default:
        // we could not map the element --> just returning the raw values
        return element
    }
    this.logger.debug('CaaSMapper.mapElementResponse - response', response)
    return this.resolveAllReferences(response as {})
  }

  async mapPageRefResponse(pageRef: CaaSApi_PageRef): Promise<Page> {
    const mappedPage = await this.mapPageRef(pageRef)
    return this.resolveAllReferences(mappedPage)
  }

  async mapFilterResponse(
    items: (
      | CaaSApi_Dataset
      | CaaSApi_PageRef
      | CaaSApi_Media
      | CaaSApi_GCAPage
      | CaaSApi_ProjectProperties
    )[]
  ): Promise<(Page | GCAPage | Dataset | Image)[]> {
    const mappedItems = (
      await Promise.all(
        items.map((item, index) => {
          switch (item.fsType) {
            case 'Dataset':
              return this.mapDataset(item, [index])
            case 'PageRef':
              return this.mapPageRef(item, [index])
            case 'Media':
              return this.mapMedia(item, [index]) as Promise<any>
            case 'GCAPage':
              return this.mapGCAPage(item, [index])
            case 'ProjectProperties':
              return this.mapProjectProperties(item, [index])
            default:
              this.logger.warn(`Item at index'${index}' could not be mapped!`)
              return item
          }
        })
      )
    ).filter(Boolean) as (Page | GCAPage | Dataset | Image)[]
    return this.resolveAllReferences(mappedItems)
  }

  /**
   * Calls ResolveReferences for currentProject and each RemoteProject
   *
   * @param data
   * @returns data
   */
  async resolveAllReferences<Type extends {}>(data: Type): Promise<Type> {
    const remoteIds = Object.keys(this._remoteReferences)

    await Promise.all([
      this.resolveReferencesPerProject(data),
      ...remoteIds.map((remoteId) => this.resolveReferencesPerProject(data, remoteId)),
    ])
    return data
  }

  /**
   * This method will create a filter for all referenced items that are registered inside of the referencedItems
   * and fetch them in a single CaaS-Request. If remoteProjectId is set, referenced Items from the remoteProject are fetched
   * After a successful fetch all references in the json structure will be replaced with the fetched and mapped item
   */
  async resolveReferencesPerProject<T extends {}>(data: T, remoteProjectId?: string): Promise<T> {
    const referencedItems = remoteProjectId
      ? this._remoteReferences[remoteProjectId]
      : this._referencedItems

    const remoteProjectKey = Object.keys(this.api.remotes || {}).find((key) => {
      return key === remoteProjectId
    })
    const locale =
      remoteProjectKey && this.api.remotes ? this.api.remotes[remoteProjectKey].locale : this.locale

    const ids = Object.keys(referencedItems)
    const idChunks = chunk(ids, REFERENCED_ITEMS_CHUNK_SIZE)
    if (ids?.length > 0) {
      const response = await Promise.all(
        idChunks.map((ids) =>
          this.api.fetchByFilter({
            filters: [
              {
                operator: ComparisonQueryOperatorEnum.IN,
                value: ids,
                field: 'identifier',
              },
            ],
            locale,
          })
        )
      )
      const fetchedItems = response.map(({ items }) => items).flat()
      ids.forEach((id) =>
        referencedItems[id].forEach((path) =>
          set(
            data,
            path,
            fetchedItems.find((data) => {
              const hasId = typeof data === 'object' && 'id' in (data as object)
              if (hasId) {
                return (data as { id: string }).id === id
              }
            })
          )
        )
      )
    }
    return data
  }
}
