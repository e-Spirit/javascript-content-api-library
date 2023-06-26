import { HttpStatus } from '../enums'
import { HttpException } from './HttpException'

export class UnauthorizedException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED)
    this.name = 'UnauthorizedException'
  }
}
