import { createFile } from './utils'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { FSXAContentMode, FSXAProxyApi, LogLevel, NavigationItem } from '../src'
import { default as expressIntegration } from '../src/integrations/express'
import { FSXARemoteApi } from '../src/modules/FSXARemoteApi'
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
  API_CACHE_ENABLED,
  API_CACHE_TIME_IN_S,
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
  isCacheEnabled: API_CACHE_ENABLED! === 'true',
  cacheTimeInS: parseInt(API_CACHE_TIME_IN_S!, 10),
})

app.use(cors())
app.use('/api', expressIntegration({ api: remoteApi }))

app.listen(3002, async () => {
  console.log('Listening at http://localhost:3002')
  try {
    const proxyAPI = new FSXAProxyApi('http://localhost:3002/api', LogLevel.INFO)
    /*const response = await proxyAPI.fetchNavigation({
      locale: 'de_DE',
      initialPath: '/',
    })

    createFile({
      dirName: 'dev/dist',
      fileName: 'navigation.json',
      content: response,
    })*/

    const response = await proxyAPI.fetchElement({
      id: '6eeb4e54-6cc4-46f8-b895-637a6dea7796',
      locale: 'en_GB',
    })

    createFile({
      dirName: 'dev/dist',
      fileName: 'content.json',
      content: response,
    })
  } catch (e) {
    console.log(e)
  }
})
