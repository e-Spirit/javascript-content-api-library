import 'jest-fetch-mock'
import { enableFetchMocks } from 'jest-fetch-mock'
enableFetchMocks()
import { getAvailableLocales } from './misc'
import { generateRandomConfig } from '../testutils/generateRandomConfig'
import { createNavigationServiceData } from '../testutils/createNavigationServiceData'

describe('AvailableLocales', function () {
  let config: any

  beforeEach(() => {
    config = generateRandomConfig()
    fetchMock.resetMocks()
  })
  it('should get available locales', async () => {
    const data = createNavigationServiceData()
    fetchMock.mockResponseOnce(JSON.stringify(data))
    const localeParams = {
      navigationServiceURL: config.navigationServiceURL,
      projectId: config.projectID,
      contentMode: config.contentMode,
    }
    const availableLocales = await getAvailableLocales(localeParams)
    expect(fetchMock.mock.calls.length).toEqual(1)
    expect(availableLocales).toEqual(['de_DE', 'en_GB'])
  })
  it('should return empty array if bad response data structure', async () => {
    const data = {
      someValue: 'someValue',
    }
    fetchMock.mockResponseOnce(JSON.stringify(data))
    const localeParams = {
      navigationServiceURL: config.navigationServiceURL,
      projectId: config.projectID,
      contentMode: config.contentMode,
    }
    const availableLocales = await getAvailableLocales(localeParams)
    expect(fetchMock.mock.calls.length).toEqual(1)
    expect(availableLocales).toEqual([])
  })
})
