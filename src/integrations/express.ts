import express from 'express'
import bodyParser from 'body-parser'
import {
  FetchElementRouteParams,
  FETCH_BY_FILTER_ROUTE,
  FETCH_NAVIGATION_ROUTE,
  FETCH_ELEMENT_ROUTE,
  STREAM_CHANGE_EVENTS_ROUTE,
  FetchByFilterBody,
  FetchNavigationRouteBody,
  FetchElementRouteBody,
} from '../routes'
import { FSXAApi, FSXAApiErrors, EventStream } from './../modules'
import { QueryBuilderQuery } from '../types'

export interface GetExpressRouterContext {
  api: FSXAApi
}
export enum ExpressRouterIntegrationErrors {
  MISSING_LOCALE = 'Please specify a locale in the body through: e.g. "locale": "de_DE" ',
  UNKNOWN_ROUTE = 'Could not map given route and method.',
}
function getExpressRouter({ api }: GetExpressRouterContext) {
  const eventStream = new EventStream(api)
  const router = express.Router()
  router.use(express.json())
  router.post(
    FETCH_ELEMENT_ROUTE,
    async (req: express.Request<FetchElementRouteParams, any, FetchElementRouteBody>, res) => {
      if (!req.body || req.body.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }
      try {
        const response = await api.fetchElement(
          req.params.id,
          req.body.locale,
          req.body?.additionalParams,
          req.body?.remote
        )
        return res.json(response)
      } catch (err) {
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
    FETCH_NAVIGATION_ROUTE,
    async (req: express.Request<any, any, FetchNavigationRouteBody>, res) => {
      if (req.body.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }
      try {
        const response = await api.fetchNavigation(req.body.initialPath || null, req.body.locale)
        return res.json(response)
      } catch (err) {
        if (
          err.message === FSXAApiErrors.NOT_FOUND ||
          err.message === FSXAApiErrors.UNKNOWN_REMOTE
        ) {
          return res.status(404).send()
        } else {
          return res.status(500).send()
        }
      }
    }
  )
  router.post(
    FETCH_BY_FILTER_ROUTE,
    async (req: express.Request<any, any, FetchByFilterBody>, res) => {
      if (!req.body || req.body.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE,
        })
      }
      try {
        const response = await api.fetchByFilter(
          req.body.filter || [],
          req.body.locale,
          req.body.page ? req.body.page : undefined,
          req.body.pagesize ? req.body.pagesize : undefined,
          req.body.additionalParams || {},
          req.body.remote ? req.body.remote : undefined
        )
        return res.json(response)
      } catch (err) {
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
  router.get(STREAM_CHANGE_EVENTS_ROUTE, eventStream.middleware.bind(eventStream))
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
