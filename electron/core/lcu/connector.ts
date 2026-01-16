import { EventEmitter } from 'events'
import { exec, execSync, spawn } from 'child_process'
import { promisify } from 'util'
import { readFile } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { Logger } from '../../services/logger'
import type { LCUCredentials } from '../../../shared/types'

const execAsync = promisify(exec)

export class LCUConnector extends EventEmitter {
  private pollingInterval: NodeJS.Timeout | null = null
  private currentCredentials: LCUCredentials | null = null
  private isConnected = false
  private readonly POLL_INTERVAL = 2000 // 2秒轮询
  private installPath: string | null = null
  private tasklistPath: string | null = null
  
  constructor() {
    super()
    this.findTasklistPath()
  }
  
  private findTasklistPath(): void {
    // 查找tasklist可执行文件路径
    const paths = ['tasklist', 'C:\\Windows\\System32\\tasklist.exe']
    for (const p of paths) {
      try {
        execSync(`${p} /? >nul 2>&1`, { windowsHide: true })
        this.tasklistPath = p
        Logger.debug(`Found tasklist: ${p}`)
        break
      } catch {
        // 继续尝试下一个
      }
    }
  }
  
  start(): void {
    Logger.info('Starting LCU connector...')
    this.poll()
    this.pollingInterval = setInterval(() => this.poll(), this.POLL_INTERVAL)
  }
  
  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.isConnected = false
    this.currentCredentials = null
  }
  
  private async poll(): Promise<void> {
    try {
      // Skip if already connected - just verify connection is still alive
      if (this.isConnected && this.currentCredentials) {
        const stillAlive = await this.verifyConnection()
        if (!stillAlive) {
          this.isConnected = false
          this.currentCredentials = null
          Logger.info('LCU disconnected')
          this.emit('disconnected')
        }
        return
      }
      
      const credentials = await this.findLCUCredentials()
      
      if (credentials && !this.isConnected) {
        this.currentCredentials = credentials
        this.isConnected = true
        Logger.info(`LCU connected: port=${credentials.port}, pid=${credentials.pid}`)
        this.emit('connected', credentials)
      }
    } catch (error: any) {
      // Silent - don't spam logs
    }
  }
  
  private async verifyConnection(): Promise<boolean> {
    // Check if the LeagueClientUx process is still running
    const pid = await this.getLolClientPid()
    return pid > 0
  }
  
  private async findLCUCredentials(): Promise<LCUCredentials | null> {
    // 方法1: 使用tasklist获取PID，再用wmic获取命令行
    const pid = await this.getLolClientPid()
    if (pid > 0) {
      // 尝试通过wmic获取命令行参数
      const credentialsFromWmic = await this.getCredentialsByPid(pid)
      if (credentialsFromWmic) {
        return credentialsFromWmic
      }
    }
    
    // 方法2: 从日志文件获取 (权限不足时的备选方案)
    const credentialsFromLog = await this.getCredentialsFromLogFile()
    if (credentialsFromLog) {
      return credentialsFromLog
    }
    
    // 方法3: 从lockfile获取
    const credentialsFromLockfile = await this.getCredentialsFromLockfile()
    if (credentialsFromLockfile) {
      return credentialsFromLockfile
    }
    
    return null
  }
  
  private async getLolClientPid(): Promise<number> {
    if (!this.tasklistPath) {
      return this.getLolClientPidSlowly()
    }
    
    try {
      const { stdout } = await execAsync(
        `${this.tasklistPath} /FI "imagename eq LeagueClientUx.exe" /NH`,
        { encoding: 'utf8', windowsHide: true, timeout: 5000 }
      )
      
      if (stdout.includes('LeagueClientUx.exe')) {
        const match = stdout.match(/LeagueClientUx\.exe\s+(\d+)/)
        if (match) {
          return parseInt(match[1], 10)
        }
      }
      
      return 0
    } catch (error) {
      return this.getLolClientPidSlowly()
    }
  }
  
  private getLolClientPidSlowly(): number {
    try {
      const result = execSync(
        'powershell -Command "(Get-Process LeagueClientUx -ErrorAction SilentlyContinue | Select-Object -First 1).Id"',
        { encoding: 'utf8', windowsHide: true, timeout: 5000 }
      )
      const pid = parseInt(result.trim(), 10)
      return isNaN(pid) ? 0 : pid
    } catch {
      return 0
    }
  }
  
  private async getCredentialsByPid(pid: number): Promise<LCUCredentials | null> {
    try {
      const { stdout } = await execAsync(
        `wmic process where "ProcessId=${pid}" get CommandLine /format:list`,
        { encoding: 'utf8', windowsHide: true, timeout: 5000 }
      )
      
      if (stdout.includes('--app-port=')) {
        const portMatch = stdout.match(/--app-port=(\d+)/)
        const tokenMatch = stdout.match(/--remoting-auth-token=([\w_-]+)/)
        
        if (portMatch && tokenMatch) {
          const port = parseInt(portMatch[1], 10)
          const token = tokenMatch[1]
          
          Logger.info(`Got LCU credentials via wmic: port=${port}`)
          return { port, token, pid }
        }
      }
      
      return null
    } catch (error: any) {
      // wmic may not be available, try PowerShell silently
      return this.getCredentialsByPidViaPowerShell(pid)
    }
  }
  
  private async getCredentialsByPidViaPowerShell(pid: number): Promise<LCUCredentials | null> {
    try {
      const { stdout } = await execAsync(
        `powershell -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine"`,
        { encoding: 'utf8', windowsHide: true, timeout: 5000 }
      )
      
      if (stdout.includes('--app-port=')) {
        const portMatch = stdout.match(/--app-port=(\d+)/)
        const tokenMatch = stdout.match(/--remoting-auth-token=([\w_-]+)/)
        
        if (portMatch && tokenMatch) {
          const port = parseInt(portMatch[1], 10)
          const token = tokenMatch[1]
          
          Logger.info(`Got LCU credentials via PowerShell: port=${port}`)
          return { port, token, pid }
        }
      }
      
      return null
    } catch (error: any) {
      // Silent - will try other methods
      return null
    }
  }
  
  /**
   * 从LeagueClientUx日志文件中读取凭据
   */
  private async getCredentialsFromLogFile(): Promise<LCUCredentials | null> {
    const registryPath = this.getLoLPathFromRegistry()
    if (!registryPath) return null
    
    const logDir = join(registryPath, 'LeagueClient')
    if (!existsSync(logDir)) return null
    
    try {
      const files = readdirSync(logDir)
      const uxLogFiles = files
        .filter(f => f.includes('LeagueClientUx.log') && !f.includes('Helper'))
        .sort()
        .reverse()
      
      if (uxLogFiles.length === 0) return null
      
      const latestLog = join(logDir, uxLogFiles[0])
      const content = await readFile(latestLog, 'utf8')
      const lines = content.split('\n').slice(0, 20).join('\n')
      
      const portMatch = lines.match(/--app-port=(\d+)/)
      const tokenMatch = lines.match(/--remoting-auth-token=([\w_-]+)/)
      const pidMatch = uxLogFiles[0].match(/_(\d+)_LeagueClientUx/)
      
      if (portMatch && tokenMatch) {
        const port = parseInt(portMatch[1], 10)
        const token = tokenMatch[1]
        const pid = pidMatch ? parseInt(pidMatch[1], 10) : 0
        
        Logger.info(`Got LCU credentials via log file: port=${port}`)
        return { port, token, pid }
      }
    } catch (error: any) {
      // Silent
    }
    
    return null
  }
  
  private async getCredentialsFromLockfile(): Promise<LCUCredentials | null> {
    const registryPath = this.getLoLPathFromRegistry()
    if (registryPath) {
      const possibleSubPaths = [
        'lockfile',
        'LeagueClient/lockfile',
        'Game/lockfile',
      ]
      
      for (const subPath of possibleSubPaths) {
        const lockfilePath = join(registryPath, subPath)
        if (existsSync(lockfilePath)) {
          const credentials = await this.parseLockfile(lockfilePath)
          if (credentials) {
            return credentials
          }
        }
      }
    }
    
    const possiblePaths = [
      'C:/Riot Games/League of Legends/lockfile',
      'D:/Riot Games/League of Legends/lockfile',
      'E:/Riot Games/League of Legends/lockfile',
      'F:/Riot Games/League of Legends/lockfile',
      ...(this.installPath ? [
        join(this.installPath, 'lockfile'),
        join(this.installPath, 'LeagueClient/lockfile'),
      ] : []),
    ]
    
    for (const lockfilePath of possiblePaths) {
      try {
        if (existsSync(lockfilePath)) {
          const credentials = await this.parseLockfile(lockfilePath)
          if (credentials) {
            return credentials
          }
        }
      } catch {
        // Continue
      }
    }
    
    return null
  }
  
  private async parseLockfile(lockfilePath: string): Promise<LCUCredentials | null> {
    try {
      const content = await readFile(lockfilePath, 'utf8')
      const parts = content.split(':')
      
      if (parts.length >= 5) {
        const pid = parseInt(parts[1], 10)
        const port = parseInt(parts[2], 10)
        const token = parts[3]
        
        if (port > 0 && token) {
          Logger.info(`Got LCU credentials via lockfile: port=${port}`)
          this.installPath = lockfilePath.replace(/[/\\]lockfile$/, '')
          return { port, token, pid }
        }
      }
    } catch (error: any) {
      // Silent
    }
    
    return null
  }
  
  getCredentials(): LCUCredentials | null {
    return this.currentCredentials
  }
  
  getIsConnected(): boolean {
    return this.isConnected
  }
  
  getInstallPath(): string | null {
    return this.installPath
  }
  
  /**
   * 从Windows注册表获取国服LOL安装路径
   */
  private getLoLPathFromRegistry(): string | null {
    try {
      const result = execSync(
        'reg query "HKEY_CURRENT_USER\\SOFTWARE\\Tencent\\LOL" /v InstallPath 2>nul',
        { encoding: 'utf8', windowsHide: true, timeout: 3000 }
      )
      
      const match = result.match(/InstallPath\s+REG_SZ\s+(.+)/)
      if (match) {
        const installPath = match[1].trim()
        const gamePath = installPath.replace(/[/\\]TCLS$/i, '')
        return gamePath
      }
    } catch (error) {
      // Silent
    }
    
    return null
  }
}
