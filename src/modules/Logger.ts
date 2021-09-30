import chalk from 'chalk'
import { inspect } from 'util'

export enum LogLevel {
  INFO = 0,
  LOG = 1,
  WARNING = 2,
  ERROR = 3,
  NONE = 4,
}

const formatOutput = (...args: any[]) => {
  args = args.map((entry) => {
    if (typeof entry === 'object') return JSON.stringify(entry)
    return entry
  })
  return inspect(args.join(' | '), {
    showHidden: false,
    depth: null,
    colors: false,
    compact: true,
    breakLength: Infinity,
  }).replace(/\'/g, '')
}
export class Logger {
  private _logLevel: LogLevel
  private _name: string

  constructor(logLevel: LogLevel, name: string) {
    this._logLevel = logLevel
    this._name = name
  }

  info(...args: any[]) {
    if (this._logLevel <= LogLevel.INFO) {
      console.info(
        chalk.gray(`${chalk.bgWhite.black(' INFO ')} ${this._name} | ${formatOutput(...args)}`)
      )
    }
  }

  log(...args: any[]) {
    if (this._logLevel <= LogLevel.LOG) {
      console.log(
        chalk.blue(`${chalk.bgBlue.white(' LOG ')} ${this._name} | ${formatOutput(...args)}`)
      )
    }
  }

  warn(...args: any[]) {
    if (this._logLevel <= LogLevel.WARNING) {
      console.warn(
        chalk.yellow(`${chalk.bgYellow.black(' WARN ')} ${this._name} | ${formatOutput(...args)}`)
      )
    }
  }

  error(...args: any[]) {
    if (this._logLevel <= LogLevel.ERROR) {
      console.error(
        chalk.red(`${chalk.bgRed.black(' ERROR ')} ${this._name} | ${formatOutput(...args)}`)
      )
    }
  }
}
