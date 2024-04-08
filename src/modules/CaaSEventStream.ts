import { Channel, createChannel, createSession } from 'better-sse'
import { FSXARemoteApi, Logger } from './'
import ReconnectingWebSocket, {
  Options,
  ErrorEvent,
} from 'reconnecting-websocket'
import WebSocket from 'ws'
import { Request, Response } from 'express'
import { LoggerChalked } from './LoggerChalked'

type SocketUrl = () => Promise<string>

/**
 * The CaaSEventStream is used for a unique (per project) CaaS change event websocket and delegates (channel broadcast)
 * any incoming events to any registered event-stream (session)
 */
class CaaSEventStream {
  private logger: Logger
  createSocketUrl: SocketUrl
  channel: Channel
  socket: ReconnectingWebSocket

  constructor(
    logger: Logger,
    createSocketUrl: SocketUrl,
    options: Options = {}
  ) {
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

  // on any session (de)registration, close or (re)open then websocket
  onCheckState() {
    const hasSessions = this.channel.activeSessions.length > 0
    const isSocketOpenOrConnecting =
      this.socket.readyState === ReconnectingWebSocket.OPEN ||
      this.socket.readyState === ReconnectingWebSocket.CONNECTING

    this.logger.info(
      'onCheckState',
      'activeSessions',
      this.channel.activeSessions.length
    )

    if (hasSessions && !isSocketOpenOrConnecting) {
      this.socket.reconnect()
    } else if (!hasSessions && isSocketOpenOrConnecting) {
      this.socket.close()
    }
  }

  // receive websocket message and broadcast to all open event-streams
  onSocketMessage(event: MessageEvent) {
    const jsonStringMessage = event.data.toString('utf-8')
    this.logger.info('onSocketMessage', 'broadcast', jsonStringMessage)
    this.channel.broadcast(jsonStringMessage)
  }

  // add a new event-stream (session)
  addSession(req: Request, res: Response) {
    const serializer = (data: any) =>
      typeof data === 'string' ? data : JSON.stringify(data)
    createSession(req, res, { serializer }).then((session) =>
      this.channel.register(session)
    )
  }
}

const streams: Record<string, CaaSEventStream> = {}

export const eventStreamHandler = (api: FSXARemoteApi) => {
  return async (req: Request, res: Response) => {
    const logger = new LoggerChalked(api.logLevel, 'CaaSEventStream')
    logger.info('requesting route: ', req.url, req.query)

    let remoteProject
    if ('remoteProject' in req.query) {
      remoteProject = `${req.query.remoteProject}`
    }
    const caasUrl = api.buildCaaSUrl({ remoteProject }).split('?')[0]

    // ensure to have only one socket connection per caasUrl
    if (!(caasUrl in streams)) {
      const createSocketUrl = async () => {
        const token = await api.fetchSecureToken()
        const socketUrl = `${caasUrl.replace(
          /^http/,
          'ws'
        )}/_streams/crud?securetoken=${token}`
        logger.info('createSocketUrl', 'socketUrl', socketUrl)
        return socketUrl
      }
      streams[caasUrl] = new CaaSEventStream(logger, createSocketUrl)
    }

    // add this connection to a pool (channel) of listeners for the websocket events
    streams[caasUrl].addSession(req, res)
  }
}
