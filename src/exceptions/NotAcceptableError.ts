import { HttpStatus } from '../enums'
import { HttpError } from './HttpError'

/**
 * Defines an HTTP Error for *Not Acceptable* type errors.
 */
export class NotAcceptableError extends HttpError {
  constructor(message: string) {
    super(message, HttpStatus.NOT_ACCEPTABLE)
    this.name = 'NotAcceptableError'
  }
}
