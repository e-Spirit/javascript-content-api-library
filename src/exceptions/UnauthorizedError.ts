import { HttpStatus } from '../enums'
import { HttpError } from './HttpError'

export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED)
    this.name = 'UnauthorizedError'
  }
}
