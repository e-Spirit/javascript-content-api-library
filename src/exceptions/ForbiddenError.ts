import { HttpStatus } from '../enums'
import { HttpError } from './HttpError'

/**
 * Defines an HTTP Error for *Forbidden* type errors.
 */
export class ForbiddenError extends HttpError {
  constructor(message: string) {
    super(message, HttpStatus.FORBIDDEN)
    this.name = 'ForbiddenError'
  }
}
