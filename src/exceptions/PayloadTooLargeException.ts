import { HttpStatus } from '../enums'
import { HttpException } from './HttpException'

export class PayloadTooLargeException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.PAYLOAD_TOO_LARGE)
    this.name = 'PayloadTooLargeException'
  }
}
