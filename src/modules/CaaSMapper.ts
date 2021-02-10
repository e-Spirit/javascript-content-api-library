import set from 'lodash.set'
import { ComparisonQueryOperatorEnum, FSXAApi } from './'
import {
  CaaSApi_Body,
  CaaSApi_Content2Section,
  CaaSApi_DataEntries,
  CaaSApi_DataEntry,
  CaaSApi_Dataset,
  CaaSApi_GCAPage,
  CaaSApi_Media,
  CaaSApi_Media_Picture,
  CaaSApi_PageRef,
  CaaSApi_Section,
  CaaSApi_SectionReference,
  CustomMapper,
  DataEntries,
  DataEntry,
  Dataset,
  GCAPage,
  Image,
  Media,
  NestedPath,
  Page,
  PageBody,
  PageBodyContent,
  RichTextElement,
  Section
} from '../types'
import { parseISO } from 'date-fns'
import { chunk } from 'lodash'
import XMLParser from './XMLParser'
import { Logger } from './Logger'

export enum CaaSMapperErrors {
  UNKNOWN_BODY_CONTENT = 'Unknown BodyContent could not be mapped.'
}

const REFERENCED_ITEMS_CHUNK_SIZE = 30

export class CaaSMapper {
  api: FSXAApi
  locale: string
  xmlParser: XMLParser
  customMapper?: CustomMapper

  constructor(
    api: FSXAApi,
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
  }

  _referencedItems: {
    [identifier: string]: NestedPath[]
  } = {}

  registerReferencedItem(identifier: string, path: NestedPath): string {
    this._referencedItems[identifier] = [...(this._referencedItems[identifier] || []), path]
    return `[REFERENCED-ITEM-${identifier}]`
  }

  buildPreviewId(identifier: string) {
    return [identifier, this.locale].join('.')
  }

  async prepareRichtext(value: string, path: NestedPath): Promise<RichTextElement[]> {
    const richtexts = await this.xmlParser.parse(value, path.join('-'))
    return this.registerRichtextReferences(richtexts, path)
  }

  async registerRichtextReferences(
    richtexts: RichTextElement[],
    path: NestedPath
  ): Promise<RichTextElement[]> {
    return Promise.all(
      richtexts.map(async (richtext, index) => {
        const result = {
          ...richtext
        }
        if (Array.isArray(richtext.content)) {
          result.content = await this.registerRichtextReferences(richtext.content, [
            ...path,
            index,
            'content'
          ])
        }
        if (richtext?.data?.data) {
          result.data.data = await this.mapDataEntries(richtext.data.data, [
            ...path,
            index,
            'data',
            'data'
          ])
        }
        return result
      })
    )
  }

