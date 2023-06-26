export class HttpException extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'HttpException'
    this.statusCode = statusCode
  }
}
