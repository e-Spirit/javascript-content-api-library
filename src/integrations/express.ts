import express from 'express'
import {
  FETCH_BY_FILTER_ROUTE,
  FETCH_NAVIGATION_ROUTE,
  FETCH_ELEMENT_ROUTE,
  STREAM_CHANGE_EVENTS_ROUTE,
  FetchByFilterBody,
  FetchNavigationRouteBody,
  FetchElementRouteBody,
  FetchProjectPropertiesBody,
} from '../routes'
import { FSXARemoteApi, Logger, eventStreamHandler } from './../modules'
import { QueryBuilderQuery } from '../types'
import { FSXAProxyRoutes } from '../enums'

import {
  FetchWrapperResult,
  useEndpointIntegrationWrapper,
} from './endpointIntegrationWrapper'
import { LoggerChalked } from '../modules/LoggerChalked'

export interface GetExpressRouterContext {
  api: FSXARemoteApi
}

export const UNKNOWN_ROUTE_ERROR = 'Could not map given route and method.'

/**
 * Handles the resultObject from the wrapper, be it an error or a success.
 * On Success, it passes the fetched data, on error it uses the indicated
 * status Code and Error message to send an appropriate response.
 *
 * @param res response
 * @param result Wrapper Result
 * @returns Sends a response as indicated by the wrapper
 */
const sendWrapperResult = (
  res: express.Response,
  result: FetchWrapperResult
) => {
  if (result.success) {
    return res.json(result.data)
  } else {
    return res.status(result.error.statusCode).send({
      message: result.error.message,
      error: result.error.message,
    })
  }
}

/**
 * This handles Errors, that have not been accounted for by the wrapper.
 * Normally, this should not happen and the cause should be investaigated
 *
 * @param res response
 * @param req request
 * @param error caught error
 * @param logger logger
 * @returns sends an 500 internal server Error using the response.
 */
const sendUnexpectedError = (
  res: express.Response,
  req: express.Request,
  error: any,
  logger: Logger
) => {
  logger.error(`[${req.originalUrl}]`, 'Unexpected error: ', error, req.body)
  return res.status(500).send({ message: error.message, error: error.message })
}

function getExpressRouter({ api }: GetExpressRouterContext) {
  const router = express.Router()
  const logger = new LoggerChalked(api.logLevel, 'Express-Server')
  const wrappers = useEndpointIntegrationWrapper(api, 'Express-Server')

  router.use(express.json())
  router.post(
    [FETCH_ELEMENT_ROUTE, FSXAProxyRoutes.FETCH_ELEMENT_ROUTE],
    async (req: express.Request<any, any, FetchElementRouteBody>, res: express.Response) => {
      logger.info('Received POST on route: ', FETCH_ELEMENT_ROUTE)
      logger.debug('POST request body', req.body)

      try {
        const result = await wrappers.fetchElementWrapper(req.body)
        sendWrapperResult(res, result)
      } catch (err: any) {
        sendUnexpectedError(res, req, err, logger)
      }
    }
  )
  router.post(
    [FETCH_NAVIGATION_ROUTE, FSXAProxyRoutes.FETCH_NAVIGATION_ROUTE],
    async (req: express.Request<any, any, FetchNavigationRouteBody>, res: express.Response) => {
      logger.info('Received POST on route', FETCH_NAVIGATION_ROUTE)
      logger.debug('POST request body', req.body)
      try {
        const result = await wrappers.fetchNavigationWrapper(req.body)
        sendWrapperResult(res, result)
      } catch (err: any) {
        sendUnexpectedError(res, req, err, logger)
      }
    }
  )

  router.post(
    [FETCH_BY_FILTER_ROUTE, FSXAProxyRoutes.FETCH_BY_FILTER_ROUTE],
    async (req: express.Request<any, any, FetchByFilterBody>, res: express.Response) => {
      logger.info('Received POST on route', FETCH_BY_FILTER_ROUTE)
      logger.debug('POST request body', req.body)

      try {
        const result = await wrappers.fetchByFilterWrapper(req.body)
        sendWrapperResult(res, result)
      } catch (err: any) {
        sendUnexpectedError(res, req, err, logger)
      }
    }
  )

  router.post(
    FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE,
    async (req: express.Request<any, any, FetchProjectPropertiesBody>, res: express.Response) => {
      logger.info(
        'Received POST on route',
        FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE
      )
      try {
        const result = await wrappers.fetchProjectPropertiesWrapper(req.body)
        sendWrapperResult(res, result)
      } catch (err: any) {
        sendUnexpectedError(res, req, err, logger)
      }
    }
  )

  if (api.enableEventStream()) {
    router.get(
      [STREAM_CHANGE_EVENTS_ROUTE, FSXAProxyRoutes.STREAM_CHANGE_EVENTS_ROUTE],
      eventStreamHandler(api)
    )
  }

  /**
   * Upgraded to Express.js 5.
   * @see https://github.com/pillarjs/path-to-regexp?tab=readme-ov-file#errors
   */
  router.all('/*catchall', (req, res) => {
    logger.info('Requested unknown route', req.route)
    res.json({
      error: UNKNOWN_ROUTE_ERROR,
    })
  })
  return router
}
export default getExpressRouter

export const getMappedFilters = (filters: any | any[]): QueryBuilderQuery[] => {
  return (Array.isArray(filters)
    ? filters
    : filters
    ? [filters]
    : []) as any as QueryBuilderQuery[]
}
