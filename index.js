require('cross-fetch/polyfill')
const inspect = require('util').inspect
const express = require("express");
const getExpressRouter = require('./dist/fsxa-api.umd').getExpressRouter


const app = express();
const FSXAApi = require('./dist/fsxa-api.umd.js')
const api = new FSXAApi('preview', {
  mode: 'remote',
  config: {
    apiKey: '77b6911e-ad45-42af-87b6-7f694e7ef3f2',
    navigationService: 'https://enterprise-dev-navigationservice.e-spirit.cloud/navigation',
    caas: 'https://enterprise-dev-caas-api.e-spirit.cloud',
    projectId: '3a7eba65-3bd9-4df4-a176-350dbfa19104',
    tenantId: 'enterprise-dev',
    mapDataQuery: query => {
      switch (query.name) {
        case 'products.produkte_nach_kategorie':
          return [
            {
              field: 'formData.tt_categories.value.label',
              value: query.filterParams['category'],
              operator: '$eq'
            }
          ]
      }
      return []
    }
  }
})
app.use(getExpressRouter(api));

app.listen(3000, () => {
  const proxyApi = new FSXAApi("preview", { mode: "proxy", baseUrl: "http://localhost:3000" })
})
/**api
  .fetchGCAPages('de_DE', 'global_settings')
  .then(response => console.log(inspect(response, false, null, true)))**/
const 

api
  .fetchByFilter('de_DE', { })
  .then(response => console.log(inspect(response, false, null, true)))
