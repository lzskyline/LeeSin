import { EventEmitter } from 'events'
import { BrowserWindow } from 'electron'
import { LCUClient } from '../lcu/client'
import { LCUWebSocket } from '../lcu/websocket'
import { ConfigService } from '../../services/config'
import { OPGGClient } from '../data/opgg-client'
import { StaticDataManager } from '../data/static-data'
import { AutoAccept } from '../automation/auto-accept'
import { AutoBP } from '../automation/auto-bp'
import { AutoRune } from '../automation/auto-rune'
import { AutoSpell } from '../automation/auto-spell'
import { Logger } from '../../services/logger'
import { GAME_FLOW_PHASES, QUEUE_MODE_MAP } from '../../../shared/constants'
import type { GameFlowPhase, ChampSelectSession } from '../../../shared/types'

export class GameFlowMonitor extends EventEmitter {
  private lcuClient: LCUClient
  private lcuWebSocket: LCUWebSocket
  private configService: ConfigService
  private opggClient: OPGGClient
  private staticDataManager: StaticDataManager
  
  private currentPhase: GameFlowPhase = 'None'
  private currentSession: ChampSelectSession | null = null
  private lastChampionId: number = 0
  private timerInterval: NodeJS.Timeout | null = null
  private currentQueueId: number = 0
  private currentGameMode: string = 'ranked'
  
  // 计时器动态计算相关
  private phaseStartTime: number = 0
  private phaseInitialRemaining: number = 0
  private currentTimerPhase: string = ''
  
  // 自动化模块
  private autoAccept: AutoAccept
  private autoBP: AutoBP
  private autoRune: AutoRune
  private autoSpell: AutoSpell
  
  constructor(
    lcuClient: LCUClient,
    lcuWebSocket: LCUWebSocket,
    configService: ConfigService,
    opggClient: OPGGClient,
    staticDataManager: StaticDataManager
  ) {
    super()
    this.lcuClient = lcuClient
    this.lcuWebSocket = lcuWebSocket
    this.configService = configService
    this.opggClient = opggClient
    this.staticDataManager = staticDataManager
    
    // 初始化自动化模块
    this.autoAccept = new AutoAccept(lcuClient, configService)
    this.autoBP = new AutoBP(lcuClient, configService, staticDataManager)
    this.autoRune = new AutoRune(lcuClient, opggClient, configService)
    this.autoSpell = new AutoSpell(lcuClient, opggClient, configService)
  }
  
  start(): void {
    Logger.info('Starting gameflow monitor...')
    
    // 监听WebSocket事件
    this.lcuWebSocket.on('gameflow-phase', this.handlePhaseChange.bind(this))
    this.lcuWebSocket.on('champselect-session', this.handleChampSelectSession.bind(this))
    this.lcuWebSocket.on('champselect-session-end', this.handleChampSelectEnd.bind(this))
    this.lcuWebSocket.on('current-champion', this.handleCurrentChampion.bind(this))
    
    // 初始获取当前状态
    this.fetchCurrentPhase()
  }
  
  stop(): void {
    Logger.info('Stopping gameflow monitor')
    
    this.lcuWebSocket.removeAllListeners('gameflow-phase')
    this.lcuWebSocket.removeAllListeners('champselect-session')
    this.lcuWebSocket.removeAllListeners('champselect-session-end')
    this.lcuWebSocket.removeAllListeners('current-champion')
    
    this.stopTimerBroadcast()
  }
  
  private async fetchCurrentPhase(): Promise<void> {
    try {
      const phase = await this.lcuClient.getGameFlowPhase()
      this.handlePhaseChange(phase)
    } catch (error) {
      Logger.error('Failed to get gameflow phase', error)
    }
  }
  
  private handlePhaseChange(phase: GameFlowPhase): void {
    if (phase === this.currentPhase) return
    
    const previousPhase = this.currentPhase
    this.currentPhase = phase
    
    Logger.info(`Gameflow phase changed: ${previousPhase} -> ${phase}`)
    
    // 发送IPC事件
    this.broadcastToRenderer('gameflow:phase-changed', { 
      phase, 
      timestamp: Date.now() 
    })
    
    // 根据状态触发对应处理器
    switch (phase) {
      case GAME_FLOW_PHASES.READY_CHECK:
        this.handleReadyCheck()
        break
      case GAME_FLOW_PHASES.CHAMP_SELECT:
        this.handleChampSelectStart()
        break
      case GAME_FLOW_PHASES.IN_PROGRESS:
      case GAME_FLOW_PHASES.NONE:
        this.handleChampSelectEnd()
        break
    }
  }
  
  private async handleReadyCheck(): Promise<void> {
    Logger.info('Ready check detected...')
    
    const result = await this.autoAccept.execute()
    
    this.broadcastToRenderer('automation:action-executed', {
      action: 'auto-accept',
      success: result.success,
      message: result.message,
    })
  }
  
  private async handleChampSelectStart(): Promise<void> {
    Logger.info('Entering champion select...')
    
    // 检测游戏模式
    await this.detectGameMode()
    
    // 尝试获取session
    try {
      const session = await this.lcuClient.getChampSelectSession()
      this.handleChampSelectSession(session)
    } catch (error) {
      Logger.error('Failed to get champ select session', error)
    }
  }
  
