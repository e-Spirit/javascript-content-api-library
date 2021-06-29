import {inspect} from "util";
import dotenv from "dotenv"
import express from "express";
import {FSXAApi, FSXAContentMode} from "../src"
import {default as expressIntegration} from "../src/integrations/express"
require('cross-fetch/polyfill')

dotenv.config({path: './dev/.env'})
const app = express()

const {API_API_KEY, API_NAVIGATION_SERVICE, API_CAAS, API_PROJECT_ID, API_TENANT_ID} = process.env

const remoteApi = new FSXAApi(
  FSXAContentMode.PREVIEW,
  {
    mode: "remote", // we want to test against the 'remote' mode to ensure that it works with both modes.
    config: {
      apiKey: API_API_KEY!,
      navigationService: API_NAVIGATION_SERVICE!,
      caas: API_CAAS!,
      projectId: API_PROJECT_ID!,
      tenantId: API_TENANT_ID!
    }
  },
  3
)
app.use('/api', expressIntegration({ api: remoteApi }))

app.listen(3001, async () => {
  console.log('Listening at http://localhost:3001')

  const proxyApi = new FSXAApi(
    FSXAContentMode.PREVIEW,
    {
      mode: 'proxy',
      baseUrl: 'http://localhost:3001/api'
    },
    3
  )
  try {
    const response = await proxyApi.fetchProjectProperties("de_DE")
    console.log(inspect(response, false, null, true))
  } catch (err) {
    console.log('ERROR', err)
  }
})
