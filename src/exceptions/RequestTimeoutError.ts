import { HttpStatus } from '../enums'
import { HttpError } from './HttpError'

/**
 * Defines an HTTP Error for *Request Timeout* type errors.
 */
export class RequestTimeoutError extends HttpError {
  constructor(message: string) {
    super(message, HttpStatus.REQUEST_TIMEOUT)
    this.name = 'RequestTimeoutError'
  }
}
