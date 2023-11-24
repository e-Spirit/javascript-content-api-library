import { HttpError } from '../exceptions'
import {
  FetchByFilterBody,
  FetchElementRouteBody,
  FetchNavigationRouteBody,
  FetchProjectPropertiesBody,
} from '../routes'

export type ParamValidationResult<T extends ParamValidationErrorReasons> =
  | ParamValidationSuccess
  | ParamValidationError<T>

export type ParamValidationSuccess = {
  valid: true
}

export type ParamValidationErrorReasons =
  | 'MISSING_PARAM_OBJECT'
  | 'MISSING_LOCALE'
  | 'MISSING_ID'
  | 'MISSING_LOCALE_OR_PATH'

export type ParamValidationError<
  T extends ParamValidationErrorReasons = ParamValidationErrorReasons
> = {
  valid: false
  reason: T
  statusCode: 400
}

export const validateParamsFetchElement = (
  params: Partial<FetchElementRouteBody> | null | undefined
): ParamValidationResult<
  'MISSING_ID' | 'MISSING_LOCALE' | 'MISSING_PARAM_OBJECT'
> => {
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      reason: 'MISSING_PARAM_OBJECT',
      statusCode: 400,
    }
  }

  if (!params.locale) {
    return {
      valid: false,
      reason: 'MISSING_LOCALE',
      statusCode: 400,
    }
  }
  if (!params.id) {
    return {
      valid: false,
      reason: 'MISSING_ID',
      statusCode: 400,
    }
  }

  return {
    valid: true,
  }
}

export const validateParamsFetchNavigation = (
  params: Partial<FetchNavigationRouteBody> | null | undefined
): ParamValidationResult<'MISSING_LOCALE_OR_PATH' | 'MISSING_PARAM_OBJECT'> => {
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      reason: 'MISSING_PARAM_OBJECT',
      statusCode: 400,
    }
  }

  if (!params.locale && !params.initialPath) {
    return {
      valid: false,
      reason: 'MISSING_LOCALE_OR_PATH',
      statusCode: 400,
    }
  }

  return {
    valid: true,
  }
}

export const validateParamsFetchFetchByFilter = (
  params: Partial<FetchByFilterBody> | null | undefined
): ParamValidationResult<'MISSING_PARAM_OBJECT'> => {
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      reason: 'MISSING_PARAM_OBJECT',
      statusCode: 400,
    }
  }

  return {
    valid: true,
  }
}

export const validateParamsFetchProjectProperties = (
  params: Partial<FetchProjectPropertiesBody> | null | undefined
): ParamValidationResult<'MISSING_LOCALE' | 'MISSING_PARAM_OBJECT'> => {
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      reason: 'MISSING_PARAM_OBJECT',
      statusCode: 400,
    }
  }

  if (!params.locale) {
    return {
      valid: false,
      reason: 'MISSING_LOCALE',
      statusCode: 400,
    }
  }

  return {
    valid: true,
  }
}
