

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class LoggerClass {
  // 禁用debug日志以减少输出
  private showDebug = false
  
  constructor() {
    // Windows 控制台 UTF-8 编码支持
    if (process.platform === 'win32') {
      // 设置stdout/stderr编码
      if (process.stdout && typeof (process.stdout as any).setEncoding === 'function') {
        (process.stdout as any).setEncoding('utf8')
      }
      if (process.stderr && typeof (process.stderr as any).setEncoding === 'function') {
        (process.stderr as any).setEncoding('utf8')
      }
    }
  }
  
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    const argsStr = args.length > 0 ? ' ' + args.map(a => 
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' ') : ''
    return `${prefix} ${message}${argsStr}`
  }
  
  private log(level: LogLevel, message: string, ...args: any[]): void {
    const formattedMessage = this.formatMessage(level, message, ...args)
    
    switch (level) {
      case 'debug':
        if (this.showDebug) {
          process.stdout.write(formattedMessage + '\n')
        }
        break
      case 'info':
        process.stdout.write(formattedMessage + '\n')
        break
      case 'warn':
        process.stderr.write(formattedMessage + '\n')
        break
      case 'error':
        process.stderr.write(formattedMessage + '\n')
        break
    }
  }
  
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args)
  }
  
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args)
  }
  
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args)
  }
  
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args)
  }
}

export const Logger = new LoggerClass()
