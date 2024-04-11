import chalk from 'chalk'
import { LogLevel, Logger } from './Logger'

/**
 * Provides Coloring of Logs via Chalk package.
 * split from Logger because of Bundle Optimization.
 * Usage on client side increases Bundle Size by ~20KB
 */
export class LoggerChalked extends Logger {
  constructor(logLevel: LogLevel, name: string) {
    super(logLevel, name, chalk)
  }
}
