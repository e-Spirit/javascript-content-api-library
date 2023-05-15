import Faker from 'faker'
import { getAvailableLocales } from './misc'
import { FSXARemoteApi } from '../modules'
import { generateRandomConfig } from '../testutils/generateRandomConfig'

describe('AvailableLocales', function () {
  let config: any
  beforeEach(() => {
    config = generateRandomConfig()
  })
  it('should get available locales', async () => {
    const locale = `${Faker.locale}_${Faker.locale}`
    const localeParams = {
      navigationServiceURL: config.navigationServiceURL,
      projectId: config.projectID,
      contentMode: config.contentMode,
    }
    const mockfn = jest.fn(getAvailableLocales)
    const promise = new Promise(() => mockfn(localeParams))
    promise.catch(() => {})
    mockfn.mockReturnValue(Promise.resolve([locale]))
    expect(promise).resolves.toContain([])
    mockfn.mockClear()
  })
})
