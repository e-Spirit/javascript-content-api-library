import { HttpStatus } from '../enums'
import { HttpException } from './HttpException'

export class NotFoundException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND)
    this.name = 'NotFoundException'
  }
}
