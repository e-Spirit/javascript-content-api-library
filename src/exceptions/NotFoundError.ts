import { HttpStatus } from '../enums'
import { HttpError } from './HttpError'

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND)
    this.name = 'NotFoundError'
  }
}
