import { HttpStatus } from '../enums'
import { HttpException } from './HttpException'

/**
 * Defines an HTTP exception for *Request Timeout* type errors.
 */
export class RequestTimeoutException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.REQUEST_TIMEOUT)
    this.name = 'RequestTimeoutException'
  }
}
