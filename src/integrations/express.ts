import express from 'express'
import {
  FETCH_BY_FILTER_ROUTE,
  FETCH_NAVIGATION_ROUTE,
  FETCH_ELEMENT_ROUTE,
  STREAM_CHANGE_EVENTS_ROUTE,
  FetchByFilterBody,
  FetchNavigationRouteBody,
  FetchElementRouteBody,
} from '../routes'
import { FSXARemoteApi, Logger, bindCaaSEventStream } from './../modules'
import { QueryBuilderQuery, ConnectEventStreamParams } from '../types'
import { FSXAApiErrors, FSXAProxyRoutes } from '../enums'

export interface GetExpressRouterContext {
  api: FSXARemoteApi
}
export enum ExpressRouterIntegrationErrors {
  MISSING_LOCALE = 'Please specify a locale in the body through: e.g. "locale": "de_DE" ',
  UNKNOWN_ROUTE = 'Could not map given route and method.',
}

function getExpressRouter({ api }: GetExpressRouterContext) {
  const router = express.Router()
  const logger = new Logger(api.logLevel, 'Express-Server')
  router.use(express.json())
  router.post(
    [FETCH_ELEMENT_ROUTE, FSXAProxyRoutes.FETCH_ELEMENT_ROUTE],
    async (req: express.Request<any, any, FetchElementRouteBody>, res) => {
      logger.info('requesting route: ', FETCH_ELEMENT_ROUTE, req.body)
      if (!req.body || req.body.locale == null) {
        logger.error(FETCH_ELEMENT_ROUTE, 'missing locale', req.body)
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }
      try {
        logger.info('trying to resolve response')
        const response = await api.fetchElement({
          id: req.body.id,
          locale: req.body.locale,
          additionalParams: req.body?.additionalParams,
          remoteProject: req.body?.remote,
        })
        logger.debug('response: ', response)
        return res.json(response)
      } catch (err: any) {
        logger.error('could not fetch element: ', err.message)
        if (
          err.message === FSXAApiErrors.NOT_FOUND ||
          err.message === FSXAApiErrors.UNKNOWN_REMOTE
        ) {
          return res.status(404).send({ message: err.message })
        } else if (FSXAApiErrors.NOT_AUTHORIZED === err.message) {
          return res.status(401).send({ message: err.message })
        } else {
          return res.status(500).send({ message: err.message })
        }
      }
    }
  )
  router.post(
    [FETCH_NAVIGATION_ROUTE, FSXAProxyRoutes.FETCH_NAVIGATION_ROUTE],
    async (req: express.Request<any, any, FetchNavigationRouteBody>, res) => {
      logger.info('fetchNavigation', 'req', { body: req.body })

      if (req.body.locale == null) {
        logger.error(FETCH_NAVIGATION_ROUTE, 'missing locale', req.body)
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }
      logger.info('trying to resolve response')
      try {
        const response = await api.fetchNavigation({
          initialPath: req.body.initialPath || '/',
          locale: req.body.locale,
          authData: req.body.authData,
        })
        logger.debug('response: ', response)
        return res.json(response)
      } catch (err: any) {
        logger.error('was not able to fetch Navigation: ', err.message)
        if (
          err.message === FSXAApiErrors.NOT_FOUND ||
          err.message === FSXAApiErrors.UNKNOWN_REMOTE
        ) {
          return res.status(404).send(err)
        } else {
          return res.status(500).send(err)
        }
      }
    }
  )
  router.post(
    [FETCH_BY_FILTER_ROUTE, FSXAProxyRoutes.FETCH_BY_FILTER_ROUTE],
    async (req: express.Request<any, any, FetchByFilterBody>, res) => {
      logger.info('post on Route:', FETCH_BY_FILTER_ROUTE)
      if (!req.body || req.body.locale == null) {
        logger.error(FETCH_BY_FILTER_ROUTE, 'missing locale', req.body)
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }

      try {
        logger.info('trying to resolve response')
        const response = await api.fetchByFilter({
          filters: req.body.filter || [],
          locale: req.body.locale,
          page: req.body.page ? req.body.page : undefined,
          pagesize: req.body.pagesize ? req.body.pagesize : undefined,
          additionalParams: req.body.additionalParams || {},
          remoteProject: req.body.remote ? req.body.remote : undefined,
        })
        logger.debug('response: ', response)
        return res.json(response)
      } catch (err: any) {
        logger.error('was not able to fetch by filter: ', err.message)
        if (err.message === FSXAApiErrors.NOT_FOUND) {
          return res.status(404).send()
        } else if (err.message === FSXAApiErrors.NOT_AUTHORIZED) {
          return res.status(401).send()
        } else {
          return res.status(500).send()
        }
      }
    }
  )
  router.post(
    FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE,
    async (req: express.Request<any, any, FetchByFilterBody>, res) => {
      logger.info('posting on route: ', FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE)
      if (!req.body || req.body.locale == null) {
        logger.error(FSXAProxyRoutes.FETCH_PROPERTIES_ROUTE, 'missing locale', req.body)
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }

      try {
        logger.info('trying to resolve response')
        const response = await api.fetchProjectProperties({
          locale: req.body.locale,
        })
        logger.debug('response: ', response)
        return res.json(response)
      } catch (err: any) {
        logger.error('was not able to fetch project properties', err.message)
        if (err.message === FSXAApiErrors.NOT_FOUND) {
          return res.status(404).send()
        } else if (err.message === FSXAApiErrors.NOT_AUTHORIZED) {
          return res.status(401).send()
        } else {
          return res.status(500).send()
        }
      }
    }
  )

  router.get(
    [STREAM_CHANGE_EVENTS_ROUTE, FSXAProxyRoutes.STREAM_CHANGE_EVENTS_ROUTE],
    async (req, res) => {
      logger.info('requesting route: ', STREAM_CHANGE_EVENTS_ROUTE, req.query)

      const params: ConnectEventStreamParams = {}
      if ('remoteProject' in req.query) {
        params.remoteProject = `${req.query.remoteProject}`
      }
      if ('additionalParams' in req.query) {
        try {
          params.additionalParams = JSON.parse(`${req.query.additionalParams}`)
        } catch (err) {
          logger.warn(
            STREAM_CHANGE_EVENTS_ROUTE,
            `parsing error for additionalParams`,
            req.query.additionalParams,
            err
          )
        }
      }

      bindCaaSEventStream(req, res, { api, ...params })
    }
  )

  router.all('*', (_, res) => {
    logger.info('trying to resolve all routes')
    return res.json({
      error: ExpressRouterIntegrationErrors.UNKNOWN_ROUTE,
    })
  })
  return router
}
export default getExpressRouter

export const getMappedFilters = (filters: any | any[]): QueryBuilderQuery[] => {
  return (Array.isArray(filters) ? filters : filters ? [filters] : []) as any as QueryBuilderQuery[]
}
