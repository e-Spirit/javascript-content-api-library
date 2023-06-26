import { HttpStatus } from '../enums'
import { HttpException } from './HttpException'

export class MethodNotAllowedException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.METHOD_NOT_ALLOWED)
    this.name = 'MethodNotAllowedException'
  }
}
