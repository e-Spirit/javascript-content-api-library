import { createFile } from './utils'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import {
  ComparisonQueryOperatorEnum,
  FSXAContentMode,
  FSXAProxyApi,
  LogLevel,
} from '../src'
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
} = process.env
const remoteApi = new FSXARemoteApi({
  apikey: API_API_KEY!,
  caasURL: API_CAAS!,
  contentMode: FSXAContentMode.PREVIEW,
  navigationServiceURL: API_NAVIGATION_SERVICE!,
  projectID: API_PROJECT_ID!,
  tenantID: API_TENANT_ID!,
  remotes: JSON.parse(API_REMOTES || '{}'),
  logLevel: LogLevel.ERROR,
  enableEventStream: !!API_ENABLE_EVENT_STREAM,
})

app.use(cors())
app.use('/api', expressIntegration({ api: remoteApi }))

app.listen(3002, async () => {
  console.log('Listening at http://localhost:3002')
  try {
    const proxyAPI = new FSXAProxyApi('http://localhost:3002/api', LogLevel.ERROR)
    /*const response = await proxyAPI.fetchNavigation({
      locale: 'de_DE',
      initialPath: '/',
    })

    createFile({
      dirName: 'dev/dist',
      fileName: 'navigation.json',
      content: response,
    })*/

    const id = "04db3ee7-7899-47b2-a346-558742301146"

    const apiKey = API_API_KEY
    const url =
      `https://veka-caas-api.e-spirit.cloud/veka-prod/cf7060f8-7878-4b46-a9de-8b265973117e.release.content/?filter={"identifier":"${id}"}&filter={"locale.country":"GB"}&filter={"locale.language":"en"}`

    //const dependencies =["2ac74a93-c382-47c4-8ff2-c054b9200786","61f83bd9-1a16-490c-b37b-08c52967dfaa"]
    const dependencies =["0de0bf30-cd27-4e41-b5af-f5d2f230930a","7ee28b35-9f34-4594-a58f-c6e79b0a4d32","c228e372-97bc-45b5-9d4c-f3ed1246308a","69d94dc2-9f4d-445e-b6ac-664d64f52dbc","04c0ec89-9e93-4e3b-9876-4f13549058cc","7c0e9f66-28a5-4a2e-81ba-07a966d49f6f","8b3448f0-cfa1-4259-a908-18263e18d0da","3a91482e-35c0-48a8-a885-fcefd73e57a8","e1d04af6-d0a4-4be8-b991-2a9f4ac62c0e","cd3cd1c1-f505-4882-83b7-8a48cd66851a","35f6b358-c5cb-45e9-9da9-5e94b519b237","15ebd508-2ef0-4f47-8cc5-c642628f6355","58d1c667-df9b-4a26-a107-deeaaf2aab07","abf4a612-a284-450d-baa3-065e5d3e4ebf","93b4d929-aeb5-422e-ab32-31cf1176f6b0","b8cc0d45-de2e-476d-8de2-06982cec92bf","66a4fbf5-bb5b-4c6c-8c70-cc5a0058bd00","690a1724-a5a6-4487-9be5-159291f51260","3101b3ab-dce3-427c-8f37-bf1e42bbf487","f1f93422-38ca-4382-b57d-dbf05efb721d","eb9fee93-e84e-4ff4-9608-59276f84c66b","e7ac0fd2-d9b4-4847-bfd2-2e534dc6d040","a768e6c0-dc2a-4c5b-9d53-9807a7b8784b","39a1a92f-c876-4870-b296-139e6ed92018","1a3e40dc-9e9c-4e74-ab94-d112be14f7cc","b6dff5a3-5904-4593-8975-3af7004be438","0fd9cd61-8a70-45be-b47f-2bd409e41734","0d16f49b-9017-42d4-ba7d-b5cb37c7fa81"]

    const url2 =
      `https://veka-caas-api.e-spirit.cloud/veka-prod/cf7060f8-7878-4b46-a9de-8b265973117e.release.content/?filter={"identifier":{$in:[${dependencies.map(s => `"${s}"`).join(",")}]}}&filter={"locale.country":"GB"}&filter={"locale.language":"en"}`

    console.log('SimpleFetch')

    const loops = 100
    let start = Date.now()
    for (let i = 0; i < loops; i++) {
      const res = await (await fetch(url, {
        headers: {
          authorization: `apikey="${apiKey}"`,
        },
      })).json();
      
      const res2 = await (await fetch(url2, {
        headers: {
          Authorization: `apikey="${apiKey}"`,
        },
      })).json();
    }
    console.log('SimpleFetch:', (Date.now() - start)/loops)
    start = Date.now()

    for (let i = 0; i < loops; i++) {
      const x = await proxyAPI.fetchByFilter({
        filters: [
          {
            field: 'identifier',
            value: id,
            operator: ComparisonQueryOperatorEnum.EQUALS,
          },
        ],
        locale: 'en_GB',
      })
    }
    console.log('ApiFetch:', (Date.now() - start)/loops)

    /*
    console.log('START')
    start = Date.now()
    const response = await proxyAPI.fetchElement({
      id: '04db3ee7-7899-47b2-a346-558742301146',
      locale: 'de_DE',
    })
    console.log('TOTAL:', Date.now() - start)
    createFile({
      dirName: 'dev/dist',
      fileName: 'content.json',
      content: response,
    })
    */
  } catch (e) {
    console.log(e)
  }
})
