# Integration Tests

Here you can find a guide for using integration tests of the FSXAApi.

## Requirements

Add .env file in folder "/src/integrationtests/" (for reference check .env.template).

IMPORTANT: Make sure to only use an isolated testing environment as data gets written and deleted there.

## Write testing data to caas

Make sure to always include "\_id" and "locale" properties in your testing data, otherwise using the CaasTestingClient won't work properly! If you write data to the CaaS the "\_id" property needs to be without locale ending ".en_GB" etc.

You can perform a simple typecheck with the "TestDocument" interface like this:

```typescript
const yourTestDoc:TestDocument = {
  _id:'some id',
  locale:{
    country:'some contry code',
    language:'some language',
    identifier: 'some identifier'
  },
  more custom properties...
}
```

In your test file use the "CaasTestingClient" from "./utils" to easily read and write testing data to the CaaS. Start with intitializing the caasClient:

```typescript
const caasClient = new CaasTestingClient.init({
  apikey: INTEGRATION_TEST_API_API_KEY!,
  caasURL: INTEGRATION_TEST_API_CAAS!,
  projectID: randomlyGeneratedProjectId, // use a random id to isolate test data
  tenantID: INTEGRATION_TEST_API_TENANT_ID!,
  contentMode: FSXAContentMode.PREVIEW,
})
```

IMPORTANT: Make sure to use the same config as when you intitialize the FSXARemoteApi. The projectId should be randomly generated, so that tests don't get in the way of each other.

Insert a test doc into that colleciton with:

```typescript
await caasClient.addDocToCollection(testingDocument)
```

You can also add multiple docs in bulk, for this you have to pass your data as an array, notice it's a different function:

```typescript
await caasClient.addDocsToCollection(testDataArray)
```

After the tests ran, you have to delete the test collection, so you don't trash the database. You will need to provide an "etag" as an argument. You can get it by querying the collection first, and deleting it afterwards:

```typescript
const res = await caasClient.getCollection()
const parsedRes = await res.json()
await caasClient.removeCollection(parsedRes._etag.$oid)
```
