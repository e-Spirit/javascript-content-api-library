export enum LogLevel {
  INFO = 0,
  LOG = 1,
  WARNING = 2,
  ERROR = 3,
  NONE = 4
}

const formatOutput = (...args: any[]) => {
  if (typeof window !== 'undefined') return args
  return require('util').inspect(args, false, null, true)
}
export class Logger {
  logLevel: LogLevel

  constructor(logLevel: LogLevel) {
    this.logLevel = logLevel
  }

  info(...args: any[]) {
    if (this.logLevel <= LogLevel.INFO) console.info(formatOutput(...args))
  }

  log(...args: any[]) {
    if (this.logLevel <= LogLevel.LOG) console.log(formatOutput(...args))
  }

  warn(...args: any[]) {
    if (this.logLevel <= LogLevel.WARNING) console.warn(formatOutput(...args))
  }

  error(...args: any[]) {
    if (this.logLevel <= LogLevel.ERROR) console.error(formatOutput(...args))
  }
}
