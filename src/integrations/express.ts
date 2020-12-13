import express from 'express'
import {
  FetchByFilterQuery,
  FetchGCAPagesRouteParams,
  FetchElementRouteQuery,
  FetchElementRouteParams,
  FetchNavigationRouteQuery,
  FETCH_BY_FILTER_ROUTE,
  FETCH_GCA_PAGES_ROUTE,
  FETCH_NAVIGATION_ROUTE,
  FETCH_ELEMENT_ROUTE,
  LocaleQuery
} from '../routes'
import { FSXAApi, FSXAApiErrors } from './../modules'
import { QueryBuilderQuery } from '../types'

export interface GetExpressRouterContext {
  api: FSXAApi
}
export enum ExpressRouterIntegrationErrors {
  MISSING_LOCALE = 'Please specify a locale through ?locale.',
  UNKNOWN_ROUTE = 'Could not map given route and method.'
}
function getExpressRouter({ api }: GetExpressRouterContext) {
  const router = express.Router()
  router.get(
    FETCH_ELEMENT_ROUTE,
    async (
      req: express.Request<FetchElementRouteParams, any, any, FetchElementRouteQuery>,
      res
    ) => {
      if (req.query.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE
        })
      }
      try {
        const response = await api.fetchElement(
          req.params.id,
          req.query.locale,
          req.query.additionalParams || {}
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
  router.get(
    FETCH_NAVIGATION_ROUTE,
    async (req: express.Request<any, any, any, FetchNavigationRouteQuery>, res) => {
      if (req.query.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE
        })
      }
      try {
        const response = await api.fetchNavigation(req.query.initialPath || null, req.query.locale)
        return res.json(response)
      } catch (err) {
        if (err.message === FSXAApiErrors.NOT_FOUND) {
          return res.status(404).send()
        } else {
          return res.status(500).send()
        }
      }
    }
  )
  router.get(
    FETCH_BY_FILTER_ROUTE,
    async (req: express.Request<any, any, any, FetchByFilterQuery>, res) => {
      if (req.query.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE
        })
      }
      try {
        const filters = getMappedFilters(req.query.filter)
        const additionalParams: Record<string, any> = req.query.additionalParams || {}
        const response = await api.fetchByFilter(
          filters,
          req.query.locale,
          req.query.page ? parseInt(req.query.page) : undefined,
          req.query.pagesize ? parseInt(req.query.pagesize) : undefined,
          additionalParams
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
  router.all('*', (_, res) => {
    return res.json({
      error: ExpressRouterIntegrationErrors.UNKNOWN_ROUTE
    })
  })
  return router
}
export default getExpressRouter

export const getMappedFilters = (filters: any | any[]): QueryBuilderQuery[] => {
  return ((Array.isArray(filters)
    ? filters
    : filters
    ? [filters]
    : []) as any) as QueryBuilderQuery[]
}
