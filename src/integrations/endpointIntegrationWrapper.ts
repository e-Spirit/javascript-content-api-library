import { HttpError } from '../exceptions'
import { FSXARemoteApi } from '../modules'
import {
  FetchByFilterBody,
  FetchElementRouteBody,
  FetchNavigationRouteBody,
  FetchProjectPropertiesBody,
} from '../routes'
import {
  ParamValidationError,
  validateParamsFetchElement,
  validateParamsFetchByFilter,
  validateParamsFetchNavigation,
  validateParamsFetchProjectProperties,
} from './parameterValidation'
import {
  FetchResponse,
  NavigationData,
  NormalizedProjectPropertyResponse,
  ProjectProperties,
} from '../types'
import { LoggerChalked } from '../modules/LoggerChalked'

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

/**
 * Useful Error Messages for Validation Errors.
 * Can be used as an Error Message to send to the client
 */
export const PARAM_VALIDATION_ERROR_TO_MESSAGE: Record<
  ParamValidationError['reason'],
  string
> = {
  MISSING_ID: 'Please Provide an id in the body',
  MISSING_LOCALE:
    'Please specify a locale in the body through: e.g. "locale": "de_DE" ',
  MISSING_PARAM_OBJECT:
    "Please provide required params in the body. required: 'id', 'locale'",
  MISSING_FILTERS: 'Please provide non-empty filters array',
} as const

/**
 * Provides Wrapper Functions fot the given api.
 * @param api FSXAApi to wrap
 * @param loggerName Creates a logger with the given name
 * @returns
 */
export const useEndpointIntegrationWrapper = (
  api: FSXARemoteApi,
  loggerName = 'Endpoint-Utils'
) => {
  const logger = new LoggerChalked(api.logLevel, loggerName)

  /**
   * Fetches an Element by Id via {@link FSXARemoteApi}
   * @param params
   * @param logContext
   * @returns A ResultWrapper, that either indicates success and contains the data, or indicates an Error and a Reason
   */
  const fetchElementWrapper = async (
    params: FetchElementRouteBody,
    logContext: string = '[fetchElement]'
  ): Promise<FetchWrapperResult> => {
    logger.debug(logContext, 'Called')

    try {
      const validationResult = validateParamsFetchElement(params)

      if (!validationResult.valid) {
        return handleValidationError(validationResult, params, logContext)
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
      return handleRuntimeError(error, logContext)
    }
  }

  /**
   * Fetches Navigation via {@link FSXARemoteApi}
   * @param params
   * @param logContext
   * @returns A ResultWrapper, that either indicates success and contains the data, or indicates an Error and a Reason
   */
  const fetchNavigationWrapper = async (
    params: FetchNavigationRouteBody,
    logContext: string = '[fetchNavigation]'
  ): Promise<FetchWrapperResult<NavigationData | null>> => {
    logger.debug(logContext, 'Called')

    try {
      const validationResult = validateParamsFetchNavigation(params)

      if (!validationResult.valid) {
        return handleValidationError(validationResult, params, logContext)
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
      return handleRuntimeError(error, logContext)
    }
  }

  /**
   * Fetches Elements by Filter via {@link FSXARemoteApi}
   * @param params
   * @param logContext
   * @returns A ResultWrapper, that either indicates success and contains the data, or indicates an Error and a Reason
   */
  const fetchByFilterWrapper = async (
    params: FetchByFilterBody,
    logContext: string = '[fetchByFilter]'
  ): Promise<FetchWrapperResult<FetchResponse>> => {
    logger.debug(logContext, 'Called')

    try {
      const validationResult = validateParamsFetchByFilter(params)
      if (!validationResult.valid) {
        return handleValidationError(validationResult, params, logContext)
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
      return handleRuntimeError(error, logContext)
    }
  }

  /**
   * Fetches ProjectProperties via {@link FSXARemoteApi}
   * @param params
   * @param logContext
   * @returns A ResultWrapper, that either indicates success and contains the data, or indicates an Error and a Reason
   */
  const fetchProjectPropertiesWrapper = async (
    params: FetchProjectPropertiesBody,
    logContext: string = '[fetchProjectProperties]'
  ): Promise<
    FetchWrapperResult<
      ProjectProperties | NormalizedProjectPropertyResponse | null
    >
  > => {
    logger.debug(logContext, 'Called')

    try {
      const validationResult = validateParamsFetchProjectProperties(params)
      if (!validationResult.valid) {
        return handleValidationError(validationResult, params, logContext)
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
      return handleRuntimeError(error, logContext)
    }
  }

  const handleValidationError = (
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

  function assertIsError(error: unknown): asserts error is Error {
    // rethrow unknown error if its not an instance of error, since we do not know how to handle that
    if (!(error instanceof Error)) {
      throw error
    }
  }

  const handleRuntimeError = (
    error: unknown,
    logContext: string
  ): FetchWrapperError => {
    assertIsError(error)
    logger.error(logContext, error)

    const errorObj: FetchWrapperError['error'] = {
      statusCode: (error as HttpError).statusCode || 500,
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
