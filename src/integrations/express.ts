import express from 'express'
import FSXAApi from '../FSXAApi'
import {
  FetchByFilterQuery,
  FetchGCAPagesRouteParams,
  FetchNavigationQuery,
  FetchPageRouteParams,
  FETCH_BY_FILTER_ROUTE,
  FETCH_GCA_PAGES_ROUTE,
  FETCH_NAVIGATION_ROUTE,
  FETCH_PAGE_ROUTE,
  LocaleQuery
} from '../routes'
import { QueryBuilderQuery } from '../types/QueryBuilder'

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
    FETCH_PAGE_ROUTE,
    async (req: express.Request<FetchPageRouteParams, any, any, LocaleQuery>, res) => {
      if (req.query.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE
        })
      }
      const response = await api.fetchPage(req.params.pageId, req.query.locale)
      return res.send(response)
    }
  )
  router.get(
    FETCH_NAVIGATION_ROUTE,
    async (req: express.Request<any, any, any, FetchNavigationQuery>, res) => {
      if (req.query.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE
        })
      }
      const response = await api.fetchNavigation(req.query.initialPath || null, req.query.locale)
      return res.json(response)
    }
  )
  router.get(
    FETCH_GCA_PAGES_ROUTE,
    async (req: express.Request<FetchGCAPagesRouteParams, any, any, LocaleQuery>, res) => {
      if (req.query.locale == null) {
        return res.json({
          error: ExpressRouterIntegrationErrors.MISSING_LOCALE
        })
      }
      const response = await api.fetchGCAPages(req.query.locale, req.params.uid)
      return res.json(response)
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
      const filters = getMappedFilters(req.query.filter)
      const response = await api.fetchByFilter(filters, req.query.locale)
      return res.json(response)
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

export const getMappedFilters = (filters: string | string[]): QueryBuilderQuery[] => {
  return Array.isArray(filters)
    ? filters.map(filter => JSON.parse(filter))
    : filters
    ? [JSON.parse(filters)]
    : []
}
