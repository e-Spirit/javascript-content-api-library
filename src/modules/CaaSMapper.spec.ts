import faker from 'faker'
import { CaaSMapper, CaaSMapperErrors } from './CaaSMapper'
import { FSXARemoteApi } from './FSXARemoteApi'
import { Logger, LogLevel } from './Logger'
import { FSXAContentMode } from '../enums'
import {
  CaaSApi_Body,
  CaaSApi_CMSInputCheckbox,
  CaaSApi_CMSInputCombobox,
  CaaSApi_CMSInputDate,
  CaaSApi_CMSInputDOM,
  CaaSApi_CMSInputDOMTable,
  CaaSApi_CMSInputLink,
  CaaSApi_CMSInputList,
  CaaSApi_CMSInputNumber,
  CaaSApi_CMSInputRadioButton,
  CaaSApi_CMSInputText,
  CaaSApi_CMSInputTextArea,
  CaaSApi_CMSInputToggle,
  CaaSApi_Content2Section,
  CaaSApi_FSCatalog,
  CaaSApi_FSDataset,
  CaaSApi_FSIndex,
  CaaSApi_FSReference,
  CaaSApi_Option,
  CaaSApi_Section,
  CaaSApiMediaPictureResolutions,
  CustomMapper,
  RichTextElement,
  FetchByFilterParams,
  Permission,
} from '../types'
import { parseISO } from 'date-fns'
import { createNumberEntry } from '../testutils/createNumberEntry'
import { createPageRef } from '../testutils/createPageRef'
import { createSection } from '../testutils/createSection'
import {
  createDataEntry,
  createMediaPictureReference,
  mockPermissionActivity,
  mockPermissionGroup,
} from '../testutils/createDataEntry'
import { createProjectProperties } from '../testutils/createProjectProperties'
import { createGCAPage } from '../testutils/createGCAPage'
import { createDataset, createDatasetReference } from '../testutils/createDataset'
import { createMediaPicture } from '../testutils/createMediaPicture'
import { createMediaFile } from '../testutils/createMediaFile'
import { createImageMap } from '../testutils/createImageMap'
import { CaaSApi_CMSInputPermission, CaaSAPI_PermissionGroup, Link, Option, Reference } from '..'
import { createFetchResponse } from '../testutils/createFetchResponse'

jest.mock('./FSXARemoteApi')
jest.mock('date-fns')

