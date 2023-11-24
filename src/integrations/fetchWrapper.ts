import { HttpError } from '../exceptions'
import { FSXARemoteApi, Logger } from '../modules'
import {
  FetchByFilterBody,
  FetchElementRouteBody,
  FetchNavigationRouteBody,
  FetchProjectPropertiesBody,
} from '../routes'
import {
  ParamValidationError,
  validateParamsFetchElement,
  validateParamsFetchFetchByFilter,
  validateParamsFetchNavigation,
} from './parameterValidation'
import {
  FetchResponse,
  NavigationData,
  NormalizedProjectPropertyResponse,
  ProjectProperties,
} from '../types'

export type FetchWrapperResult<T = any> =
  | FetchWrapperSuccess<T>
  | FetchWrapperError

type FetchWrapperSuccess<T = any> = {
  success: true
  data: T
}

type FetchWrapperError = {
  success: false
  error: {
    statusCode: number
    message: string
  }
  originalError: Error | ParamValidationError
}

export const PARAM_VALIDATION_ERROR_TO_MESSAGE: Record<
  ParamValidationError['reason'],
  string
> = {
  MISSING_ID:
    'Please specify a locale in the body through: e.g. "locale": "de_DE" ',
  MISSING_LOCALE_OR_PATH:
    'Please specify either a locale (e.g. "de_DE") or an inital Path (e.g. "/home/")',
  MISSING_LOCALE: 'Please Provide an id in the body',
  MISSING_PARAM_OBJECT:
    "Please provide required params in the body. required: 'id', 'locale'",
} as const

export function assertIsError(error: unknown): asserts error is Error {
  // rethrow unknown error if its not an instance of error, since we do not know how to handle that
  if (!(error instanceof Error)) {
    throw error
  }
}

export const useEndpointUtils = (
  api: FSXARemoteApi,
  loggerName = 'Endpoint-Utils'
) => {
  const logger = new Logger(api.logLevel, loggerName)

  const fetchElementWrapper = async (
    params: FetchElementRouteBody,
    logContext: string = '[fetchElement]'
  ): Promise<FetchWrapperResult> => {
    logger.debug(logContext, 'Called')

    try {
      const validationResult = validateParamsFetchElement(params)

      if (!validationResult.valid) {
        return createValidationError(validationResult, params, logContext)
      }

      logger.debug(logContext, 'Params valid, fetching from Api')

      const response = await api.fetchElement({
        id: params.id,
        locale: params.locale,
        additionalParams: params.additionalParams,
        remoteProject: params.remote,
        filterContext: params.filterContext,
        normalized: params.normalized,
      })
      logger.debug(logContext, 'fetch successful')

      return {
        success: true,
        data: response,
      }
    } catch (error: unknown) {
      return createRuntimeError(error, logContext)
    }
  }

  const fetchNavigationWrapper = async (
    params: FetchNavigationRouteBody,
    logContext: string = '[fetchNavigation]'
  ): Promise<FetchWrapperResult<NavigationData | null>> => {
    logger.debug(logContext, 'Called')

    try {
      const validationResult = validateParamsFetchNavigation(params)

      if (!validationResult.valid) {
        return createValidationError(validationResult, params, logContext)
      }
      logger.debug(logContext, 'Params valid, fetching from Api')

      const response = await api.fetchNavigation({
        initialPath: params.initialPath || '/',
        locale: params.locale,
        filterContext: params.filterContext,
      })

      logger.debug(logContext, 'fetch successful')
      return {
        success: true,
        data: response,
      }
    } catch (error: unknown) {
      return createRuntimeError(error, logContext)
    }
  }

  const fetchByFilterWrapper = async (
    params: FetchByFilterBody,
    logContext: string = '[fetchByFilter]'
  ): Promise<FetchWrapperResult<FetchResponse>> => {
    logger.debug(logContext, 'Called')

    try {
      const validationResult = validateParamsFetchFetchByFilter(params)
      if (!validationResult.valid) {
        return createValidationError(validationResult, params, logContext)
      }

      logger.debug(logContext, 'Params valid, fetching from Api')

      const response = await api.fetchByFilter({
        filters: params.filters || [],
        locale: params.locale,
        page: params.page ? params.page : undefined,
        pagesize: params.pagesize ? params.pagesize : undefined,
        sort: params.sort ? params.sort : [],
        additionalParams: params.additionalParams || {},
        remoteProject: params.remote ? params.remote : undefined,
        filterContext: params.filterContext,
        normalized: params?.normalized,
      })
      logger.debug(logContext, 'fetch successful')

      return {
        success: true,
        data: response,
      }
    } catch (error: unknown) {
      return createRuntimeError(error, logContext)
    }
  }

  const fetchProjectPropertiesWrapper = async (
    params: FetchProjectPropertiesBody,
    logContext: string = '[fetchByFilter]'
  ): Promise<
    FetchWrapperResult<
      ProjectProperties | NormalizedProjectPropertyResponse | null
    >
  > => {
    logger.debug(logContext, 'Called')

    try {
      const validationResult = validateParamsFetchFetchByFilter(params)
      if (!validationResult.valid) {
        return createValidationError(validationResult, params, logContext)
      }

      logger.debug(logContext, 'Params valid, fetching from Api')

      const response = await api.fetchProjectProperties({
        locale: params.locale,
        additionalParams: params.additionalParams,
        resolve: params.resolver,
        filterContext: params.filterContext,
        normalized: params.normalized,
      })
      logger.debug(logContext, 'fetch successful')

      return {
        success: true,
        data: response,
      }
    } catch (error: unknown) {
      return createRuntimeError(error, logContext)
    }
  }

  const createValidationError = (
    validationResult: ParamValidationError,
    params: any,
    logContext: string
  ): FetchWrapperError => {
    logger.error(logContext, validationResult.reason, params)
    return {
      success: false,
      error: {
        statusCode: validationResult.statusCode,
        message: PARAM_VALIDATION_ERROR_TO_MESSAGE[validationResult.reason],
      },
      originalError: validationResult,
    }
  }

  const createRuntimeError = (
    error: unknown,
    logContext: string
  ): FetchWrapperError => {
    assertIsError(error)
    logger.error(logContext, error)

    const errorObj: FetchWrapperError['error'] =
      error instanceof HttpError
        ? {
            statusCode: error.statusCode,
            message: error.message,
          }
        : {
            statusCode: 500,
            message: error.message,
          }

    return {
      success: false,
      error: errorObj,
      originalError: error,
    }
  }

  return {
    fetchElementWrapper,
    fetchNavigationWrapper,
    fetchByFilterWrapper,
    fetchProjectPropertiesWrapper,
  }
}
