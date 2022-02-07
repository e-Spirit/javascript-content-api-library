import { FSXAApi } from '..'

export class FSXAApiSingleton {
  private static _api: FSXAApi

  public static init(api: FSXAApi) {
    if (this._api) {
      throw new Error(
        'init may only be called once! Directly create a FSXAProxyApi | FSXARemoteApi, if you need customized parameters'
      )
    }
    this._api = api
    return this._api
  }

  public static get instance() {
    if (!this._api) {
      throw new Error('Call .init() first')
    }
    return this._api
  }
}
