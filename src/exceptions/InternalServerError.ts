import { HttpStatus } from '../enums'
import { HttpError } from './HttpError'

export class InternalServerError extends HttpError {
  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR)
    this.name = 'InternalServerError'
  }
}
