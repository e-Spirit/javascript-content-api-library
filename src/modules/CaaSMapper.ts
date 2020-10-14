import set from 'lodash.set'
import { FSXAApi, ComparisonQueryOperatorEnum } from './'
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
  Content2Section,
  DataEntries,
  DataEntry,
  Dataset,
  GCAPage,
  Image,
  NestedPath,
  Page,
  PageBody,
  PageBodyContent,
  QueryBuilderQuery,
  RegisteredDatasetQuery,
  Section
} from '../types'
import { LogicalQueryOperatorEnum } from './QueryBuilder'

export enum CaaSMapperErrors {
  UNKNOWN_BODY_CONTENT = 'Unknown BodyContent could not be mapped.'
}

export class CaaSMapper {
  api: FSXAApi
  locale: string
  mapDatasetQuery: (query: RegisteredDatasetQuery) => QueryBuilderQuery[]

  constructor(
    api: FSXAApi,
    locale: string,
    mapDatasetQuery: (query: RegisteredDatasetQuery) => QueryBuilderQuery[],
    fetchNested: boolean = false
  ) {
    this.api = api
    this.locale = locale
    this.mapDatasetQuery = mapDatasetQuery
  }

  _referencedItems: {
    [identifier: string]: NestedPath[]
  } = {}

  _referencedDatasetQueries: {
    [identifier: string]: RegisteredDatasetQuery
  } = {}

  registerReferencedItem(identifier: string, path: NestedPath): string {
    this._referencedItems[identifier] = [...(this._referencedItems[identifier] || []), path]
    return `[REFERENCED-ITEM-${identifier}]`
  }

  registerDatasetQuery(
    name: string,
    filterParams: Record<string, string>,
    ordering: {
      attribute: string
      ascending: boolean
    }[],
    schema: string,
    entityType: string,
    path: NestedPath
  ) {
    const id = name + '-' + JSON.stringify(filterParams)
    this._referencedDatasetQueries[id] = {
      name,
      filterParams,
      ordering,
      path,
      schema,
      entityType
    }
    return `[REFERENCED-DATASET-QUERY-${id}]`
  }

  buildPreviewId(identifier: string) {
    return [identifier, this.locale].join('.')
  }

  mapDataEntry(entry: CaaSApi_DataEntry, path: NestedPath): DataEntry {
    switch (entry.fsType) {
      case 'CMS_INPUT_COMBOBOX':
        return entry.value ? { key: entry.value.identifier, value: entry.value.label } : null
      case 'CMS_INPUT_DOM':
      case 'CMS_INPUT_NUMBER':
      case 'CMS_INPUT_TEXT':
      case 'CMS_INPUT_TEXTAREA':
        return entry.value
      case 'CMS_INPUT_LINK':
        return entry.value
          ? {
              template: entry.value.template.uid,
              data: this.mapDataEntries(entry.value.formData, [...path, 'data']),
              meta: this.mapDataEntries(entry.value.metaFormData, [...path, 'meta'])
            }
          : null
      case 'CMS_INPUT_LIST':
      case 'FS_BUTTON':
      case 'FS_DATASET':
        console.log('Found', entry.fsType, entry)
        return null
      case 'CMS_INPUT_TOGGLE':
        return entry.value || false
      case 'FS_CATALOG':
        return (entry.value || []).map((card, index) => ({
          id: card.identifier,
          previewId: this.buildPreviewId(card.identifier),
          template: card.template.uid,
          data: this.mapDataEntries(card.formData, [...path, index, 'data'])
        }))
      case 'FS_REFERENCE':
        if (!entry.value) return null
        if (entry.value.fsType === 'Media') {
          return this.registerReferencedItem(entry.value.identifier, path)
        } else if (entry.value.fsType === 'PageRef') {
          return {
            referenceId: 'ef7eb160-9fc9-4970-8c65-2f1125b0086c',
            referenceType: 'PageRef'
          }
        }
    }
    return null
  }

  mapDataEntries(entries: CaaSApi_DataEntries, path: NestedPath): DataEntries {
    return Object.keys(entries || {}).reduce(
      (result, key) => ({
        ...result,
        [key]: this.mapDataEntry(entries[key], [...path, key])
      }),
      {}
    )
  }

  mapSection(section: CaaSApi_Section, path: NestedPath): Section {
    return {
      id: section.identifier,
      type: 'Section',
      sectionType: section.template.uid,
      previewId: this.buildPreviewId(section.identifier),
      data: this.mapDataEntries(section.formData, [...path, 'data']),
      children: []
    }
  }

  mapContent2Section(content2Section: CaaSApi_Content2Section, path: NestedPath): Content2Section {
    return {
      type: 'Content2Section',
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
      children: content2Section.query
        ? (this.registerDatasetQuery(
            content2Section.query,
            content2Section.filterParams,
            content2Section.ordering,
            content2Section.schema,
            content2Section.entityType,
            [...path, 'children']
          ) as any)
        : []
    }
  }

  mapBodyContent(
    content: CaaSApi_Content2Section | CaaSApi_Section,
    path: NestedPath
  ): PageBodyContent {
    switch (content.fsType) {
      case 'Content2Section':
        return this.mapContent2Section(content, path)
      case 'Section':
        return this.mapSection(content, path)
      default:
        throw new Error(CaaSMapperErrors.UNKNOWN_BODY_CONTENT)
    }
  }

