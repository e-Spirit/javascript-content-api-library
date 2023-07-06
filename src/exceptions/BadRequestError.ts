import { HttpStatus } from '../enums'
import { HttpError } from './HttpError'

/**
 * Defines an HTTP Error for *Bad Request* type errors.
 */
export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST)
    this.name = 'BadRequestError'
  }
}
