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

/**
 * All Existing Reasons to reject param Validation
 */
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

/**
 * Creates the correct ValidationError for the given reason.
 * @param reason
 * @returns
 */
export const createValidationError = <T extends ParamValidationErrorReason>(
  reason: T
): ParamValidationError<T> => ({
  valid: false,
  reason,
  statusCode: 400,
})

/**
 * Checks for required Parameters
 * @param params
 * @returns result object indicating validity, and a reason if not valid.
 */
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

/**
 * Checks for required Parameters
 * @param params
 * @returns result object indicating validity, and a reason if not valid.
 */
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

/**
 * Checks for required Parameters
 * @param params
 * @returns result object indicating validity, and a reason if not valid.
 */
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

/**
 * Checks for required Parameters
 * @param params
 * @returns result object indicating validity, and a reason if not valid.
 */
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
