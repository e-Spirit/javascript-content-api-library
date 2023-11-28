import {
  FetchByFilterParams,
  FetchElementParams,
  FetchNavigationParams,
  FetchProjectPropertiesParams,
} from '../types'

export type ParamValidationResult<T extends ParamValidationErrorReason> =
  | ParamValidationSuccess
  | ParamValidationError<T>

export type ParamValidationSuccess = {
  valid: true
}

export type ParamValidationErrorReason =
  | 'MISSING_PARAM_OBJECT'
  | 'MISSING_LOCALE'
  | 'MISSING_ID'
  | 'MISSING_FILTERS'

export type ParamValidationError<
  T extends ParamValidationErrorReason = ParamValidationErrorReason
> = Readonly<{
  valid: false
  reason: T
  statusCode: 400
}>

export const createValidationError = <T extends ParamValidationErrorReason>(
  reason: T
): ParamValidationError<T> => ({
  valid: false,
  reason,
  statusCode: 400,
})

export const validateParamsFetchElement = (
  params: Partial<FetchElementParams> | null | undefined
): ParamValidationResult<
  'MISSING_ID' | 'MISSING_LOCALE' | 'MISSING_PARAM_OBJECT'
> => {
  if (!params || typeof params !== 'object') {
    return createValidationError('MISSING_PARAM_OBJECT')
  }

  if (!params.locale) {
    return createValidationError('MISSING_LOCALE')
  }

  if (!params.id) {
    return createValidationError('MISSING_ID')
  }

  return {
    valid: true,
  }
}

export const validateParamsFetchNavigation = (
  params: Partial<FetchNavigationParams> | null | undefined
): ParamValidationResult<'MISSING_LOCALE' | 'MISSING_PARAM_OBJECT'> => {
  if (!params || typeof params !== 'object') {
    return createValidationError('MISSING_PARAM_OBJECT')
  }

  if (!params.locale) {
    return createValidationError('MISSING_LOCALE')
  }

  return {
    valid: true,
  }
}

export const validateParamsFetchByFilter = (
  params: Partial<FetchByFilterParams> | null | undefined
): ParamValidationResult<'MISSING_PARAM_OBJECT' | 'MISSING_FILTERS'> => {
  if (!params || typeof params !== 'object') {
    return createValidationError('MISSING_PARAM_OBJECT')
  }

  if (
    !params.filters ||
    !Array.isArray(params.filters)
    //params.filters.length === 0
  ) {
    return createValidationError('MISSING_FILTERS')
  }

  return {
    valid: true,
  }
}

export const validateParamsFetchProjectProperties = (
  params: Partial<FetchProjectPropertiesParams> | null | undefined
): ParamValidationResult<'MISSING_LOCALE' | 'MISSING_PARAM_OBJECT'> => {
  if (!params || typeof params !== 'object') {
    return createValidationError('MISSING_PARAM_OBJECT')
  }

  if (!params.locale) {
    return createValidationError('MISSING_LOCALE')
  }

  return {
    valid: true,
  }
}
