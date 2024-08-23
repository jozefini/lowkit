'use server'

import { promises as fs } from 'node:fs'
import path from 'node:path'

type TLogType = 'dev' | 'api' | 'auth' | 'security'
type TLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'AUDIT' | 'ALERT'

export class Logger {
  private logBaseDir: string
  private badEnvError = 'Cannot create Crypto instance: must be server-side'

  constructor(options: { dist: string }) {
    if (typeof window !== 'undefined') {
      throw new Error(this.badEnvError)
    }
    this.logBaseDir = options.dist
  }

  private getTodayDateForFileName(): string {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code !== 'EEXIST')
        throw err
    }
  }

  private async log<T>(
    message: T,
    level: TLogLevel = 'INFO',
    context: TLogType = 'dev'
  ): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error(this.badEnvError)
    }
    const logMessage =
      typeof message === 'string' ? message : JSON.stringify(message)

    const timestamp = new Date().toISOString()
    const logEntry = `${timestamp} [${level}] ${logMessage}\n`

    const contextDir = path.join(this.logBaseDir, context)
    await this.ensureDir(contextDir)

    const logFileName = `${context}-${this.getTodayDateForFileName()}.log`
    const logFilePath = path.join(contextDir, logFileName)

    try {
      await fs.appendFile(logFilePath, logEntry)
      console.log(`${timestamp} [${level}] [${context}] ${logMessage}`)
    } catch (err) {
      console.error('Failed to write to log file:', err)
    }
  }

  info<T>(message: T, context?: TLogType) {
    this.log(message, 'INFO', context)
  }

  warn<T>(message: T, context?: TLogType) {
    this.log(message, 'WARN', context)
  }

  error<T>(message: T, context?: TLogType) {
    this.log(message, 'ERROR', context)
  }

  audit<T>(message: T, context?: TLogType) {
    this.log(message, 'AUDIT', context)
  }

  alert<T>(message: T, context?: TLogType) {
    this.log(message, 'ALERT', context)
  }

  async readLog(
    context: TLogType,
    date: string = this.getTodayDateForFileName()
  ): Promise<string> {
    if (typeof window !== 'undefined') {
      throw new Error(this.badEnvError)
    }

    const logFilePath = path.join(
      this.logBaseDir,
      context,
      `${context}-${date}.log`
    )
    try {
      return await fs.readFile(logFilePath, 'utf8')
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        return `No log file found for context '${context}' on ${date}`
      }
      throw err
    }
  }

  async readLastLines(
    context: TLogType,
    n = 10,
    date: string = this.getTodayDateForFileName()
  ): Promise<string> {
    if (typeof window !== 'undefined') {
      throw new Error(this.badEnvError)
    }

    const logContent = await this.readLog(context, date)
    const lines = logContent.trim().split('\n')
    return lines.slice(-n).join('\n')
  }
}
