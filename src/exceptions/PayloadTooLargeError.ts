import { HttpStatus } from '../enums'
import { HttpError } from './HttpError'

export class PayloadTooLargeError extends HttpError {
  constructor(message: string) {
    super(message, HttpStatus.PAYLOAD_TOO_LARGE)
    this.name = 'PayloadTooLargeError'
  }
}
