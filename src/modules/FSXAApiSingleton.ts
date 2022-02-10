import { Logger, LogLevel } from './Logger'
import { FSXAApi } from '..'

export class FSXAApiSingleton {
  private static _api: FSXAApi
  private static _logger: Logger

  public static init(api: FSXAApi, logLevel = LogLevel.ERROR) {
    if (!this._api) {
      this._logger = new Logger(logLevel, 'FSXAApiSingleton')
      this._api = api
      this._logger.debug('FSXA-Api initialized with api:', api)

      return this._api
    }

    this._logger.warn(
      'The FSXA-Api has already been initialized - the api will NOT be initialized again! You can ignore this message in a development scenario.'
    )

    return this._api
  }

  public static get instance() {
    if (!this._api) {
      throw new Error('The FSXA-Api needs to be initialized. Call .init() first.')
    }

    return this._api
  }
}
