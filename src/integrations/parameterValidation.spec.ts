import { ArrayQueryOperatorEnum } from '../modules'
import {
  FetchByFilterParams,
  FetchElementParams,
  FetchNavigationParams,
  FetchProjectPropertiesParams,
} from '../types'
import {
  ParamValidationSuccess,
  validateParamsFetchElement,
  validateParamsFetchByFilter,
  validateParamsFetchNavigation,
  validateParamsFetchProjectProperties,
  createValidationError,
} from './parameterValidation'

const validationSuccess: ParamValidationSuccess = Object.freeze({
  valid: true,
})

describe('Parameter Validation', () => {
  describe('Navigation', () => {
    it('Should expect Params Object', async () => {
      const params: FetchNavigationParams = 'invalid' as any

      let valudationResult = validateParamsFetchNavigation(params)
      expect(valudationResult).toEqual(
        createValidationError('MISSING_PARAM_OBJECT')
      )
    })

    it('Should expect Locale', async () => {
      const params: FetchNavigationParams = {}

      let valudationResult = validateParamsFetchNavigation(params)
      expect(valudationResult).toEqual(createValidationError('MISSING_LOCALE'))
    })
    it('Accepts locale', async () => {
      const params: FetchNavigationParams = {
        locale: 'de_DE',
        initialPath: '/test',
      }

      let valudationResult = validateParamsFetchNavigation(params)
      expect(valudationResult).toEqual(validationSuccess)
    })
    it('Accepts locale and path', async () => {
      const params: FetchNavigationParams = {
        locale: 'de_DE',
        initialPath: 'test',
      }

      let valudationResult = validateParamsFetchNavigation(params)
      expect(valudationResult).toEqual(validationSuccess)
    })
  })
  describe('fetchElement', () => {
    it('Should expect Params Object', async () => {
      const params: FetchElementParams = 'invalid' as any

      let valudationResult = validateParamsFetchElement(params)
      expect(valudationResult).toEqual(
        createValidationError('MISSING_PARAM_OBJECT')
      )
    })

    it('Should expect Locale', async () => {
      const params: Partial<FetchElementParams> = {}

      let valudationResult = validateParamsFetchElement(params)
      expect(valudationResult).toEqual(createValidationError('MISSING_LOCALE'))
    })

    it('Should expect Id', async () => {
      const params: Partial<FetchElementParams> = { locale: 'de_DE' }

      let valudationResult = validateParamsFetchElement(params)
      expect(valudationResult).toEqual(createValidationError('MISSING_ID'))
    })
    it('Accepts locale and id', async () => {
      const params: FetchElementParams = { id: 'Test', locale: 'de_DE' }

      let valudationResult = validateParamsFetchElement(params)
      expect(valudationResult).toEqual(validationSuccess)
    })
  })
  describe('fetchByFilter', () => {
    it('Should expect Params Object', async () => {
      const params: FetchByFilterParams = 'invalid' as any

      let valudationResult = validateParamsFetchByFilter(params)
      expect(valudationResult).toEqual(
        createValidationError('MISSING_PARAM_OBJECT')
      )
    })

    it('Should expect filters', async () => {
      const params: FetchByFilterParams = {} as any

      let valudationResult = validateParamsFetchByFilter(params)
      expect(valudationResult).toEqual(createValidationError('MISSING_FILTERS'))
    })

    it('Accepts filters and other params', async () => {
      const params: FetchByFilterParams = {
        filters: [
          { field: '', operator: ArrayQueryOperatorEnum.ALL, value: [''] },
        ],
        additionalParams: {},
      }

      let valudationResult = validateParamsFetchByFilter(params)
      expect(valudationResult).toEqual(validationSuccess)
    })
  })
  describe('fetchProjectProperties', () => {
    it('Should expect Params Object', async () => {
      const params: FetchProjectPropertiesParams = 'invalid' as any

      let valudationResult = validateParamsFetchProjectProperties(params)
      expect(valudationResult).toEqual(
        createValidationError('MISSING_PARAM_OBJECT')
      )
    })

    it('Should expect Locale', async () => {
      const params: Partial<FetchProjectPropertiesParams> = {}

      let valudationResult = validateParamsFetchProjectProperties(params)
      expect(valudationResult).toEqual(createValidationError('MISSING_LOCALE'))
    })

    it('Accepts locale', async () => {
      const params: FetchProjectPropertiesParams = {
        locale: 'de_DE',
      }

      let valudationResult = validateParamsFetchProjectProperties(params)
      expect(valudationResult).toEqual(validationSuccess)
    })
  })
})
