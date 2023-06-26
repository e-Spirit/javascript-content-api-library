import { HttpStatus } from '../enums'
import { HttpException } from './HttpException'

export class InternalServerErrorException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR)
    this.name = 'InternalServerErrorException'
  }
}
