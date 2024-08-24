'server only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

type TLogType = 'dev' | 'api' | 'auth' | 'security'
type TLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'AUDIT' | 'ALERT'

export function createLogger(options: { dist: string }) {
  const badEnvError = 'Cannot create Logger instance: must be server-side'
  const logBaseDir = options.dist

  if (typeof window !== 'undefined') {
    throw new Error(badEnvError)
  }

  function getTodayDateForFileName(): string {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  async function ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code !== 'EEXIST')
        throw err
    }
  }

  async function log<T>(
    message: T,
    level: TLogLevel = 'INFO',
    context: TLogType = 'dev'
  ): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error(badEnvError)
    }
    const logMessage =
      typeof message === 'string' ? message : JSON.stringify(message)

    const timestamp = new Date().toISOString()
    const logEntry = `${timestamp} [${level}] ${logMessage}\n`

    const contextDir = path.join(logBaseDir, context)
    await ensureDir(contextDir)

    const logFileName = `${context}-${getTodayDateForFileName()}.log`
    const logFilePath = path.join(contextDir, logFileName)

    try {
      await fs.appendFile(logFilePath, logEntry)
      console.log(`${timestamp} [${level}] [${context}] ${logMessage}`)
    } catch (err) {
      console.error('Failed to write to log file:', err)
    }
  }

  function info<T>(message: T, context?: TLogType) {
    log(message, 'INFO', context)
  }

  function warn<T>(message: T, context?: TLogType) {
    log(message, 'WARN', context)
  }

  function error<T>(message: T, context?: TLogType) {
    log(message, 'ERROR', context)
  }

  function audit<T>(message: T, context?: TLogType) {
    log(message, 'AUDIT', context)
  }

  function alert<T>(message: T, context?: TLogType) {
    log(message, 'ALERT', context)
  }

  async function readLog(
    context: TLogType,
    date: string = getTodayDateForFileName()
  ): Promise<string> {
    if (typeof window !== 'undefined') {
      throw new Error(badEnvError)
    }

    const logFilePath = path.join(logBaseDir, context, `${context}-${date}.log`)
    try {
      return await fs.readFile(logFilePath, 'utf8')
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        return `No log file found for context '${context}' on ${date}`
      }
      throw err
    }
  }

  async function readLastLines(
    context: TLogType,
    n = 10,
    date: string = getTodayDateForFileName()
  ): Promise<string> {
    if (typeof window !== 'undefined') {
      throw new Error(badEnvError)
    }

    const logContent = await readLog(context, date)
    const lines = logContent.trim().split('\n')
    return lines.slice(-n).join('\n')
  }

  return {
    info,
    warn,
    error,
    audit,
    alert,
    readLog,
    readLastLines,
  }
}