describe('CaaSMapper', () => {
  const createPath = () => [faker.random.word(), faker.random.word()]
  const createLogger = () => new Logger(LogLevel.NONE, 'Querybuilder')
  const createApi = () => jest.mocked<FSXARemoteApi>(new (FSXARemoteApi as any)())
  const createMapper = () => new CaaSMapper(createApi(), 'de', {}, createLogger())

  describe('registerReferencedItem', () => {
    it('should register a reference and return the reference key', () => {
      const api = createApi()
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      const refId = faker.random.word()
      const path = createPath()
      const item = mapper.registerReferencedItem(refId, path)

      expect(mapper._referencedItems).toEqual({ [refId]: [path] })
      expect(mapper._remoteReferences).toEqual({})
      expect(item).toEqual(`[REFERENCED-ITEM-${refId}]`)
    })
    it('should accept multiple paths for the same reference id', () => {
      const api = createApi()
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      const refId = faker.random.word()
      const path = createPath()
      const path2 = createPath()

      mapper.registerReferencedItem(refId, path)
      mapper.registerReferencedItem(refId, path2)

      expect(mapper._referencedItems).toEqual({ [refId]: [path, path2] })
    })
    it('should register a remote reference and return its remote reference key', () => {
      const remotes = { remoteId: { id: 'remoteId', locale: 'de' } }
      const api = createApi()
      api.remotes = remotes
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      const refId = faker.random.word()
      const path = createPath()
      const item = mapper.registerReferencedItem(refId, path, 'remoteId')

      expect(mapper._remoteReferences).toEqual({ remoteId: { [refId]: [path] } })
      expect(mapper._referencedItems).toEqual({})
      expect(item).toEqual(`[REFERENCED-REMOTE-ITEM-${refId}]`)
    })
    it('should register a non-remote item if the remote project was not found', () => {
      const api = createApi()
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      const refId = faker.random.word()
      const path = createPath()
      const item = mapper.registerReferencedItem(refId, path, 'remoteId')

      expect(mapper._remoteReferences).toEqual({})
      expect(mapper._referencedItems).toEqual({ [refId]: [path] })
      expect(item).toEqual(`[REFERENCED-ITEM-${refId}]`)
    })
  })

  describe('buildPreviewId', () => {
    it('should return a preview id', () => {
      expect(createMapper().buildPreviewId('some-id')).toEqual('some-id.de')
    })
  })

  describe('buildMediaUrl', () => {
    it('should return the url as-is in release mode', () => {
      const api = createApi()
      api.contentMode = FSXAContentMode.RELEASE
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      const url = 'https://e-spirit.local/some/resource'
      expect(mapper.buildMediaUrl(url)).toEqual(url)
    })
    it('should append the revision as a query param if given in preview mode', () => {
      const api = createApi()
      api.contentMode = FSXAContentMode.PREVIEW
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      const url = 'https://e-spirit.local/some/resource'
      expect(mapper.buildMediaUrl(url)).toEqual(url)
      expect(mapper.buildMediaUrl(url, 5593)).toEqual(`${url}?rev=5593`)
      // check media string construction
      expect(mapper.buildMediaUrl(`${url}?prev`, 5593)).toEqual(`${url}?prev&rev=5593`)
    })
  })

  describe('mapDataEntry', () => {
    it('should execute the custom mapper and return its result if given', async () => {
      const customMapper: CustomMapper = jest
        .fn()
        .mockImplementation(async () => 'test-mapper-result')
      const api = createApi()
      const mapper = new CaaSMapper(api, 'de', { customMapper }, createLogger())
      const entry = createNumberEntry()
      const path = createPath()
      const result = await mapper.mapDataEntry(entry, path)

      expect(customMapper).toHaveBeenCalledWith(entry, path, {
        // test utility forwarding (there is no strict interface for the util object)
        // so we do not use `objectContaining` otherwise the test will be outdated
        // without notice as the inline interface changes
        api,
        xmlParser: mapper.xmlParser,
        registerReferencedItem: expect.any(Function),
        buildPreviewId: expect.any(Function),
        buildMediaUrl: expect.any(Function),
        mapDataEntries: expect.any(Function),
      })
      expect(result).toEqual('test-mapper-result')
    })
    it('should use the internal mapping if the custom mapper did not return anything', async () => {
      const customMapper: CustomMapper = jest.fn().mockImplementation(async () => undefined)
      const api = createApi()
      const mapper = new CaaSMapper(api, 'de', { customMapper }, createLogger())
      const entry = createNumberEntry()
      await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual(entry.value)
      expect(customMapper).toHaveBeenCalled()
    })
    it('should return entries of an unknown fsType as-is', async () => {
      const api = createApi()
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      const entry = createNumberEntry()
      entry.fsType = null!
      await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBe(entry)
    })

    describe('CMS_INPUT_COMBOBOX', () => {
      it('should map entries to a { key: string; value: string; } shape if their value is truthy', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_CMSInputCombobox = {
          name: faker.random.word(),
          value: {
            fsType: 'Option',
            identifier: faker.datatype.uuid(),
            label: faker.random.words(2),
          },
          fsType: 'CMS_INPUT_COMBOBOX',
        }
        const expected: Option = {
          key: entry.value!.identifier,
          value: entry.value!.label,
          type: 'Option',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual(expected)
      })
      it('should map entries to null if their value is falsy', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_CMSInputCombobox = {
          name: faker.random.word(),
          value: null,
          fsType: 'CMS_INPUT_COMBOBOX',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBeNull()
      })
    })

    describe('CMS_INPUT_DOM | CMS_INPUT_DOMTABLE', () => {
      it('should forward dom entries to the xml parser to return a RichTextElement list', async () => {
        const api = createApi()
        const rt: RichTextElement[] = []
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        mapper.xmlParser.parse = jest.fn().mockImplementation(async () => rt)
        const entry: CaaSApi_CMSInputDOM = {
          name: faker.random.word(),
          value: '<here be dragons />',
          fsType: 'CMS_INPUT_DOM',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBe(rt)
        expect(mapper.xmlParser.parse).toHaveBeenCalledWith(entry.value)
      })
      it('should forward dom table entries to the xml parser to return a RichTextElement list', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const rt: RichTextElement[] = []
        mapper.xmlParser.parse = jest.fn().mockImplementation(async () => rt)
        const entry: CaaSApi_CMSInputDOMTable = {
          name: faker.random.word(),
          value: '<here be dragons />',
          fsType: 'CMS_INPUT_DOMTABLE',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBe(rt)
        expect(mapper.xmlParser.parse).toHaveBeenCalledWith(entry.value)
      })
      it('should not call the parser if the dom data is empty and return an empty RichTextElement list', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        mapper.xmlParser.parse = jest.fn()
        const domTableEntry: CaaSApi_CMSInputDOMTable = {
          name: faker.random.word(),
          value: '',
          fsType: 'CMS_INPUT_DOMTABLE',
        }
        await expect(mapper.mapDataEntry(domTableEntry, createPath())).resolves.toEqual([])
        expect(mapper.xmlParser.parse).not.toHaveBeenCalled()
        const domEntry: CaaSApi_CMSInputDOM = {
          name: faker.random.word(),
          value: '',
          fsType: 'CMS_INPUT_DOM',
        }
        await expect(mapper.mapDataEntry(domEntry, createPath())).resolves.toEqual([])
        expect(mapper.xmlParser.parse).not.toHaveBeenCalled()
      })
    })

    describe('CMS_INPUT_NUMBER', () => {
      it('should return the value as-is', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry = createNumberEntry()
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual(entry.value)
      })
    })

    describe('CMS_INPUT_TEXT', () => {
      it('should return the value as-is', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_CMSInputText = {
          name: faker.random.word(),
          value: faker.random.words(5),
          fsType: 'CMS_INPUT_TEXT',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual(entry.value)
      })
    })

    describe('CMS_INPUT_TEXTAREA', () => {
      it('should return the value as-is', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_CMSInputTextArea = {
          name: faker.random.word(),
          value: faker.random.words(5),
          fsType: 'CMS_INPUT_TEXTAREA',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual(entry.value)
      })
    })

    describe('CMS_INPUT_RADIOBUTTON', () => {
      it('should return the value as-is', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_CMSInputRadioButton = {
          name: faker.random.word(),
          value: {
            fsType: 'Option',
            label: faker.random.word(),
            identifier: faker.random.word(),
          },
          fsType: 'CMS_INPUT_RADIOBUTTON',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual(entry.value)
      })
    })

    describe('CMS_INPUT_DATE', () => {
      it('should parse an ISO date if the value is truthy', async () => {
        const now = new Date()
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_CMSInputDate = {
          name: faker.random.word(),
          value: now.toISOString(),
          fsType: 'CMS_INPUT_DATE',
        }
        jest.mocked(parseISO).mockReturnValue(now)
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBe(now)
        expect(parseISO).toHaveBeenCalledWith(entry.value)
      })
      it('should return null and not call the iso date parser if the value is falsy', async () => {
        jest.mocked(parseISO).mockReset()
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_CMSInputDate = {
          name: faker.random.word(),
          value: null,
          fsType: 'CMS_INPUT_DATE',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBeNull()
        expect(parseISO).not.toHaveBeenCalled()
      })
    })

    describe('CMS_INPUT_LINK', () => {
      it('should call mapDataEntries for the formData and metaFormData of the entry', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const path = createPath()
        const numberEntry = createNumberEntry()
        mapper.mapDataEntries = jest.fn().mockImplementation(($) => $)
        const entry: CaaSApi_CMSInputLink = {
          name: faker.random.word(),
          value: {
            template: {
              fsType: 'PageTemplate',
              name: faker.random.word(),
              uid: faker.datatype.uuid(),
              displayName: faker.random.word(),
              identifier: faker.random.word(),
              uidType: faker.random.word(),
            },
            formData: {
              regular: numberEntry,
            },
            metaFormData: {
              meta: numberEntry,
            },
          },
          fsType: 'CMS_INPUT_LINK',
        }

        const expected: Link = {
          template: entry.value.template.uid,
          data: entry.value.formData,
          meta: entry.value.metaFormData,
          type: 'Link',
        }
        await expect(mapper.mapDataEntry(entry, path)).resolves.toEqual(expected)
        expect(mapper.mapDataEntries).toHaveBeenNthCalledWith(1, entry.value.formData, [
          ...path,
          'data',
        ])
        expect(mapper.mapDataEntries).toHaveBeenNthCalledWith(2, entry.value.metaFormData, [
          ...path,
          'meta',
        ])
      })
      it('should return null and not map the linked entries if the value is falsy', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        mapper.mapDataEntries = jest.fn()
        const entry: CaaSApi_CMSInputLink = {
          name: faker.random.word(),
          value: null!,
          fsType: 'CMS_INPUT_LINK',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBeNull()
        expect(mapper.mapDataEntries).not.toHaveBeenCalled()
      })
    })

    describe('CMS_INPUT_LIST', () => {
      it('should return an empty array if the entry value is falsy', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        mapper.mapDataEntries = jest.fn()
        const entry: CaaSApi_CMSInputList = {
          name: faker.random.word(),
          value: null!,
          fsType: 'CMS_INPUT_LIST',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual([])
        expect(mapper.mapDataEntries).not.toHaveBeenCalled()
      })
      it('should map each entry in the list', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        jest.spyOn(mapper, 'mapDataEntry')
        const path = createPath()
        const entry: CaaSApi_CMSInputList = {
          name: faker.random.word(),
          value: [createNumberEntry(4), createNumberEntry(7), createNumberEntry(11)],
          fsType: 'CMS_INPUT_LIST',
        }
        const result = (await mapper.mapDataEntry(entry, path)) as CaaSApi_CMSInputNumber[]
        // our call from the test and three subsequent calls due to the entry list size
        expect(mapper.mapDataEntry).toHaveBeenCalledTimes(4)
        entry.value.forEach(($, index) => {
          expect(mapper.mapDataEntry).toHaveBeenNthCalledWith(
            2 + index, // nth call
            entry.value[index], // child entry
            [...path, index] // path augmentation for the child entry
          )
          // ensure list elements were correctly mapped (depends on CMS_INPUT_NUMBER working)
          expect(result).toContain(entry.value[index].value)
        })
      })
    })

    describe('CMS_INPUT_CHECKBOX', () => {
      it('should return an empty array if the entry value is falsy', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        mapper.mapDataEntries = jest.fn()
        const entry: CaaSApi_CMSInputCheckbox = {
          name: faker.random.word(),
          value: null!,
          fsType: 'CMS_INPUT_CHECKBOX',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual([])
        expect(mapper.mapDataEntries).not.toHaveBeenCalled()
      })
      it('should map each entry in the list', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        jest.spyOn(mapper, 'mapDataEntry')
        const path = createPath()
        const entry: CaaSApi_CMSInputCheckbox = {
          name: faker.random.word(),
          value: [
            { fsType: 'Option', label: 'L1', identifier: 'I1' },
            { fsType: 'Option', label: 'L2', identifier: 'I2' },
            { fsType: 'Option', label: 'L3', identifier: 'I3' },
          ],
          fsType: 'CMS_INPUT_CHECKBOX',
        }
        const result = (await mapper.mapDataEntry(entry, path)) as { key: string; value: string }[]
        // our call from the test and three subsequent calls due to the entry list size
        expect(mapper.mapDataEntry).toHaveBeenCalledTimes(4)
        entry.value.forEach(($, index) => {
          expect(mapper.mapDataEntry).toHaveBeenNthCalledWith(
            2 + index, // nth call
            entry.value[index], // child entry
            [...path, index] // path augmentation for the Option
          )
          // ensure Options were correctly mapped (depends on Option working)
          expect(result.find(($) => $.key === entry.value[index].identifier)).toBeDefined()
        })
      })
    })

    describe('CMS_INPUT_IMAGEMAP', () => {
      it('should not modify the resolution', async () => {
        const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
        const entry = createImageMap()
        Object.freeze(entry.value.resolution)
        await mapper.mapDataEntry(entry, createPath())
      })
      it("should call mapDataEntries for each area's formData", async () => {
        const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
        const path = createPath()
        jest.spyOn(mapper, 'mapDataEntries')
        const entry = createImageMap()
        await mapper.mapDataEntry(entry, path)
        entry.value.areas.forEach((area, index) => {
          if (area.link) {
            expect(mapper.mapDataEntries).toHaveBeenCalledWith(area.link.formData, [
              ...path,
              'areas',
              index,
              'link',
              'data',
            ])
          }
        })
      })
      it('should work with nested formData image maps', async () => {
        const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
        const path = createPath()
        jest.spyOn(mapper, 'mapDataEntry')
        const entry = createImageMap()
        const childEntry = createImageMap()
        entry.value.areas[0].link!.formData = { childEntry }
        await mapper.mapDataEntry(entry, path)
        expect(mapper.mapDataEntry).toHaveBeenCalledWith(childEntry, [
          ...path,
          'areas',
          0,
          'link',
          'data',
          'childEntry',
        ])
      })
    })

    describe('FS_DATASET', () => {
      it('should return null if the entry value is falsy', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        mapper.mapDataEntries = jest.fn()
        mapper.registerReferencedItem = jest.fn()
        const entry: CaaSApi_FSDataset = {
          name: faker.random.word(),
          value: null!,
          fsType: 'FS_DATASET',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBeNull()
        expect(mapper.mapDataEntries).not.toHaveBeenCalled()
        expect(mapper.registerReferencedItem).not.toHaveBeenCalled()
      })
      it('should behave like a CMS_INPUT_LIST if the entry is an array', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        jest.spyOn(mapper, 'mapDataEntry')
        const path = createPath()
        const entry: CaaSApi_FSDataset = {
          name: faker.random.word(),
          value: [createNumberEntry(4), createNumberEntry(7), createNumberEntry(11)],
          fsType: 'FS_DATASET',
        }
        const entryValue = entry.value as CaaSApi_CMSInputNumber[]
        const result = (await mapper.mapDataEntry(entry, path)) as CaaSApi_CMSInputNumber[]
        // our call from the test and three subsequent calls due to the entry list size
        expect(mapper.mapDataEntry).toHaveBeenCalledTimes(4)
        entryValue.forEach(($, index) => {
          expect(mapper.mapDataEntry).toHaveBeenNthCalledWith(
            2 + index, // nth call
            entryValue[index], // child entry
            [...path, index] // path augmentation for the child entry
          )
          // ensure list elements were correctly mapped (depends on CMS_INPUT_NUMBER working)
          expect(result).toContain(entryValue[index].value)
        })
      })
      it('should register a reference if the entry has a DatasetReference', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        mapper.registerReferencedItem = jest.fn().mockReturnValue('[REF]')
        const entry = createDatasetReference()
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual('[REF]')
        expect(mapper.registerReferencedItem).toHaveBeenCalled()
      })
      it('should return null if the entry is corrupted', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        mapper.mapDataEntries = jest.fn()
        mapper.registerReferencedItem = jest.fn()
        const entry: CaaSApi_FSDataset = {
          name: faker.random.word(),
          value: { fsType: null } as any,
          fsType: 'FS_DATASET',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBeNull()
        expect(mapper.mapDataEntries).not.toHaveBeenCalled()
        expect(mapper.registerReferencedItem).not.toHaveBeenCalled()
      })
    })

    describe('CMS_INPUT_TOGGLE', () => {
      it('should return the toggle value', async () => {
        // ^ as per the interface should probably be a general Boolean cast?
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_CMSInputToggle = {
          name: faker.random.word(),
          value: true,
          fsType: 'CMS_INPUT_TOGGLE',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBe(true)
        entry.value = false
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBe(false)
        entry.value = null
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBe(false)
      })
      it('should return the entry value if the entry value is truthy', async () => {
        // this test is probably useless, or rather its premiss is incorrect
        // but the code this test was derived from allows passing through any truthy value even
        // though the interface forbids it
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_CMSInputToggle = {
          name: faker.random.word(),
          value: 'hey!' as unknown as boolean,
          fsType: 'CMS_INPUT_TOGGLE',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual(entry.value)
      })
    })

    describe('FS_CATALOG', () => {
      it('should map section or link templates to sections', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        mapper.mapSection = jest.fn().mockImplementation(async ($) => ({ uuid: $.uuid }))
        const path = createPath()
        const entry: CaaSApi_FSCatalog = {
          name: faker.random.word(),
          value: [
            {
              fsType: 'Card',
              identifier: faker.datatype.uuid(),
              formData: {},
              uuid: faker.datatype.uuid(),
              template: {
                fsType: 'SectionTemplate',
                name: 'some-section',
                uid: faker.datatype.uuid(),
                uidType: 'some-uid-type',
                identifier: faker.datatype.uuid(),
                displayName: faker.random.word(),
              },
            },
            {
              fsType: 'Card',
              identifier: faker.datatype.uuid(),
              formData: {},
              uuid: faker.datatype.uuid(),
              template: {
                fsType: 'LinkTemplate',
                name: 'some-link',
                uid: faker.datatype.uuid(),
                uidType: 'some-uid-type',
                identifier: faker.datatype.uuid(),
                displayName: faker.random.word(),
              },
            },
          ],
          fsType: 'FS_CATALOG',
        }
        await expect(mapper.mapDataEntry(entry, path)).resolves.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ uuid: entry.value![0].uuid }),
            expect.objectContaining({ uuid: entry.value![1].uuid }),
          ])
        )
        expect(mapper.mapSection).toHaveBeenCalledTimes(2)
        expect(mapper.mapSection).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            fsType: 'Section',
            uuid: entry.value![0].uuid,
            name: entry.value![0].template.name,
            displayName: entry.value![0].template.displayName,
          }),
          [...path, 0]
        )
        expect(mapper.mapSection).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            fsType: 'Section',
            uuid: entry.value![1].uuid,
            name: entry.value![1].template.name,
            displayName: entry.value![1].template.displayName,
          }),
          [...path, 1]
        )
      })
      it('should map page templates', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        jest.spyOn(mapper, 'mapDataEntries')
        mapper.buildPreviewId = jest.fn().mockReturnValue('preview')
        const path = createPath()
        const entry: CaaSApi_FSCatalog = {
          name: faker.random.word(),
          value: [
            {
              fsType: 'Card',
              identifier: faker.datatype.uuid(),
              formData: {
                num: createNumberEntry(),
              },
              uuid: faker.datatype.uuid(),
              template: {
                fsType: 'PageTemplate',
                name: 'some-section',
                uid: faker.datatype.uuid(),
                uidType: 'some-uid-type',
                identifier: faker.datatype.uuid(),
                displayName: faker.random.word(),
              },
            },
          ],
          fsType: 'FS_CATALOG',
        }
        const entryValue = entry.value![0]
        await expect(mapper.mapDataEntry(entry, path)).resolves.toEqual([
          expect.objectContaining({
            id: entryValue.identifier,
            previewId: 'preview',
            template: entryValue.template.uid,
            data: { num: (entryValue.formData.num as CaaSApi_CMSInputNumber).value },
          }),
        ])
        expect(mapper.buildPreviewId).toHaveBeenCalledWith(entryValue.identifier)
        expect(mapper.mapDataEntries).toHaveBeenCalledWith(entryValue.formData, [
          ...path,
          0,
          'data',
        ])
      })
      it('should return other template types as-is', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_FSCatalog = {
          name: faker.random.word(),
          value: [
            {
              fsType: 'Card',
              identifier: faker.datatype.uuid(),
              formData: {
                num: createNumberEntry(),
              },
              uuid: faker.datatype.uuid(),
              template: { fsType: '???' } as any,
            },
          ],
          fsType: 'FS_CATALOG',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toEqual([entry.value![0]])
      })
    })

    describe('FS_REFERENCE', () => {
      it('should return null if the entry value is falsy', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_FSReference = {
          name: faker.random.word(),
          value: null!,
          fsType: 'FS_REFERENCE',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBeNull()
      })
      it('should register a reference on Media entries', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        mapper.registerReferencedItem = jest.fn().mockReturnValue('[REF]')
        const path = createPath()
        const entry: CaaSApi_FSReference = {
          name: faker.random.word(),
          value: {
            fsType: 'Media',
            name: faker.random.word(),
            identifier: faker.datatype.uuid(),
            uid: faker.random.word(),
            uidType: 'MEDIASTORE_LEAF',
            url: faker.random.word(),
            mediaType: 'PICTURE',
            remoteProject: 'remote-project',
          },
          fsType: 'FS_REFERENCE',
        }
        await expect(mapper.mapDataEntry(entry, path)).resolves.toEqual('[REF]')
        expect(mapper.registerReferencedItem).toHaveBeenCalledWith(
          entry.value!.identifier,
          path,
          entry.value!.remoteProject
        )
      })
      it('should handle PageRef & GCAPage separately', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const path = createPath()

        const entry: CaaSApi_FSReference = {
          name: faker.random.word(),
          value: {
            fsType: 'PageRef',
            name: faker.random.word(),
            identifier: faker.datatype.uuid(),
            uid: faker.random.word(),
            uidType: 'SITESTORE_LEAF',
            url: faker.random.word(),
            remoteProject: 'remote-project',
          },
          fsType: 'FS_REFERENCE',
        }

        const expectedPageRef: Reference = {
          referenceId: entry.value!.identifier,
          referenceType: entry.value!.fsType,
          type: 'Reference',
        }

        await expect(mapper.mapDataEntry(entry, path)).resolves.toEqual(expectedPageRef)
        entry.value!.fsType = 'GCAPage'
        entry.value!.uidType = 'GLOBALSTORE'
        entry.value!.url = ''
        const expectedGCARef: Reference = {
          referenceId: entry.value!.identifier,
          referenceType: entry.value!.fsType,
          type: 'Reference',
        }
        await expect(mapper.mapDataEntry(entry, path)).resolves.toEqual(expectedGCARef)
      })
      it('should return corrupted entries as-is', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_FSReference = {
          name: faker.random.word(),
          value: { fsType: 'magic!' } as any,
          fsType: 'FS_REFERENCE',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBe(entry)
      })
    })

    describe('FS_INDEX', () => {
      it('should register and return all references to records with an existing target when using the DAP', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const path = createPath()
        mapper.registerReferencedItem = jest.fn().mockImplementation(($) => `REF-${$}`)
        const entry: CaaSApi_FSIndex = {
          name: faker.random.word(),
          dapType: 'DatasetDataAccessPlugin',
          value: [
            {
              value: { target: { identifier: 'target-id' } },
              fsType: 'Record',
              identifier: 'record-id',
            },
            {
              value: { target: { identifier: null } },
              fsType: 'Record',
              identifier: 'record-without-target-id',
            },
          ],
          fsType: 'FS_INDEX',
        }
        await expect(mapper.mapDataEntry(entry, path)).resolves.toEqual(['REF-target-id'])
        expect(mapper.registerReferencedItem).toHaveBeenCalledTimes(1)
        expect(mapper.registerReferencedItem).toHaveBeenCalledWith('target-id', [...path, 0])
      })
      it("should return entries which are not of dapType 'DatasetDataAccessPlugin' as-is", async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_FSIndex = {
          name: faker.random.word(),
          dapType: faker.random.alphaNumeric(8),
          value: [],
          fsType: 'FS_INDEX',
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toBe(entry)
      })
    })

    describe('Option', () => {
      it('should map an entry to the Option interface', async () => {
        const api = createApi()
        const mapper = new CaaSMapper(api, 'de', {}, createLogger())
        const entry: CaaSApi_Option = {
          fsType: 'Option',
          label: faker.random.word(),
          identifier: faker.datatype.uuid(),
        }
        await expect(mapper.mapDataEntry(entry, createPath())).resolves.toMatchObject({
          key: entry.identifier,
          value: entry.label,
        })
      })
    })

    describe('CMS_INPUT_PERMISSION', () => {
      it('should map each group in all acitivies', async () => {
        const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
        jest.spyOn(mapper, '_mapPermissionGroup')
        const path = createPath()
        const groups = [
          mockPermissionGroup(),
          mockPermissionGroup(),
          mockPermissionGroup(),
          mockPermissionGroup(),
        ]
        const entry: CaaSApi_CMSInputPermission = {
          fsType: 'CMS_INPUT_PERMISSION',
          name: faker.random.word(),
          // adding 2 activies, each with 2 groups
          value: [
            mockPermissionActivity([groups[0]], [groups[1]]),
            mockPermissionActivity([groups[2]], [groups[3]]),
          ],
        }
        const result = (await mapper.mapDataEntry(entry, path)) as Permission
        // no easy type checking here so we check groupId as it's unique to the mapped type
        result.value.forEach((activity) => {
          ;[...activity.allowed, ...activity.forbidden].forEach((group) =>
            expect(group.groupId).toBeDefined()
          )
        })
        // expecting 4 calls due to 4 total groups contained in permission entry
        expect(mapper._mapPermissionGroup).toHaveBeenCalledTimes(4)
        entry.value.forEach((activity, index) => {
          expect(mapper._mapPermissionGroup).toHaveBeenNthCalledWith(
            index + 1, // nth call
            groups[index] // child entry
          )
        })
      })
    })
  })

  describe('_mapPermissionGroup', () => {
    it('should add groupId attribute based on last element of groupPath', () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const group = {
        groupName: 'mygroup-name',
        groupPath: '/GroupsFile/mygroup',
      } as CaaSAPI_PermissionGroup
      const result = mapper._mapPermissionGroup(group)
      expect(result.groupId).toBe('mygroup')
    })
    it('should reuse values of existing attributes', () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const group = {
        groupName: 'mygroup-name',
        groupPath: '/GroupsFile/mygroup',
      } as CaaSAPI_PermissionGroup
      const result = mapper._mapPermissionGroup(group)
      expect(result.groupName).toBe('mygroup-name')
      expect(result.groupPath).toBe('/GroupsFile/mygroup')
    })
  })

  describe('mapDataEntries', () => {
    const createEntries = (): Record<string, CaaSApi_CMSInputNumber> =>
      Object.freeze({
        v1: createNumberEntry(),
        v2: createNumberEntry(),
        v3: createNumberEntry(),
      })

    it('should call mapDataEntry for each key in the `entries` dictionary', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const entries = createEntries()
      mapper.mapDataEntry = jest.fn()
      const path = createPath()
      await mapper.mapDataEntries(entries, path)
      expect(mapper.mapDataEntry).toHaveBeenNthCalledWith(1, entries.v1, [...path, 'v1'])
      expect(mapper.mapDataEntry).toHaveBeenNthCalledWith(2, entries.v2, [...path, 'v2'])
      expect(mapper.mapDataEntry).toHaveBeenNthCalledWith(3, entries.v3, [...path, 'v3'])
    })
    it('should return a new dictionary containing the mapped result', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const entries = createEntries()
      mapper.mapDataEntry = jest.fn().mockImplementation(($: CaaSApi_CMSInputNumber) => $.value)
      const path = createPath()
      await expect(mapper.mapDataEntries(entries, path)).resolves.toEqual({
        v1: entries.v1.value,
        v2: entries.v2.value,
        v3: entries.v3.value,
      })
    })
    it('should handle empty dictionaries', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      await expect(mapper.mapDataEntries({}, createPath())).resolves.toEqual({})
      await expect(mapper.mapDataEntries(null!, createPath())).resolves.toEqual({})
    })
  })

  describe('mapSection', () => {
    it('should call mapDataEntries to map formData embedded into the section', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const section: CaaSApi_Section = createSection()
      const path = createPath()
      jest.spyOn(mapper, 'mapDataEntries')
      await expect(mapper.mapSection(section, path)).resolves.toEqual({
        id: section.identifier,
        type: 'Section',
        sectionType: section.template.uid,
        previewId: expect.any(String),
        data: {
          v1: (section.formData.v1 as CaaSApi_CMSInputNumber).value,
          v2: (section.formData.v2 as CaaSApi_CMSInputNumber).value,
        },
        children: [],
      })
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(section.formData, [...path, 'data'])
    })
  })

  describe('mapBodyContent', () => {
    it('should call and return the value of mapContent2Section on fsType `Content2Section`', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const content = { fsType: 'Content2Section' } as unknown as CaaSApi_Content2Section
      mapper.mapContent2Section = jest.fn().mockResolvedValue(content)
      await expect(mapper.mapBodyContent(content, path)).resolves.toBe(content)
      expect(mapper.mapContent2Section).toHaveBeenCalledWith(content)
    })
    it('should call and return the value of mapSection on fsType `Section` and `SectionReference`', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const section = { fsType: 'Section' } as unknown as CaaSApi_Content2Section
      const sectionRef = { fsType: 'SectionReference' } as unknown as CaaSApi_Content2Section
      mapper.mapSection = jest.fn().mockResolvedValue(section)
      await expect(mapper.mapBodyContent(section, path)).resolves.toBe(section)
      expect(mapper.mapSection).toHaveBeenCalledWith(section, path)
      mapper.mapSection = jest.fn().mockResolvedValue(sectionRef)
      await expect(mapper.mapBodyContent(sectionRef, path)).resolves.toBe(sectionRef)
      expect(mapper.mapSection).toHaveBeenCalledWith(sectionRef, path)
    })
    it('should throw on unexpected fsTypes', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const content = { fsType: 'magic!' } as unknown as CaaSApi_Content2Section
      const promise = mapper.mapBodyContent(content, createPath())
      await expect(promise).rejects.toThrow(CaaSMapperErrors.UNKNOWN_BODY_CONTENT)
    })
  })

  describe('mapPageBody', () => {
    it('should call and return the result of mapBodyContent for all children', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const body: CaaSApi_Body = {
        fsType: 'Body',
        name: faker.random.word(),
        identifier: faker.datatype.uuid(),
        children: [1, 2, 3] as any,
      }
      mapper.mapBodyContent = jest.fn().mockImplementation(async ($) => `mapped-${$}`)
      await expect(mapper.mapPageBody(body, path)).resolves.toEqual(
        expect.objectContaining({ children: ['mapped-1', 'mapped-2', 'mapped-3'] })
      )
      expect(mapper.mapBodyContent).toHaveBeenNthCalledWith(1, 1, [...path, 'children', 0])
      expect(mapper.mapBodyContent).toHaveBeenNthCalledWith(2, 2, [...path, 'children', 1])
      expect(mapper.mapBodyContent).toHaveBeenNthCalledWith(3, 3, [...path, 'children', 2])
    })
  })

  describe('mapPageRef', () => {
    it('should call mapPageBody for all children', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const pageRef = createPageRef()
      const body1: CaaSApi_Body = { ...createDataEntry(), fsType: 'Body', children: [] }
      const body2: CaaSApi_Body = { ...createDataEntry(), fsType: 'Body', children: [] }
      pageRef.page.children.push(body1, body2)
      mapper.mapPageBody = jest.fn().mockImplementation(async ($) => `mapped-${$.uid}`)
      await mapper.mapPageRef(pageRef, path)
      expect(mapper.mapPageBody).toHaveBeenCalledWith(body1, [...path, 'children', 0])
      expect(mapper.mapPageBody).toHaveBeenCalledWith(body2, [...path, 'children', 1])
    })
    it('should call mapDataEntries for formData and metaFormData', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const pageRef = createPageRef()
      const { formData, metaFormData } = pageRef.page
      jest.spyOn(mapper, 'mapDataEntries')
      formData.num1 = createNumberEntry(1)
      formData.num2 = createNumberEntry(2)
      metaFormData.num1 = createNumberEntry(4)
      metaFormData.num2 = createNumberEntry(8)
      await mapper.mapPageRef(pageRef, path)
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(formData, [...path, 'data'])
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(metaFormData, [...path, 'meta'])
    })
    it('should call mapDataEntries for PageRef FormData', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const pageRef = createPageRef()
      jest.spyOn(mapper, 'mapDataEntries')
      delete pageRef.metaFormData
      // w/o metadata
      await mapper.mapPageRef(pageRef, path)
      expect(mapper.mapDataEntries).not.toHaveBeenCalledWith(pageRef.metaFormData, [
        ...path,
        'metaPageRef',
      ])
      // w/ metadata
      pageRef.metaFormData = {
        ...(pageRef.metaFormData ?? {}),
        num1: createNumberEntry(4),
        num2: createNumberEntry(8),
      }
      await mapper.mapPageRef(pageRef, path)
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(pageRef.metaFormData, [
        ...path,
        'metaPageRef',
      ])
    })
  })

  describe('mapProjectProperties', () => {
    it('should call mapDataEntries to map formData and metaFormData', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const projectProps = createProjectProperties()
      const { formData, metaFormData } = projectProps
      jest.spyOn(mapper, 'mapDataEntries')
      await mapper.mapProjectProperties(projectProps, path)
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(formData, [...path, 'data'])
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(metaFormData, [...path, 'meta'])
    })
  })

  describe('mapGCAPage', () => {
    it('should call mapDataEntries to map formData and metaFormData', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const gcaPage = createGCAPage()
      const { formData, metaFormData } = gcaPage
      jest.spyOn(mapper, 'mapDataEntries')
      await mapper.mapGCAPage(gcaPage, path)
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(formData, [...path, 'data'])
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(metaFormData, [...path, 'meta'])
    })
    it('should call mapPageBody for all children', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const gcaPage = createGCAPage()
      const body1: CaaSApi_Body = { ...createDataEntry(), fsType: 'Body', children: [] }
      const body2: CaaSApi_Body = { ...createDataEntry(), fsType: 'Body', children: [] }
      gcaPage.children.push(body1, body2)
      mapper.mapPageBody = jest.fn().mockImplementation(async ($) => `mapped-${$.uid}`)
      await mapper.mapGCAPage(gcaPage, path)
      expect(mapper.mapPageBody).toHaveBeenCalledWith(body1, [...path, 'children', 0])
      expect(mapper.mapPageBody).toHaveBeenCalledWith(body2, [...path, 'children', 1])
    })
  })

  describe('mapDataset', () => {
    it('should call mapDataEntries to map formData', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const dataset = createDataset()
      const { formData } = dataset
      jest.spyOn(mapper, 'mapDataEntries')
      await mapper.mapDataset(dataset, path)
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(formData, [...path, 'data'])
    })
  })

  describe('mapMediaPicture', () => {
    it('should call mapDataEntries to map metaFormData', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const media = createMediaPicture()
      const { metaFormData } = media
      jest.spyOn(mapper, 'mapDataEntries')
      await mapper.mapMediaPicture(media, path)
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(metaFormData, [...path, 'meta'])
    })
  })

  describe('mapMediaResolutionsUrl', () => {
    it('should call buildMediaUrl for each resolution', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const resolutions: CaaSApiMediaPictureResolutions = {
        sd: {
          fileSize: 1000,
          url: 'sd-url',
          height: 200,
          width: 200,
          extension: 'jpg',
          mimeType: 'mime',
        },
        hd: {
          fileSize: 2000,
          url: 'hd-url',
          height: 400,
          width: 400,
          extension: 'jpg',
          mimeType: 'mime',
        },
      }
      jest.spyOn(mapper, 'buildMediaUrl')
      await mapper.mapMediaPictureResolutionUrls(resolutions, 100)
      expect(mapper.buildMediaUrl).toHaveBeenCalledWith(resolutions.sd.url, 100)
      expect(mapper.buildMediaUrl).toHaveBeenCalledWith(resolutions.hd.url, 100)
    })
  })

  describe('mapMediaFile', () => {
    it('should call mapDataEntries to map metaFormData', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const mediaFile = createMediaFile()
      const { metaFormData } = mediaFile
      jest.spyOn(mapper, 'mapDataEntries')
      await mapper.mapMediaFile(mediaFile, path)
      expect(mapper.mapDataEntries).toHaveBeenCalledWith(metaFormData, [...path, 'meta'])
    })
  })

  describe('mapMedia', () => {
    it('should call mapMediaPicture on PICTURE media types', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const mediaFile = createMediaFile()
      jest.spyOn(mapper, 'mapMediaFile')
      await mapper.mapMedia(mediaFile, path)
      expect(mapper.mapMediaFile).toHaveBeenCalledWith(mediaFile, path)
    })
    it('should call mapMediaFile on PICTURE media types', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const path = createPath()
      const mediaPicture = createMediaPicture()
      jest.spyOn(mapper, 'mapMediaPicture')
      await mapper.mapMedia(mediaPicture, path)
      expect(mapper.mapMediaPicture).toHaveBeenCalledWith(mediaPicture, path)
    })
  })

  describe('mapElementResponse', () => {
    it('should call mapDataset on dataset elements', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const element = createDataset()
      jest.spyOn(mapper, 'resolveAllReferences')
      jest.spyOn(mapper, 'mapDataset')
      await mapper.mapElementResponse(element)
      expect(mapper.mapDataset).toHaveBeenCalledWith(element, [])
      expect(mapper.resolveAllReferences).toHaveBeenCalled()
      expect(mapper.parentIdentifiers).toEqual([element.identifier])
    })
    it('should call mapPageRef on pageRef elements', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const element = createPageRef()
      jest.spyOn(mapper, 'resolveAllReferences')
      jest.spyOn(mapper, 'mapPageRef')
      await mapper.mapElementResponse(element)
      expect(mapper.mapPageRef).toHaveBeenCalledWith(element, [])
      expect(mapper.resolveAllReferences).toHaveBeenCalled()
      expect(mapper.parentIdentifiers).toEqual([element.identifier])
    })
    it('should call mapMedia on media elements', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const element = createMediaFile()
      jest.spyOn(mapper, 'resolveAllReferences')
      jest.spyOn(mapper, 'mapMedia')
      await mapper.mapElementResponse(element)
      expect(mapper.mapMedia).toHaveBeenCalledWith(element, [])
      expect(mapper.resolveAllReferences).toHaveBeenCalled()
    })
    it('should call mapGCAPage on dataset elements', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      const element = createGCAPage()
      jest.spyOn(mapper, 'resolveAllReferences')
      jest.spyOn(mapper, 'mapGCAPage')
      await mapper.mapElementResponse(element)
      expect(mapper.mapGCAPage).toHaveBeenCalledWith(element, [])
      expect(mapper.resolveAllReferences).toHaveBeenCalled()
      expect(mapper.parentIdentifiers).toEqual([element.identifier])
    })
    it('should return unknown elements as-is', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      jest.spyOn(mapper, 'resolveAllReferences')
      const element = createDataset()
      ;(element.fsType as string) = 'unknown-element'
      await expect(mapper.mapElementResponse(element)).resolves.toBe(element)
      expect(mapper.resolveAllReferences).not.toHaveBeenCalled()
      expect(mapper.parentIdentifiers).toEqual([element.identifier])
    })
  })

  describe('resolveAllReferences', () => {
    it('should call resolveReferencesPerProject for the current project', async () => {
      const mapper = new CaaSMapper(createApi(), 'de', {}, createLogger())
      mapper.resolveReferencesPerProject = jest.fn()
      const data = {}
      await mapper.resolveAllReferences(data)
      expect(mapper.resolveReferencesPerProject).toHaveBeenCalledWith(data, undefined, undefined)
    })
    it('should call resolveReferencesPerProject for all remote projects', async () => {
      const api = createApi()
      api.remotes = {
        'remote-id1': { id: 'remote-id1', locale: 'de' },
        'remote-id2': { id: 'remote-id2', locale: 'de' },
        'remote-id3': { id: 'remote-id3', locale: 'de' },
      }
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      mapper.resolveReferencesPerProject = jest.fn()
      mapper.registerReferencedItem('id1', [], 'remote-id1')
      mapper.registerReferencedItem('id2', [], 'remote-id2')
      mapper.registerReferencedItem('id3', [], 'remote-id3')
      const data = {}
      await mapper.resolveAllReferences(data)
      expect(mapper.resolveReferencesPerProject).toHaveBeenCalledWith(data, 'remote-id1', undefined)
      expect(mapper.resolveReferencesPerProject).toHaveBeenCalledWith(data, 'remote-id2', undefined)
      expect(mapper.resolveReferencesPerProject).toHaveBeenCalledWith(data, 'remote-id3', undefined)
    })
    it('should return the given data', async () => {
      const api = createApi()
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      const data = {}
      await expect(mapper.resolveAllReferences(data)).resolves.toBe(data)
    })
    it('should not resolve parent references', async () => {
      const api = createApi()
      const mapper = new CaaSMapper(api, 'de', { parentIdentifiers: ['parent-id'] }, createLogger())

      const parentDatasetRef = createDatasetReference('parent-id')
      const anotherDatasetRef = createDatasetReference('another-id')
      const anotherDataset = await mapper.mapDataset(createDataset('another-id'))

      api.fetchByFilter = jest
        .fn()
        .mockImplementation(async () => createFetchResponse([anotherDataset]))

      const pageRef = createPageRef()
      pageRef.page.formData = {
        parent: parentDatasetRef,
        another: anotherDatasetRef,
      }

      const page = await mapper.mapPageRef(pageRef)
      const result = await mapper.resolveAllReferences(page)

      expect(result.data.another).toHaveProperty('entityType')

      // this needs to fail with TNG-1169
      expect(result.data.parent).toEqual('[REFERENCED-ITEM-parent-id]')
    })
  })

  describe('resolveReferencesPerProject', () => {
    it('should fetch references from the api', async () => {
      const api = createApi()
      api.fetchByFilter = jest.fn().mockImplementation(async () => [])
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      mapper.registerReferencedItem('id1', ['root', 'id1'])
      mapper.registerReferencedItem('id2', ['root', 'id2'])
      const data = {}
      await mapper.resolveReferencesPerProject(data)
      expect(api.fetchByFilter).toHaveBeenCalled()
    })
    it('should not fetch parent references', async () => {
      const api = createApi()
      api.fetchByFilter = jest.fn().mockImplementation(async () => [])
      const mapper = new CaaSMapper(api, 'de', { parentIdentifiers: ['parent-id'] }, createLogger())
      mapper.registerReferencedItem('another-id', ['root', 'another-id'])
      mapper.registerReferencedItem('parent-id', ['root', 'parent-id'])
      const data = {}
      await mapper.resolveReferencesPerProject(data)
      expect(api.fetchByFilter.mock.calls.length).toBe(1)
      expect(api.fetchByFilter.mock.calls[0][0].parentIdentifiers).toEqual(['parent-id'])
      expect(api.fetchByFilter.mock.calls[0][0].filters).toEqual([
        { operator: '$in', value: ['another-id'], field: 'identifier' },
      ])
    })
    it('should resolve remote media references', async () => {
      const api = createApi()
      api.remotes = { 'remote-id1': { id: 'remote-id1', locale: 'de' } }
      const mapper = new CaaSMapper(api, 'de', {}, createLogger())
      const mediaPictures = await Promise.all([
        mapper.mapMediaPicture(createMediaPicture('id1')),
        mapper.mapMediaPicture(createMediaPicture('id2')),
        mapper.mapMediaPicture(createMediaPicture('id3')),
        mapper.mapMediaPicture(createMediaPicture('id4')),
        mapper.mapMediaPicture(createMediaPicture('id5')),
      ])
      api.fetchByFilter = jest
        .fn()
        .mockImplementation(
          async ({
            filters,
            locale,
            page,
            pagesize,
            additionalParams,
            remoteProject,
            fetchOptions,
          }: FetchByFilterParams) => {
            // Unfortunately jest doesn't support mocking a func call with specific parmaters
            if (remoteProject !== 'remote-id1') return createFetchResponse([])
            if (locale !== 'de') return createFetchResponse([])
            return createFetchResponse(mediaPictures)
          }
        )
      const pageRef = createPageRef()
      pageRef.page.formData = {
        media1: createMediaPictureReference('id1', 'remote-id1'),
        media2: createMediaPictureReference('id2', 'remote-id1'),
        media3: createMediaPictureReference('id3', 'remote-id1'),
      }
      pageRef.page.metaFormData = {
        ...pageRef.page.metaFormData,
        media4: createMediaPictureReference('id4', 'remote-id1'),
      }
      pageRef.metaFormData = {
        ...pageRef.metaFormData,
        media5: createMediaPictureReference('id5', 'remote-id1'),
      }
      // Mapping also implicitly registers referenced items in mapper instance
      const page = await mapper.mapPageRef(pageRef)

      const result = await mapper.resolveReferencesPerProject(page, 'remote-id1')

      expect(result.data).toBeDefined()
      expect(result.data).toStrictEqual({
        media1: mediaPictures[0],
        media2: mediaPictures[1],
        media3: mediaPictures[2],
      })
      expect(result.meta).toStrictEqual({ media4: mediaPictures[3] })
      expect(result.metaPageRef).toStrictEqual({ media5: mediaPictures[4] })
    })
  })
})
