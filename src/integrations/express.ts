import express from 'express'
import {
  FETCH_BY_FILTER_ROUTE,
  FETCH_NAVIGATION_ROUTE,
  FETCH_ELEMENT_ROUTE,
  FetchByFilterBody,
  FetchNavigationRouteBody,
  FetchElementRouteBody,
} from '../routes'
import { FSXARemoteApi, Logger, LogLevel } from './../modules'
import { QueryBuilderQuery } from '../types'
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
  router.get('/ok', (req, res) => {
    logger.info('cookie', req.headers.cookie)
    res.send('ok')
  })
  router.post(
    [FETCH_ELEMENT_ROUTE, FSXAProxyRoutes.FETCH_ELEMENT_ROUTE],
    async (req: express.Request<any, any, FetchElementRouteBody>, res) => {
      if (!req.body || req.body.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }
      try {
        const response = await api.fetchElement({
          id: req.body.id,
          locale: req.body.locale,
          additionalParams: req.body?.additionalParams,
          remoteProject: req.body?.remote,
        })
        return res.json(response)
      } catch (err: any) {
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
      logger.info('fetchNavigation', 'start1111')
      logger.info('fetchNavigation', 'req', { body: req.body })

      if (req.body.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }
      try {
        const response = await api.fetchNavigation({
          initialPath: req.body.initialPath || '/',
          locale: req.body.locale,
          authData: req.body.authData,
        })
        return res.json(response)
      } catch (err: any) {
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
      if (!req.body || req.body.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }

      try {
        const response = await api.fetchByFilter({
          filters: req.body.filter || [],
          locale: req.body.locale,
          page: req.body.page ? req.body.page : undefined,
          pagesize: req.body.pagesize ? req.body.pagesize : undefined,
          additionalParams: req.body.additionalParams || {},
          remoteProject: req.body.remote ? req.body.remote : undefined,
        })

        return res.json(response)
      } catch (err: any) {
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
      if (!req.body || req.body.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }

      try {
        const response = await api.fetchProjectProperties({
          locale: req.body.locale,
        })
        return res.json(response)
      } catch (err: any) {
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
  router.all('*', (_, res) => {
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