  async mapDataEntry(entry: CaaSApi_DataEntry, path: NestedPath): Promise<DataEntry> {
    if (this.customMapper) {
      const result = await this.customMapper(entry, {
        registerReferencedItem: this.registerReferencedItem,
        api: this.api
      })
      if (typeof result !== 'undefined') return result
    }
    switch (entry.fsType) {
      case 'CMS_INPUT_COMBOBOX':
        return entry.value ? { key: entry.value.identifier, value: entry.value.label } : null
      case 'CMS_INPUT_DOM':
        return entry.value ? this.prepareRichtext(entry.value, path) : []
      case 'CMS_INPUT_NUMBER':
      case 'CMS_INPUT_TEXT':
      case 'CMS_INPUT_TEXTAREA':
        return entry.value
      case 'CMS_INPUT_RADIOBUTTON':
        return entry.value
      case 'CMS_INPUT_DATE':
        return entry.value ? parseISO(entry.value) : null
      case 'CMS_INPUT_LINK':
        return entry.value
          ? {
              template: entry.value.template.uid,
              data: await this.mapDataEntries(entry.value.formData, [...path, 'data']),
              meta: await this.mapDataEntries(entry.value.metaFormData, [...path, 'meta'])
            }
          : null
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
          (entry.value || []).map(async (card, index) => ({
            id: card.identifier,
            previewId: this.buildPreviewId(card.identifier),
            template: card.template.uid,
            data: await this.mapDataEntries(card.formData, [...path, index, 'data'])
          }))
        )
      case 'FS_REFERENCE':
        if (!entry.value) return null
        if (entry.value.fsType === 'Media') {
          return this.registerReferencedItem(entry.value.identifier, path)
        } else if (entry.value.fsType === 'PageRef') {
          return {
            referenceId: entry.value.identifier,
            referenceType: entry.value.fsType
          }
        }
        return entry
      case 'FS_INDEX':
        if (entry.dapType === 'DatasetDataAccessPlugin') {
          return entry.value.map((record, index) => {
            return this.registerReferencedItem(record.value.target.identifier, [...path, index])
          })
        }
        return entry
      case 'Option':
        return {
          key: entry.identifier,
          value: entry.label
        }
      default:
        this.api.logger.log(
          `[mapDataEntry]: Unknown Type ${entry.fsType}. Returning raw value:`,
          entry.fsType,
          entry
        )
        return entry
    }
  }

  async mapDataEntries(entries: CaaSApi_DataEntries, path: NestedPath): Promise<DataEntries> {
    const keys = Object.keys(entries || {})
    const mappedEntries: any[] = await Promise.all(
      Object.keys(entries || {}).map(key => this.mapDataEntry(entries[key], [...path, key]))
    )
    return keys.reduce(
      (result, key, index) => ({
        ...result,
        [key]: mappedEntries[index]
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
      children: []
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
        schema: content2Section.schema
      },
      sectionType: content2Section.template.uid,
      children: []
    }
  }

  async mapBodyContent(
    content: CaaSApi_Content2Section | CaaSApi_Section | CaaSApi_SectionReference,
    path: NestedPath
  ): Promise<PageBodyContent> {
    switch (content.fsType) {
      case 'Content2Section':
        return await this.mapContent2Section(content)
      case 'Section':
        return await this.mapSection(content, path)
      case 'SectionReference':
        return await this.mapSection(content, path)
      default:
        throw new Error(CaaSMapperErrors.UNKNOWN_BODY_CONTENT)
    }
  }

  async mapPageBody(body: CaaSApi_Body, path: NestedPath): Promise<PageBody> {
    return {
      name: body.name,
      previewId: this.buildPreviewId(body.identifier),
      children: await Promise.all(
        body.children.map((child, index) =>
          this.mapBodyContent(child, [...path, 'children', index])
        )
      )
    }
  }

  async mapPageRef(pageRef: CaaSApi_PageRef, path: NestedPath = []): Promise<Page> {
    return {
      id: pageRef.page.identifier,
      refId: pageRef.identifier,
      previewId: this.buildPreviewId(pageRef.page.identifier),
      name: pageRef.page.name,
      layout: pageRef.page.template.uid,
      children: await Promise.all(
        pageRef.page.children.map((child, index) =>
          this.mapPageBody(child, [...path, 'children', index])
        )
      ),
      data: await this.mapDataEntries(pageRef.page.formData, [...path, 'data']),
      meta: await this.mapDataEntries(pageRef.page.metaFormData, [...path, 'meta'])
    }
  }

  async mapGCAPage(gcaPage: CaaSApi_GCAPage, path: NestedPath = []): Promise<GCAPage> {
    return {
      id: gcaPage.identifier,
      previewId: this.buildPreviewId(gcaPage.identifier),
      name: gcaPage.name,
      layout: gcaPage.template.uid,
      data: await this.mapDataEntries(gcaPage.formData, [...path, 'data']),
      meta: await this.mapDataEntries(gcaPage.metaFormData, [...path, 'meta'])
    }
  }

  async mapDataset(dataset: CaaSApi_Dataset, path: NestedPath = []): Promise<Dataset> {
    return {
      id: dataset.identifier,
      previewId: this.buildPreviewId(dataset.identifier),
      type: 'Dataset',
      schema: dataset.schema,
      entityType: dataset.entityType,
      data: await this.mapDataEntries(dataset.formData, [...path, 'data']),
      route: dataset.route,
      template: dataset.template?.uid,
      children: []
    }
  }

  async mapMediaPicture(item: CaaSApi_Media_Picture, path: NestedPath): Promise<Image> {
    return {
      id: item.identifier,
      previewId: this.buildPreviewId(item.identifier),
      meta: await this.mapDataEntries(item.metaFormData, [...path, 'meta']),
      description: item.description,
      resolutions: item.resolutionsMetaData
    }
  }

  async mapMedia(item: CaaSApi_Media, path: NestedPath): Promise<Image | any | null> {
    switch (item.mediaType) {
      case 'PICTURE':
        return this.mapMediaPicture(item, path)
      default:
        return item
    }
  }

  async mapElementResponse(
    element: CaaSApi_Dataset | CaaSApi_PageRef | CaaSApi_Media | CaaSApi_GCAPage | any,
    maxReferenceDepth: number
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
    return this.resolveReferences(response as {}, maxReferenceDepth)
  }

  async mapPageRefResponse(pageRef: CaaSApi_PageRef, maxReferenceDepth: number): Promise<Page> {
    const mappedPage = await this.mapPageRef(pageRef)
    return this.resolveReferences(mappedPage, maxReferenceDepth)
  }

  async mapFilterResponse(
    items: (CaaSApi_Dataset | CaaSApi_PageRef | CaaSApi_Media | CaaSApi_GCAPage)[],
    maxReferenceDepth: number
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
          }
        })
      )
    ).filter(Boolean) as (Page | GCAPage | Dataset | Image)[]
    return maxReferenceDepth > 0
      ? this.resolveReferences(mappedItems, maxReferenceDepth)
      : mappedItems
  }

  /**
   * This method will create a filter for all referenced items that are registered inside of the referencedItems
   * and fetch them in a single CaaS-Request
   * After a successful fetch all references in the json structure will be replaced with the fetched and mapped item
   */
  async resolveReferences<Type extends {}>(data: Type, maxReferenceDepth: number): Promise<Type> {
    const ids = Object.keys(this._referencedItems)
    const idChunks = chunk(ids, REFERENCED_ITEMS_CHUNK_SIZE)
    if (ids.length > 0) {
      const response = await Promise.all(
        idChunks.map(ids =>
          this.api.fetchByFilter(
            [
              {
                operator: ComparisonQueryOperatorEnum.IN,
                value: ids,
                field: 'identifier'
              }
            ],
            this.locale,
            1,
            REFERENCED_ITEMS_CHUNK_SIZE,
            {},
            maxReferenceDepth - 1
          )
        )
      )
      const fetchedItems = response.reduce((result, entries) => [...result, ...entries], [])
      ids.forEach(id =>
        this._referencedItems[id].forEach(path =>
          set(data, path, fetchedItems.find(data => data.id === id) || null)
        )
      )
      return data
    }
    return data
  }
}
