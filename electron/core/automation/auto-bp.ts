import { LCUClient } from '../lcu/client'
import { ConfigService } from '../../services/config'
import { StaticDataManager } from '../data/static-data'
import { Logger } from '../../services/logger'
import type { ChampSelectSession, ChampSelectAction } from '../../../shared/types'

export interface AutoBPResult {
  executed: boolean
  success: boolean
  type?: 'pick' | 'ban'
  championId?: number
  message?: string
}

export class AutoBP {
  private lcuClient: LCUClient
  private configService: ConfigService
  private staticDataManager: StaticDataManager
  private executedActions: Set<number> = new Set()
  
  constructor(
    lcuClient: LCUClient, 
    configService: ConfigService,
    staticDataManager: StaticDataManager
  ) {
    this.lcuClient = lcuClient
    this.configService = configService
    this.staticDataManager = staticDataManager
  }
  
  async execute(session: ChampSelectSession): Promise<AutoBPResult> {
    const settings = this.configService.getSettings()
    
    if (!settings.autoBP) {
      return { executed: false, success: false, message: 'Auto-BP disabled' }
    }
    
    // 找到本地玩家的未完成action
    const myAction = this.findMyPendingAction(session)
    
    if (!myAction) {
      return { executed: false, success: false, message: 'No pending action' }
    }
    
    // 防止重复执行同一个action
    if (this.executedActions.has(myAction.id)) {
      return { executed: false, success: false, message: 'Action already executed' }
    }
    
    // 选择英雄
    const championId = await this.selectChampion(session, myAction)
    if (!championId) {
      return { executed: false, success: false, message: 'No champion available' }
    }
    
    try {
      // 标记为已执行
      this.executedActions.add(myAction.id)
      
      // 执行action
      await this.lcuClient.executeAction(myAction.id, championId, myAction.type, true)
      
      const champion = this.staticDataManager.getChampionById(championId)
      const championName = champion?.name || `ID:${championId}`
      
      Logger.info(`Auto-${myAction.type}: ${championName}`)
      
      return {
        executed: true,
        success: true,
        type: myAction.type,
        championId,
        message: `${myAction.type === 'pick' ? 'Picked' : 'Banned'} ${championName}`,
      }
    } catch (error: any) {
      // 失败时移除标记，允许重试
      this.executedActions.delete(myAction.id)
      
      Logger.error('Auto-BP failed', error)
      return {
        executed: true,
        success: false,
        type: myAction.type,
        message: error.message,
      }
    }
  }
  
  private findMyPendingAction(session: ChampSelectSession): ChampSelectAction | null {
    const localCellId = session.localPlayerCellId
    
    // 遍历所有action回合
    for (const round of session.actions) {
      for (const action of round) {
        // 找到本地玩家的、未完成的、正在进行的action
        if (
          action.actorCellId === localCellId &&
          !action.completed &&
          action.isInProgress &&
          (action.type === 'pick' || action.type === 'ban')
        ) {
          return action
        }
      }
    }
    
    return null
  }
  
  private async selectChampion(
    session: ChampSelectSession, 
    action: ChampSelectAction
  ): Promise<number | null> {
    const settings = this.configService.getSettings()
    
    // 获取已被禁用/选择的英雄
    const unavailableChampions = this.getUnavailableChampions(session)
    
    if (action.type === 'ban') {
      // 禁用模式：从预设的禁用列表中选择
      const bannedList = settings.bannedChampions || []
      
      for (const championId of bannedList) {
        if (!unavailableChampions.has(championId)) {
          return championId
        }
      }
      
      // 如果没有预设，返回null（不自动禁用）
      return null
    } else {
      // 选择模式：从预设的首选列表中选择
      const position = this.getMyPosition(session)
      const preferredList = settings.preferredChampions[position] || []
      
      for (const championId of preferredList) {
        if (!unavailableChampions.has(championId)) {
          return championId
        }
      }
      
      // 如果没有预设，返回null（不自动选择）
      return null
    }
  }
  
  private getUnavailableChampions(session: ChampSelectSession): Set<number> {
    const unavailable = new Set<number>()
    
    // 已禁用的英雄
    session.bans.myTeamBans.forEach(id => id > 0 && unavailable.add(id))
    session.bans.theirTeamBans.forEach(id => id > 0 && unavailable.add(id))
    
    // 已选择的英雄
    session.myTeam.forEach(p => p.championId > 0 && unavailable.add(p.championId))
    session.theirTeam.forEach(p => p.championId > 0 && unavailable.add(p.championId))
    
    // 正在被选择的英雄（其他玩家意图）
    session.myTeam.forEach(p => p.championPickIntent > 0 && unavailable.add(p.championPickIntent))
    
    return unavailable
  }
  
  private getMyPosition(session: ChampSelectSession): string {
    const myMember = session.myTeam.find(p => p.cellId === session.localPlayerCellId)
    return myMember?.assignedPosition?.toLowerCase() || 'mid'
  }
  
  // 重置执行记录（新的英雄选择开始时调用）
  reset(): void {
    this.executedActions.clear()
  }
}
