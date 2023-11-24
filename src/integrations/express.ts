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

import { FetchWrapperResult, useEndpointUtils } from './fetchWrapper'

export interface GetExpressRouterContext {
  api: FSXARemoteApi
}

export const UNKNOWN_ROUTE_ERROR = 'Could not map given route and method.'

const sendWrapperResult = (
  res: express.Response,
  result: FetchWrapperResult
) => {
  if (result.success) {
    return res.json(result.data)
  } else {
    return res.status(result.error.statusCode).send({
      error: result.error.message,
    })
  }
}

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
  const logger = new Logger(api.logLevel, 'Express-Server')
  const endpointUtils = useEndpointUtils(api, 'Express-Server')

  router.use(express.json())
  router.post(
    [FETCH_ELEMENT_ROUTE, FSXAProxyRoutes.FETCH_ELEMENT_ROUTE],
    async (req: express.Request<any, any, FetchElementRouteBody>, res) => {
      logger.info('Received POST on route: ', FETCH_ELEMENT_ROUTE)
      logger.debug('POST request body', req.body)

      try {
        const result = await endpointUtils.fetchElementWrapper(req.body)
        return sendWrapperResult(res, result)
      } catch (err: any) {
        sendUnexpectedError(res, req, err, logger)
      }
    }
  )
  router.post(
    [FETCH_NAVIGATION_ROUTE, FSXAProxyRoutes.FETCH_NAVIGATION_ROUTE],
    async (req: express.Request<any, any, FetchNavigationRouteBody>, res) => {
      logger.info('Received POST on route', FETCH_NAVIGATION_ROUTE)
      logger.debug('POST request body', req.body)
      try {
        const result = await endpointUtils.fetchNavigationWrapper(req.body)
        return sendWrapperResult(res, result)
      } catch (err: any) {
        sendUnexpectedError(res, req, err, logger)
      }
    }
  )

  router.post(
    [FETCH_BY_FILTER_ROUTE, FSXAProxyRoutes.FETCH_BY_FILTER_ROUTE],
    async (req: express.Request<any, any, FetchByFilterBody>, res) => {
      logger.info('Received POST on route', FETCH_BY_FILTER_ROUTE)
      logger.debug('POST request body', req.body)

      try {
        const result = await endpointUtils.fetchByFilterWrapper(req.body)
        return sendWrapperResult(res, result)
      } catch (err: any) {
        sendUnexpectedError(res, req, err, logger)
      }
    }
  )

  router.post(
    FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE,
    async (req: express.Request<any, any, FetchProjectPropertiesBody>, res) => {
      logger.info(
        'Received POST on route',
        FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE
      )
      try {
        const result = await endpointUtils.fetchProjectPropertiesWrapper(
          req.body
        )
        return sendWrapperResult(res, result)
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

  router.all('*', (req, res) => {
    logger.info('Requested unknown route', req.route)
    return res.json({
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
