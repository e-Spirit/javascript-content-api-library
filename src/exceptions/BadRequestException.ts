import { HttpStatus } from '../enums'
import { HttpException } from './HttpException'

/**
 * Defines an HTTP exception for *Bad Request* type errors.
 */
export class BadRequestException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST)
    this.name = 'BadRequestException'
  }
}
