import { Channel, createChannel, createSession } from 'better-sse'
import { FSXARemoteApi, Logger } from './'
import ReconnectingWebSocket, { Options, ErrorEvent } from 'reconnecting-websocket'
import WebSocket from 'ws'
import { ConnectEventStreamParams, LogLevel } from '..'
import { Request, Response } from 'express'

type SocketUrl = () => Promise<string>

class CaaSEventStream {
  logger: Logger
  createSocketUrl: SocketUrl
  channel: Channel
  socket: ReconnectingWebSocket

  constructor(logger: Logger, createSocketUrl: SocketUrl, options: Options = {}) {
    this.logger = logger
    this.createSocketUrl = createSocketUrl

    this.channel = createChannel()
    this.channel.on('session-registered', () => this.onCheckState())
    this.channel.on('session-deregistered', () => this.onCheckState())

    this.socket = new ReconnectingWebSocket(
      this.createSocketUrl.bind(this),
      [],
      Object.assign({ WebSocket, startClosed: true }, options)
    )
    this.socket.onmessage = this.onSocketMessage.bind(this)

    this.socket.onerror = (event: ErrorEvent) => {
      this.logger.warn('onSocketError', 'error', event.message)
    }

    this.logger.info('initilized')
  }

  onCheckState() {
    const hasSessions = this.channel.activeSessions.length > 0
    const isSocketOpenOrConnecting =
      this.socket.readyState === ReconnectingWebSocket.OPEN ||
      this.socket.readyState === ReconnectingWebSocket.CONNECTING

    this.logger.info('onCheckState', 'activeSessions', this.channel.activeSessions.length)

    if (hasSessions && !isSocketOpenOrConnecting) {
      this.socket.reconnect()
    } else if (!hasSessions && isSocketOpenOrConnecting) {
      this.socket.close()
    }
  }

  onSocketMessage(event: MessageEvent) {
    const jsonStringMessage = event.data.toString('utf-8')
    this.logger.info('onSocketMessage', 'broadcast', jsonStringMessage)
    this.channel.broadcast(jsonStringMessage)
  }

  addSession(req: Request, res: Response) {
    const serializer = (data: any) => (typeof data === 'string' ? data : JSON.stringify(data))
    createSession(req, res, { serializer }).then((session) => this.channel.register(session))
  }
}

const streams: Record<string, CaaSEventStream> = {}

export type CaaSEventStreamOptions = Options &
  ConnectEventStreamParams & {
    api: FSXARemoteApi
    logger?: Logger
    logLevel?: LogLevel
  }

export const bindCaaSEventStream = (
  req: Request,
  res: Response,
  options: CaaSEventStreamOptions
) => {
  const { api, remoteProject, additionalParams } = options
  const caasUrl = api.buildCaaSUrl({ remoteProject, additionalParams }).split('?')[0]

  if (!(caasUrl in streams)) {
    const logger = options.logger || new Logger(options.logLevel || api.logLevel, 'CaaSEventStream')
    const createSocketUrl = async () => {
      const token = await api.fetchSecureToken()
      const socketUrl = `${caasUrl.replace(/^http/, 'ws')}/_streams/crud?securetoken=${token}`
      logger.info('createSocketUrl', 'socketUrl', socketUrl)
      return socketUrl
    }
    streams[caasUrl] = new CaaSEventStream(logger, createSocketUrl, options)
  }

  streams[caasUrl].addSession(req, res)
}
