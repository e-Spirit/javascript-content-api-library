import { HttpStatus } from '../enums'
import { HttpException } from './HttpException'

/**
 * Defines an HTTP exception for *Forbidden* type errors.
 */
export class ForbiddenException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.FORBIDDEN)
    this.name = 'ForbiddenException'
  }
}
