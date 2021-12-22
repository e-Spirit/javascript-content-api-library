import { FSXARemoteApi, Logger } from './'
import { NextFunction, Response, Request } from 'express'
import SSE from 'express-sse-ts'
import WebSocket from 'ws'
import { LogLevel } from '..'

const DEFAULT_RECONNECTION_DELAY = 10
const DEFAULT_MAX_RETRIES = 10

export type EventStreamOptions = {
  logLevel?: LogLevel
  reconnectionDelay?: number
  maxRetries?: number
}

export class EventStream {
  api: FSXARemoteApi
  logger: Logger
  reconnectionDelay: number
  maxRetries: number
  retryCount: number
  secureToken: string | null = null
  sse: SSE
  socket?: WebSocket

  constructor(api: FSXARemoteApi, options?: EventStreamOptions) {
    this.api = api
    this.logger = new Logger((options && options.logLevel) || api.logLevel, 'EventStream')
    this.reconnectionDelay = (options && options.reconnectionDelay) || DEFAULT_RECONNECTION_DELAY
    this.maxRetries = (options && options.maxRetries) || DEFAULT_MAX_RETRIES

    this.retryCount = 0
    this.sse = new SSE()
  }

  async refreshSecureToken() {
    try {
      this.secureToken = await this.api.fetchSecureToken()
    } catch (err) {
      this.logger.error(err)
    }
  }

  async ensureConnection() {
    if (
      this.socket?.readyState !== WebSocket.OPEN &&
      this.socket?.readyState !== WebSocket.CONNECTING
    ) {
      if (this.retryCount > this.maxRetries) {
        this.logger.error(`Can't connect to WebSocket.`)
        this.sse.send(JSON.stringify({ error: true }))
      } else {
        if (!this.secureToken) await this.refreshSecureToken()
        const caasWsUrl = this.api.buildCaaSUrl().split('?')[0].replace(/^http/, 'ws')
        const socketUrl = `${caasWsUrl}/_streams/crud?securetoken=${this.secureToken}`
        this.logger.info('ensureConnection', 'socket-url', socketUrl)
        this.retryCount++
        this.socket = new WebSocket(socketUrl)
        this.socket.onopen = this.onSocketOpen.bind(this)
        this.socket.onclose = this.onSocketClose.bind(this)
        this.socket.onerror = this.onSocketError.bind(this)
        this.socket.onmessage = this.onSocketMessage.bind(this)
      }
    }
  }

  onSocketOpen() {
    this.retryCount = 0
  }
  onSocketClose(event: WebSocket.CloseEvent) {
    if (!event.wasClean) {
      this.logger.info(`Socket closed (${event.code}).`, event.reason)
    }
    this.ensureConnection()
  }
  onSocketError(event: WebSocket.ErrorEvent) {
    this.logger.warn(`Socket error.`, event.message)
    setTimeout(() => this.ensureConnection(), this.reconnectionDelay)
  }
  onSocketMessage(event: WebSocket.MessageEvent) {
    this.sse.send(event.data.toString('utf-8'))
  }

  middleware(req: Request, res: Response, next: NextFunction) {
    this.ensureConnection()
    this.sse.init(req, res, next)
  }
}
