# FSXA-API

The FSXA-API is an interface handling data coming from the FirstSpirit
[CaaS](https://docs.e-spirit.com/module/caas/CaaS_Product_Documentation_EN.html) and the
Navigation Service. The data is processed and transformed so that it can be used in any JavaScript project.

- [FSXA-API](#fsxa-api)
  - [About the FSXA](#about-the-fsxa)
  - [Experimental features](#experimental-features)
  - [Legal Notices](#legal-notices)
  - [Methods](#methods)
    - [Constructor](#constructor)
    - [setConfiguration](#setconfiguration)
    - [config](#config)
    - [buildAuthorizationHeaders](#buildauthorizationheaders)
    - [buildCaaSURL](#buildcaasurl)
    - [buildNavigationServiceUrl](#buildnavigationserviceurl)
    - [fetchElement](#fetchelement)
    - [fetchByFilter](#fetchbyfilter)
    - [fetchProjectProperties](#fetchprojectproperties)
  - [Filter](#filter)
    - [Logical Query Operators](#logical-query-operators)
    - [Comparison Query Operators](#comparison-query-operators)
    - [Array Query Operators](#array-query-operators)
  - [Type Mapping](#type-mapping)
    - [Input Components](#input-components)
  - [Disclaimer](#disclaimer)

## About the FSXA

The FirstSpirit Experience Accelerator (FSXA) is the hybrid solution of a digital
experience platform, combining a headless approach with enterprise capabilities.
If you are interested in the FSXA check this
[Overview](https://docs.e-spirit.com/module/fsxa/overview/benefits-hybrid/index.html). You can order
a demo [online](https://www.e-spirit.com/us/specialpages/forms/on-demand-demo/).

## Experimental features

Features marked as experimental are subject to change as long as they remain in the experimental state.
Breaking changes to experimental features are not reflected in major version changes.

## Legal Notices

FSXA-API is a product of [Crownpeak Technology GmbH](http://www.e-spirit.com), Dortmund, Germany.
The FSXA-API is subject to the Apache-2.0 license.

## Methods

In this section all available methods will be explained using examples.

## Requirements

The FSXA-API requires a `fetch` implementation to run on a Node server environment.
This dependency can be fulfilled with a cross-fetch polyfill in older Node versions.
A working example can be found in the chapter _Constructor_.

### Constructor

To be able to use the FSXA-API, a new object must be created.
How you create the object depends on how you want to use the FSXA-API.

If you want to use the information provided by the CaaS in your frontend, you can use the `FSXAProxyApi`.
It proxies the requested resources to a middleware Rest Api, that does not expose secrets.
If you want to use it in your server, you can use the `FSXARemoteApi`.
It can be registered as a Rest Api that can be called from a `FSXAProxyApi` instance.

However, to have a fully running application, we recommend using the FSXA-API in your server as well as in your frontend.

The config mode can be `preview` or `release`, depending on the state of the content you want to fetch.
<br />
There is an enum to use these modes.
<br />
`FSXAContentMode.PREVIEW` for `preview`
<br />
`FSXAContentMode.RELEASE` for `release`

If you want to use the `FSXARemoteApi`, you have to specify the following parameters:

```typescript
const config = {
  apikey: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'!,
  caasURL: 'https://your.caas.url',
  contentMode: FSXAContentMode.PREVIEW,
  navigationServiceURL: 'https://your.navigation-service.url/navigation',
  projectID: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  tenantID: 'your-tenant-id',
  logLevel: LogLevel.INFO,
  enableEventStream: true || false,
}
```

You can also include remote projects if you want to use remote media.

> **_Attention_**<br>
> Currently the FSXA-API can only work with the master language of the remote media project.
> You also require a configured CAAS API key with read permissions to both projects.

> For this you can add another parameter called `remotes` to the config. This parameter expects an object, which requires a unique name as key and an object as value. This object must have two keys. On the one hand an `id` with the project id as the value and on the other the `locale` with the locale abbreviation. For example:

```typescript
const config = {
  ...
  remotes: { media: { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', locale: 'en_GB' } },
  ...
}
```

The log level can be:
`0` = Info
`1` = Log
`2` = Warning
`3` = Error
`4` = None. The default is set to `3`.

Here is an example of how the `FSXARemoteApi` and `FSXAProxyApi` could be used with an [Express.js](https://expressjs.com/) backend.
Make sure you have `cross-fetch`, `express`, `cors`, `lodash` and of course `fsxa-api` installed.

```typescript
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import {
  FSXAContentMode,
  FSXAProxyApi,
  LogLevel,
  FSXARemoteApi,
} from 'fsxa-api'
import getExpressRouter from 'fsxa-api/dist/lib/integrations/express'
import 'cross-fetch/polyfill'

dotenv.config({ path: '.env' })
const app = express()
const remoteApi = new FSXARemoteApi(config)

app.use(cors())
app.use('/api', getExpressRouter({ api: remoteApi }))

app.listen(3002, async () => {
  console.log('Listening at http://localhost:3002')
  try {
    const locale = 'de_DE'
    const proxyAPI = new FSXAProxyApi(
      'http://localhost:3002/api',
      LogLevel.INFO
    )
    // you can also fetch navigation from proxyAPI
    const navigationResponse = await proxyAPI.fetchNavigation({
      locale,
      initialPath: '/',
    })
  } catch (e) {
    console.log(e)
  }
})
```

### get authorizationHeader

Returns the build authorization header in the following format when using `FSXARemoteApi`:

```typescript
{
  authorization: 'Bearer xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
}
```

Example:

```typescript
const remoteApi = new FSXARemoteApi(config)
const authorizationHeader = remoteApi.authorizationHeader
// console.log { authorization: `Bearer ${config.apikey}` }
```

### fetchNavigation

This method fetches the navigation from the configured navigation service. You need to pass a `FetchNavigationParams` object.

Example:

```typescript
fsxaApi.fetchNavigation({
  locale: 'en_EN',
  initialPath: '/',
})
```

### fetchElement

This method fetches an element from the configured CaaS. The `FetchElementParams` object defines options to specify your request. Check `FSXARemoteApi.buildCaaSUrl` to know which URL will be used.

```typescript
fsxaApi.fetchElement({
  id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  locale: 'de_DE',
})
```

> **_Note_**<br>
> The 'raw' CaaS data might be helpful when you want to know the key names that you can filter for.
> It is possible to access that data directly with the authorization header and the CaaS Url.

### fetchByFilter

Returns the matching CaaS data entries.
It maps the given entries to a more frontend-friendly format.
Unneccessary fields will be omitted and the structure is simpler.

Expects as input parameter an array of filters and a language abbreviation.
Optionally a page number, page size, sort and additional parameters can be passed.
<br />
Optionally, a remoteProject can be passed. If one is passed, the element will be fetched from this project instead of the default one.

Several filter objects can be specified in the filter array, the results will then correspond to all specified filters.

One filter object must have a:
<br />
`field` which specifies the searched key,
<br />
`operator` which specifies the search operation,
<br />
`value` which specifies the value that is looked for.

[More information to the filters](#filter)

In this example we search for all elements with the `fsType` equals `Example`. We want the `2nd` page with a maximum of `50` entries. The results should be sorted by fsType descending. However, we do not want the `identifier` to appear:

```typescript
fsxaApi.fetchByFilter({
  filters: [
    {
      field: 'fsType',
      operator: ComparisonQueryOperatorEnum.EQUALS,
      value: 'Example',
    },
  ],
  locale: 'en',
  page: 2,
  pagesize: 50,
  additionalParams: { keys: { identifier: 0 } },
  sort: [{ name: 'fsType', order: 'desc' }],
})
```

The default sorting is by the id descending. Multisort is possible and the first sort param is prioritized over subsequent. The sorting is happening on the raw data.

> **_Attention_**<br>
> The keys names which are passed to the `fetchByFilter` method (e.g. in the filters or the additionalParams) have to match the key names that are present in the CaaS data.

### fetchProjectProperties

Returns the project properties of the given language.

Expects a parameter object with the locale.

ATTENTION: Works only with CaaSConnect module version 3 onwards.

Example:

```typescript
fsxaApi.fetchProjectProperties({
  locale: 'de_DE',
})
```

## Filter

You can customize your queries in the [fetchByFilter](#fetchbyfilter) method with these operations. For more information please refer to the MongoDB documentation. Links are provided in each section.

### Logical Query Operators

These operators can also be found in the [MongoDB Documentation](https://docs.mongodb.com/manual/reference/operator/query-logical/)

| Enum                         | Operation |
| ---------------------------- | --------- |
| LogicalQueryOperatorEnum.AND | \$and     |
| LogicalQueryOperatorEnum.NOT | \$not     |
| LogicalQueryOperatorEnum.NOR | \$nor     |
| LogicalQueryOperatorEnum.OR  | \$or      |

### Comparison Query Operators

These operators can also be found in the [MongoDB Documentation](https://docs.mongodb.com/manual/reference/operator/query-comparison/)

| Enum                                            | Operation |
| ----------------------------------------------- | --------- |
| ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS | \$gte     |
| ComparisonQueryOperatorEnum.GREATER_THAN        | \$gt      |
| ComparisonQueryOperatorEnum.EQUALS              | \$eq      |
| ComparisonQueryOperatorEnum.IN                  | \$in      |
| ComparisonQueryOperatorEnum.LESS_THAN           | \$lt      |
| ComparisonQueryOperatorEnum.LESS_THAN_EQUALS    | \$lte     |
| ComparisonQueryOperatorEnum.NOT_EQUALS          | \$ne      |
| ComparisonQueryOperatorEnum.NOT_IN              | \$nin     |

### Evaluation Query Operators

These operators can also be found in the [MongoDB Documentation](https://docs.mongodb.com/manual/reference/operator/query-evaluation/)

| Enum                              | Operation |
| --------------------------------- | --------- |
| EvaluationQueryOperatorEnum.REGEX | \$regex   |

### Array Query Operators

These operators can also be found in the [MongoDB Documentation](https://docs.mongodb.com/manual/reference/operator/query-array/)

| Enum                       | Operation |
| -------------------------- | --------- |
| ArrayQueryOperatorEnum.ALL | \$all     |

## Type Mapping

### Input Components

This table gives an overview of the FirstSpirit input components, which can be defined in the "Form" tab of the FirstSpirit templates.
Each input component has a (Java) data type, which has a representation in the CaaS. Those values are [mapped](src/modules/CaaSMapper.ts) to an [interface](src/types.ts) of the fsxa-api.

| <nobr>FirstSpirit Input Component</nobr>                                 | <nobr>CaaS Representation</nobr>                                                                                                                  | <nobr>FSXA-API [Value](src/types.ts)</nobr> |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [FS_CATALOG]<br />[`Catalog`][fs-catalog]`<`[`Catalog$Card`][fs-card]`>` | <nobr>= `CaaSApi_FSCatalog`</nobr><br />= `CaaSApi_Card[]`                                                                                        | `Section[]`                                 |
| [CMS_INPUT_CHECKBOX]<br />[`Set`][fs-set]`<`[`Option`][fs-option]`>`     | <nobr>= `CaaSApi_CMSInputCheckbox`</nobr><br />= `CaaSApi_Option[]`                                                                               | `Option[]`                                  |
| [CMS_INPUT_COMBOBOX]<br />[`Option`][fs-option]                          | <nobr>= `CaaSApi_CMSInputCombobox`</nobr><br />= `CaaSApi_Option`&#124;`null`                                                                     | `Option`                                    |
| [FS_DATASET]<br />[`DatasetContainer`][fs-datasetcontainer]              | <nobr>= `CaaSApi_FSDataset`</nobr><br />= `CaaSApi_Dataset`&#124;`CaaSApi_DataEntry[]`&#124;`null`                                                | `Dataset`                                   |
| [CMS_INPUT_DATE]<br />[`Date`][fs-date]                                  | <nobr>= `CaaSApi_CMSInputDate`</nobr><br />= `string(ISO_8601)`&#124;`null`                                                                       | [`Date`][js-date]                           |
| [CMS_INPUT_DOM]<br>[`DomElement`][fs-domelement]                         | <nobr>= `CaaSApi_CMSInputDOM`</nobr><br />= `string` (FS-XML)                                                                                     | `RichTextElement[]`                         |
| [CMS_INPUT_DOMTABLE]<br>[`Table`][fs-table]                              | <nobr>= `CaaSApi_CMSInputDOMTable`</nobr><br />= `string` (FS-XML)                                                                                | `RichTextElement[]`                         |
| [CMS_INPUT_IMAGEMAP]<br>[`MappingMedium`][fs-mappingmedium]              | <nobr>= `CaaSApi_CMSImageMap`</nobr><br />= `CaaSApi_CMSImageMap`                                                                                 | `ImageMap`                                  |
| [FS_INDEX]<br />[`Index`][fs-index]`<`[`Index$Record`][fs-record]`>`     | <nobr>= `CaaSApi_FSIndex`</nobr><br />= `CaaSApi_Record[]`                                                                                        | `DataEntries[]`                             |
| [CMS_INPUT_LINK]<br />[`Link`][fs-link]                                  | <nobr>= `CaaSApi_CMSInputLink`</nobr><br />= `Object`                                                                                             | `Link`                                      |
| [CMS_INPUT_LIST]<br />[`Set`][fs-set]`<`[`Option`][fs-option]`>`         | <nobr>= `CaaSApi_CMSInputList`</nobr><br />= `any[]`                                                                                              | `Option[]`                                  |
| [CMS_INPUT_NUMBER]<br />[`Number`][fs-number]                            | <nobr>= `CaaSApi_CMSInputNumber`</nobr><br />= `number`                                                                                           | [`number`](js-number)                       |
| [CMS_INPUT_PERMISSION]<br />[`Permissions`][fs-permissions]              | <nobr>= `CaaSApi_CMSInputPermission`</nobr><br />= `CaaSAPI_PermissionActivity[][]`                                                               | `Permission`                                |
| [CMS_INPUT_RADIOBUTTON]<br />[`Option`][fs-option]                       | <nobr>= `CaaSApi_CMSInputRadioButton`</nobr><br />= `CaaSApi_Option`&#124;`null`                                                                  | `Option`                                    |
| [FS_REFERENCE]<br />[`TargetReference`][fs-targetreference]              | <nobr>= `CaaSApi_FSReference`</nobr><br />= `CaaSApi_BaseRef`&#124;`CaaSApi_PageRefRef`&#124;`CaaSApi_GCARef`&#124;`CaaSApi_MediaRef`&#124;`null` |
| [CMS_INPUT_TEXT]<br />[`String`][fs-string]                              | <nobr>= `CaaSApi_CMSInputText`</nobr><br />= `string`                                                                                             | [`string`][js-string]                       |
| [CMS_INPUT_TEXTAREA]<br />[`String`][fs-string]                          | <nobr>= `CaaSApi_CMSInputTextArea`</nobr><br />= `string`                                                                                         | [`string`][js-string]                       |
| [CMS_INPUT_TOGGLE]<br />[`Boolean`][fs-boolean]                          | <nobr>= `CaaSApi_CMSInputToggle`</nobr><br />= `boolean`&#124;`null`                                                                              | [`boolean`][js-boolean]                     |

[fs_catalog]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/catalog/index.html
[fs-catalog]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/catalog/index.html
[fs-card]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/card/index.html
[cms_input_checkbox]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/checkbox/index.html
[fs-set]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/set/index.html
[fs-option]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/option/index.html
[cms_input_combobox]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/combobox/index.html
[fs_dataset]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/dataset/index.html
[fs-datasetcontainer]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/datasetcontaine/index.html
[cms_input_date]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/date/index.html
[fs-date]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/date/index.html
[js-date]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
[cms_input_dom]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/dom/index.html
[fs-domelement]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/domelement/index.html
[cms_input_domtable]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/domtable/index.html
[fs-table]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/table/index.html
[cms_input_imagemap]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/imagemap/index.html
[fs-mappingmedium]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/mappingmedium/index.html
[fs_index]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/index/index.html
[fs-index]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/index/index.html
[fs-record]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/record/index.html
[cms_input_link]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/link/index.html
[fs-link]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/link/index.html
[cms_input_list]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/list/index.html
[cms_input_number]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/number/index.html
[fs-number]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/number/index.html
[js-number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
[cms_input_permission]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/permission/index.html
[fs-permissions]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/permissions/index.html
[cms_input_radiobutton]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/radiobutton/index.html
[fs_reference]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/reference/index.html
[fs-targetreference]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/targetreference/index.html
[cms_input_text]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/text/index.html
[fs-string]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/string-text/index.html
[js-string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
[cms_input_textarea]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/textarea/index.html
[cms_input_toggle]: https://docs.e-spirit.com/odfs/template-develo/forms/input-component/toggle/index.html
[fs-boolean]: https://docs.e-spirit.com/odfs/template-develo/template-syntax/data-types/boolean/index.html
[js-boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean

## Disclaimer

This document is provided for information purposes only.
Crownpeak Technology may change the contents hereof without notice.
This document is not warranted to be error-free, nor subject to any
other warranties or conditions, whether expressed orally or
implied in law, including implied warranties and conditions of
merchantability or fitness for a particular purpose. Crownpeak Technology
specifically disclaims any liability with respect to this document
and no contractual obligations are formed either directly or
indirectly by this document. The technologies, functionality, services,
and processes described herein are subject to change without notice.
