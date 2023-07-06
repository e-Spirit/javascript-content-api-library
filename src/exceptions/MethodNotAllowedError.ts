import { HttpStatus } from '../enums'
import { HttpError } from './HttpError'

export class MethodNotAllowedError extends HttpError {
  constructor(message: string) {
    super(message, HttpStatus.METHOD_NOT_ALLOWED)
    this.name = 'MethodNotAllowedError'
  }
}
