export enum LogLevel {
  NONE = -1,
  INFO = 0,
  LOG = 1,
  WARNING = 2,
  ERROR = 3
}
class Logger {
  logLevel: LogLevel

  constructor(logLevel: LogLevel) {
    this.logLevel = logLevel
  }

  info(...args: any[]) {
    if (this.logLevel >= LogLevel.INFO) console.info(...args)
  }

  log(...args: any[]) {
    if (this.logLevel >= LogLevel.LOG) console.log(...args)
  }

  warn(...args: any[]) {
    if (this.logLevel >= LogLevel.WARNING) console.warn(...args)
  }

  error(...args: any[]) {
    if (this.logLevel >= LogLevel.ERROR) console.error(...args)
  }
}
export default Logger
