import { HttpStatus } from '../enums'
import { HttpException } from './HttpException'

/**
 * Defines an HTTP exception for *Not Acceptable* type errors.
 */
export class NotAcceptableException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.NOT_ACCEPTABLE)
    this.name = 'NotAcceptableException'
  }
}