  /**
   * 检测当前游戏模式
   */
  private async detectGameMode(): Promise<void> {
    try {
      const gameflow = await this.lcuClient.get<any>('/lol-gameflow/v1/session')
      if (gameflow?.gameData?.queue?.id) {
        this.currentQueueId = gameflow.gameData.queue.id
        this.currentGameMode = QUEUE_MODE_MAP[this.currentQueueId] || 'ranked'
        Logger.info(`Detected game mode: ${this.currentGameMode} (queue: ${this.currentQueueId})`)
      }
    } catch (error) {
      Logger.error('Failed to detect game mode', error)
      this.currentGameMode = 'ranked'
    }
  }
  
  private handleChampSelectSession(session: ChampSelectSession): void {
    this.currentSession = session
    
    // 根据 session 信息更新游戏模式
    // benchEnabled 表示 ARAM 相关模式
    if (session.benchEnabled) {
      // 通过 queueId 区分普通 ARAM (450) 和 ARAM Mayhem (2400)
      if (this.currentQueueId === 2400) {
        this.currentGameMode = 'aram-mayhem'
      } else {
        this.currentGameMode = 'aram'
      }
    } else if (session.myTeam?.length === 2) {
      // 2人队伍是竞技场模式
      this.currentGameMode = 'arena'
    }
    
    Logger.debug(`Game mode determined: ${this.currentGameMode}`)
    
    // 更新计时器基准值 - 当阶段变化时重置计时器
    const timer = session.timer
    if (timer.phase !== this.currentTimerPhase) {
      this.currentTimerPhase = timer.phase
      this.phaseStartTime = Date.now()
      this.phaseInitialRemaining = Math.max(0, Math.floor(timer.adjustedTimeLeftInPhase / 1000))
    }
    
    // 广播session更新
    this.broadcastToRenderer('champselect:session-updated', session)
    
    // 启动计时器广播
    this.startTimerBroadcast()
    
    // 执行自动BP
    this.executeAutoBP(session)
  }
  
  private handleChampSelectEnd(): void {
    Logger.info('Champion select ended')
    
    this.currentSession = null
    this.lastChampionId = 0
    this.currentQueueId = 0
    this.currentGameMode = 'ranked'
    this.phaseStartTime = 0
    this.phaseInitialRemaining = 0
    this.currentTimerPhase = ''
    this.stopTimerBroadcast()
  }
  
  private async executeAutoBP(session: ChampSelectSession): Promise<void> {
    const result = await this.autoBP.execute(session)
    
    if (result.executed) {
      this.broadcastToRenderer('automation:action-executed', {
        action: result.type === 'pick' ? 'auto-pick' : 'auto-ban',
        success: result.success,
        message: result.message,
      })
    }
  }
  
  private async handleCurrentChampion(championId: number): Promise<void> {
    if (championId <= 0) return
    
    Logger.info(`Current champion changed: ${championId}`)
    
    // 获取位置
    const position = this.getCurrentPosition()
    
    // 执行自动符文
    const runeResult = await this.autoRune.execute(championId, position)
    if (runeResult.executed) {
      this.broadcastToRenderer('automation:action-executed', {
        action: 'auto-rune',
        success: runeResult.success,
        message: runeResult.message,
      })
    }
    
    // 执行自动召唤师技能
    const spellResult = await this.autoSpell.execute(championId, position)
    if (spellResult.executed) {
      this.broadcastToRenderer('automation:action-executed', {
        action: 'auto-spell',
        success: spellResult.success,
        message: spellResult.message,
      })
    }
  }
  
  private getCurrentPosition(): string {
    if (!this.currentSession) return 'mid'
    
    const myMember = this.currentSession.myTeam.find(
      p => p.cellId === this.currentSession!.localPlayerCellId
    )
    
    return myMember?.assignedPosition || 'mid'
  }
  
  private startTimerBroadcast(): void {
    this.stopTimerBroadcast()
    
    // 使用100ms间隔更新，避免慢一秒的问题
    this.timerInterval = setInterval(() => {
      if (this.currentSession && this.phaseStartTime > 0) {
        // 动态计算剩余时间：初始剩余时间 - 已经过的时间
        // 增加500ms的补偿，让Math.floor向下取整时更接近实际秒数，避免显示慢一秒
        const elapsedSeconds = Math.floor((Date.now() - this.phaseStartTime + 500) / 1000)
        const remaining = Math.max(0, this.phaseInitialRemaining - elapsedSeconds)
        
        this.broadcastToRenderer('champselect:timer-tick', {
          remaining,
          phase: this.currentTimerPhase,
        })
      }
    }, 100)
  }
  
  private stopTimerBroadcast(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }
  
  private broadcastToRenderer(channel: string, data: any): void {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      window.webContents.send(channel, data)
    })
  }
  
  // 公开方法
  getCurrentPhase(): GameFlowPhase {
    return this.currentPhase
  }
  
  getCurrentSession(): ChampSelectSession | null {
    return this.currentSession
  }
  
  getCurrentGameMode(): string {
    return this.currentGameMode
  }
  
  getCurrentQueueId(): number {
    return this.currentQueueId
  }
}
