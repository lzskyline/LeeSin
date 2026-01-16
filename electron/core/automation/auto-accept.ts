import { LCUClient } from '../lcu/client'
import { ConfigService } from '../../services/config'
import { Logger } from '../../services/logger'

export interface AutoActionResult {
  executed: boolean
  success: boolean
  message?: string
}

export class AutoAccept {
  private lcuClient: LCUClient
  private configService: ConfigService
  private isExecuting = false
  
  constructor(lcuClient: LCUClient, configService: ConfigService) {
    this.lcuClient = lcuClient
    this.configService = configService
  }
  
  async execute(): Promise<AutoActionResult> {
    const settings = this.configService.getSettings()
    
    if (!settings.autoAccept) {
      return { executed: false, success: false, message: 'Auto-accept disabled' }
    }
    
    if (this.isExecuting) {
      return { executed: false, success: false, message: 'Already executing' }
    }
    
    this.isExecuting = true
    
    try {
      // 检查是否需要自动接受（排除训练模式和自定义房间）
      const queueId = await this.getCurrentQueueId()
      if (!this.shouldAutoAccept(queueId)) {
        return { executed: false, success: false, message: 'Auto-accept not needed for this mode' }
      }
      
      // 延迟以模拟人类行为
      const delay = settings.autoAcceptDelay || 500
      await this.sleep(delay)
      
      // 接受对局
      await this.lcuClient.acceptReadyCheck()
      
      Logger.info('Auto-accept successful')
      return { executed: true, success: true, message: 'Match accepted' }
    } catch (error: any) {
      // 优化错误提示
      let errorMessage = error.message
      if (error.message?.includes('status code 500')) {
        errorMessage = 'Accept window expired or already accepted'
      } else if (error.message?.includes('status code 404')) {
        errorMessage = 'No accept window available'
      }
      
      Logger.warn(`Auto-accept failed: ${errorMessage}`)
      return { executed: true, success: false, message: errorMessage }
    } finally {
      this.isExecuting = false
    }
  }
  
  private async getCurrentQueueId(): Promise<number> {
    try {
      const gameflow = await this.lcuClient.get<any>('/lol-gameflow/v1/session')
      return gameflow?.gameData?.queue?.id || 0
    } catch {
      return 0
    }
  }
  
  private shouldAutoAccept(queueId: number): boolean {
    // 训练模式 (2000) 和自定义游戏 (0) 不需要自动接受
    const skipQueueIds = [0, 2000]
    return !skipQueueIds.includes(queueId)
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
