import { Logger, LogLevel } from './Logger'
import { FSXAApi } from '..'

export class FSXAApiSingleton {
  private static _api: FSXAApi
  private static _logger: Logger

  public static init(api: FSXAApi, logLevel = LogLevel.ERROR) {
    this._logger = new Logger(logLevel, 'FSXAApiSingleton')
    this._logger.info('FSXA-Api initialized with api:', api)
    if (this._api) {
      this._logger.warn(
        'The FSXA-Api has already been initialized - the api will NOT be initialized again! You can ignore this message in a development scenario.'
      )
    }
    this._api = api
    return this._api
  }

  public static get instance() {
    if (!this._api) {
      throw new Error('The FSXA-Api needs to be initialized. Call .init() first.')
    }
    return this._api
  }
}
