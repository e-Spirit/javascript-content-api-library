import { createFile } from './utils'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { FSXAContentMode, FSXAProxyApi, FSXARemoteApi, LogLevel } from '../src'
import { default as expressIntegration } from '../src/integrations/express'
require('cross-fetch/polyfill')

dotenv.config({ path: './dev/.env' })
const app = express()

const {
  API_API_KEY,
  API_NAVIGATION_SERVICE,
  API_CAAS,
  API_PROJECT_ID,
  API_TENANT_ID,
  API_REMOTES,
  API_ENABLE_EVENT_STREAM,
} = process.env
const remoteApi = new FSXARemoteApi({
  apikey: API_API_KEY!,
  caasURL: API_CAAS!,
  contentMode: FSXAContentMode.PREVIEW,
  navigationServiceURL: API_NAVIGATION_SERVICE!,
  projectID: API_PROJECT_ID!,
  tenantID: API_TENANT_ID!,
  remotes: JSON.parse(API_REMOTES || '{}'),
  logLevel: LogLevel.INFO,
  enableEventStream: !!API_ENABLE_EVENT_STREAM,
  maxReferenceDepth: 0
})

app.use(cors())
app.use('/api', expressIntegration({ api: remoteApi }))

app.listen(3002, async () => {
  console.log('Listening at http://localhost:3002')
  try {
    const locale = 'en_GB'

    const proxyAPI = new FSXAProxyApi('http://localhost:3002/api', LogLevel.INFO)
    const navigationResponse = await proxyAPI.fetchNavigation({ locale, initialPath: '/' })

    createFile({
      dirName: 'dev/dist',
      fileName: `navigation.${locale}.json`,
      content: navigationResponse,
    })

    if (navigationResponse) {
      const pageInNavigationId = navigationResponse.seoRouteMap[navigationResponse.pages.index]
      const { caasDocumentId } = navigationResponse.idMap[pageInNavigationId]
      const homepageResponse = await proxyAPI.fetchElement({ id: caasDocumentId, locale })

      createFile({
        dirName: 'dev/dist',
        fileName: `homepage.${locale}.json`,
        content: homepageResponse,
      })
    }
  } catch (e) {
    console.log(e)
  }
})
