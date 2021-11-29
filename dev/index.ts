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
})

app.use(cors())
app.use('/api', expressIntegration({ api: remoteApi }))

app.listen(3002, async () => {
  console.log('Listening at http://localhost:3002')
  try {
    const proxyAPI = new FSXAProxyApi('http://localhost:3002/api', 0)
    const response = await proxyAPI.fetchByFilter({
      locale: 'de_DE',
      filters: [],
      page: -25,
    })

    createFile({
      dirName: 'dev/dist/proxy',
      fileName: 'navigation.json',
      content: response,
    })
  } catch (e) {
    console.log(e)
  }
})
