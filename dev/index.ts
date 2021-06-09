import { createFile } from './utils'
import { inspect } from 'util'
import { ComparisonQueryOperatorEnum } from './../src/modules/QueryBuilder'
import dotenv from 'dotenv'
import express from 'express'
import { FSXAApi, FSXAContentMode } from '../src'
import { default as expressIntegration } from '../src/integrations/express'
import { dirname } from 'path'
require('cross-fetch/polyfill')

dotenv.config({ path: './dev/.env' })
const app = express()

const {
  API_API_KEY,
  API_NAVIGATION_SERVICE,
  API_CAAS,
  API_PROJECT_ID,
  API_TENANT_ID,
  API_REMOTES
} = process.env

const remoteApi = new FSXAApi(
  FSXAContentMode.PREVIEW,
  {
    mode: 'remote', // we want to test against the 'remote' mode to ensure that it works with both modes.
    config: {
      apiKey: API_API_KEY!,
      navigationService: API_NAVIGATION_SERVICE!,
      caas: API_CAAS!,
      projectId: API_PROJECT_ID!,
      tenantId: API_TENANT_ID!,
      remotes: API_REMOTES ? (JSON.parse(API_REMOTES) as Record<string, string>) : {}
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
    const response = await remoteApi.fetchByFilter(
      [
        { field: 'entityType', operator: ComparisonQueryOperatorEnum.EQUALS, value: 'product' },
        { field: 'schema', operator: ComparisonQueryOperatorEnum.EQUALS, value: 'products' },
        {
          field: 'displayName',
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: 'Thermo NUK-33'
        }
      ],
      'de_DE'
    )
    //console.log('tt_teaser_image', inspect(response, false, null, true))
    createFile({
      dirName: './dev/dist',
      fileName: 'tt_teaser_image.json',
      content: (response[0] as any).data.tt_teaser_image
    })
  } catch (err) {
    console.log('ERROR', err)
  }
})