  mapPageBody(body: CaaSApi_Body, path: NestedPath): PageBody {
    return {
      name: body.name,
      previewId: this.buildPreviewId(body.identifier),
      children: body.children.map((child, index) =>
        this.mapBodyContent(child, [...path, 'children', index])
      )
    }
  }

  mapPageRef(pageRef: CaaSApi_PageRef, path: NestedPath = []): Page {
    return {
      id: pageRef.page.identifier,
      refId: pageRef.identifier,
      previewId: this.buildPreviewId(pageRef.page.identifier),
      name: pageRef.page.name,
      layout: pageRef.page.template.uid,
      children: pageRef.page.children.map((child, index) =>
        this.mapPageBody(child, [...path, 'children', index])
      ),
      data: this.mapDataEntries(pageRef.page.formData, [...path, 'data']),
      meta: this.mapDataEntries(pageRef.page.metaFormData, [...path, 'meta'])
    }
  }

  mapGCAPage(gcaPage: CaaSApi_GCAPage, path: NestedPath = []): GCAPage {
    return {
      id: gcaPage.identifier,
      previewId: this.buildPreviewId(gcaPage.identifier),
      name: gcaPage.name,
      layout: gcaPage.template.uid,
      data: this.mapDataEntries(gcaPage.formData, [...path, 'data']),
      meta: this.mapDataEntries(gcaPage.metaFormData, [...path, 'meta'])
    }
  }

  mapDataset(dataset: CaaSApi_Dataset, path: NestedPath = []): Dataset {
    return {
      id: dataset.identifier,
      previewId: this.buildPreviewId(dataset.identifier),
      type: 'Dataset',
      schema: dataset.schema,
      entityType: dataset.entityType,
      data: this.mapDataEntries(dataset.formData, [...path, 'data']),
      route: dataset.route,
      template: dataset.template.uid,
      children: []
    }
  }

  mapMediaPicture(item: CaaSApi_Media_Picture, path: NestedPath): Image {
    return {
      id: item.identifier,
      previewId: this.buildPreviewId(item.identifier),
      resolutions: item.resolutionsMetaData
    }
  }

  mapMedia(item: CaaSApi_Media, path: NestedPath): Image | null {
    switch (item.mediaType) {
      case 'PICTURE':
        return this.mapMediaPicture(item, path)
      default:
        return null
    }
  }

  async mapPageRefResponse(pageRef: CaaSApi_PageRef): Promise<Page> {
    const mappedPage = this.mapPageRef(pageRef)
    return this.resolveReferences(mappedPage)
  }

  async mapFilterResponse(
    items: (CaaSApi_Dataset | CaaSApi_PageRef | CaaSApi_Media | CaaSApi_GCAPage)[]
  ): Promise<(Page | GCAPage | Dataset | Image)[]> {
    const mappedItems = items
      .map((item, index) => {
        switch (item.fsType) {
          case 'Dataset':
            return this.mapDataset(item, [index])
          case 'PageRef':
            return this.mapPageRef(item, [index])
          case 'Media':
            return this.mapMedia(item, [index])
          case 'GCAPage':
            return this.mapGCAPage(item, [index])
        }
      })
      .filter(Boolean) as (Page | GCAPage | Dataset | Image)[]
    return this.resolveReferences(mappedItems)
  }

  /**
   * This method will create a filter for all referenced items that are registered inside of the referencedItems
   * and fetch them in a single CaaS-Request
   * After a successful fetch all references in the json structure will be replaced with the fetched and mapped item
   */
  async resolveReferences<Type extends {}>(data: Type): Promise<Type> {
    // we will resolve out dataset-queries first
    // after that we will resolve other references as well
    const datasetQueryIds = Object.keys(this._referencedDatasetQueries)
    const queryResults = await Promise.all(
      datasetQueryIds.map(queryId =>
        this.resolveDatasetQuery(this._referencedDatasetQueries[queryId])
      )
    )
    queryResults.forEach((queryResult, index) => {
      const query = this._referencedDatasetQueries[datasetQueryIds[index]]
      set(data, query.path, queryResult)
    })

    const ids = Object.keys(this._referencedItems)
    if (ids.length > 0) {
      const response = await this.api.fetchByFilter(
        [
          {
            operator: ComparisonQueryOperatorEnum.IN,
            value: Object.keys(this._referencedItems),
            field: 'identifier'
          }
        ],
        this.locale
      )
      ids.forEach((id, index) =>
        this._referencedItems[id].forEach(path => set(data, path, response[index]))
      )
      return data
    }
    return data
  }

  async resolveDatasetQuery(query: RegisteredDatasetQuery): Promise<Dataset[]> {
    return (await this.api.fetchByFilter(
      [
        {
          operator: LogicalQueryOperatorEnum.AND,
          filters: [
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              field: 'schema',
              value: query.schema
            },
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              field: 'entityType',
              value: query.entityType
            },
            ...this.mapDatasetQuery(query)
          ]
        }
      ],
      this.locale,
      false
    )) as Dataset[]
  }
}
