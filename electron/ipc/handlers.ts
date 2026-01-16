import { ipcMain, BrowserWindow } from 'electron'
import type { LCUClient } from '../core/lcu/client'
import type { LCUWebSocket } from '../core/lcu/websocket'
import type { GameFlowMonitor } from '../core/gameflow/monitor'
import type { ConfigService } from '../services/config'
import type { OPGGClient } from '../core/data/opgg-client'
import type { StaticDataManager } from '../core/data/static-data'
import { Dodge } from '../core/automation/dodge'
import { Logger } from '../services/logger'

interface ServiceProviders {
  getMainWindow: () => BrowserWindow | null
  getLCUClient: () => LCUClient | null
  getLCUWebSocket: () => LCUWebSocket | null
  getGameFlowMonitor: () => GameFlowMonitor | null
  getConfigService: () => ConfigService | null
  getOPGGClient: () => OPGGClient | null
  getStaticDataManager: () => StaticDataManager | null
}

export function registerIPCHandlers(providers: ServiceProviders): void {
  const {
    getLCUClient,
    getLCUWebSocket,
    getGameFlowMonitor,
    getConfigService,
    getOPGGClient,
    getStaticDataManager,
  } = providers
  
  // === LCU相关 ===
  ipcMain.handle('lcu:get-status', async () => {
    const client = getLCUClient()
    if (!client) {
      return { connected: false, summoner: null }
    }
    
    try {
      const summoner = await client.getCurrentSummoner()
      return { connected: true, summoner }
    } catch {
      return { connected: true, summoner: null }
    }
  })
  
  ipcMain.handle('lcu:reconnect', async () => {
    // 这个由connector处理，这里只是触发UI更新
  })
  
  // === 游戏流相关 ===
  ipcMain.handle('gameflow:get-phase', async () => {
    const monitor = getGameFlowMonitor()
    return monitor?.getCurrentPhase() || 'None'
  })
  
  ipcMain.handle('gameflow:reconnect', async () => {
    const client = getLCUClient()
    if (client) {
      await client.reconnectGame()
    }
  })
  
  // === 英雄选择相关 ===
  ipcMain.handle('champselect:get-session', async () => {
    const monitor = getGameFlowMonitor()
    return monitor?.getCurrentSession() || null
  })
  
  ipcMain.handle('champselect:execute-pick', async (_event, championId: number) => {
    const client = getLCUClient()
    const monitor = getGameFlowMonitor()
    
    if (!client || !monitor) return false
    
    const session = monitor.getCurrentSession()
    if (!session) return false
    
    // 找到本地玩家的pick action
    for (const round of session.actions) {
      for (const action of round) {
        if (
          action.actorCellId === session.localPlayerCellId &&
          action.type === 'pick' &&
          !action.completed &&
          action.isInProgress
        ) {
          try {
            await client.executeAction(action.id, championId, 'pick', true)
            return true
          } catch (error) {
            Logger.error('Failed to execute pick', error)
            return false
          }
        }
      }
    }
    
    return false
  })
  
  ipcMain.handle('champselect:execute-ban', async (_event, championId: number) => {
    const client = getLCUClient()
    const monitor = getGameFlowMonitor()
    
    if (!client || !monitor) return false
    
    const session = monitor.getCurrentSession()
    if (!session) return false
    
    // 找到本地玩家的ban action
    for (const round of session.actions) {
      for (const action of round) {
        if (
          action.actorCellId === session.localPlayerCellId &&
          action.type === 'ban' &&
          !action.completed &&
          action.isInProgress
        ) {
          try {
            await client.executeAction(action.id, championId, 'ban', true)
            return true
          } catch (error) {
            Logger.error('Failed to execute ban', error)
            return false
          }
        }
      }
    }
    
    return false
  })
  
  ipcMain.handle('champselect:dodge', async () => {
    const client = getLCUClient()
    if (!client) return false
    
    const dodge = new Dodge(client)
    const result = await dodge.execute()
    return result.success
  })
  
  // === 自动化相关 ===
  ipcMain.handle('automation:toggle-auto-accept', async (_event, enabled: boolean) => {
    const config = getConfigService()
    config?.set('autoAccept', enabled)
  })
  
  ipcMain.handle('automation:toggle-auto-bp', async (_event, enabled: boolean) => {
    const config = getConfigService()
    config?.set('autoBP', enabled)
  })
  
  ipcMain.handle('automation:toggle-auto-rune', async (_event, enabled: boolean) => {
    const config = getConfigService()
    config?.set('autoRune', enabled)
  })
  
  ipcMain.handle('automation:toggle-auto-spell', async (_event, enabled: boolean) => {
    const config = getConfigService()
    config?.set('autoSpell', enabled)
  })
  
  ipcMain.handle('automation:set-preferred-champions', async (_event, position: string, champions: number[]) => {
    const config = getConfigService()
    config?.setPreferredChampions(position, champions)
  })
  
  ipcMain.handle('automation:set-banned-champions', async (_event, champions: number[]) => {
    const config = getConfigService()
    config?.setBannedChampions(champions)
  })

  // 手动应用符文
  ipcMain.handle('automation:apply-runes', async (_event, runes: { primaryStyleId: number; subStyleId: number; selectedPerkIds: number[] }) => {
    const lcu = getLCUClient()
    if (!lcu) return { success: false, message: '未连接客户端' }
    
    try {
      Logger.info('Applying runes:', JSON.stringify(runes, null, 2))
      
      // 删除旧的自动符文页
      const pages = await lcu.getRunePages()
      for (const page of pages) {
        if (page.name.startsWith('LeeSin') && page.isDeletable) {
          await lcu.deleteRunePage(page.id)
          Logger.info(`Deleted old rune page: ${page.id}`)
        }
      }
      
      // 创建新符文页
      const newPage = {
        name: 'LeeSin-Applied',
        primaryStyleId: runes.primaryStyleId,
        subStyleId: runes.subStyleId,
        selectedPerkIds: runes.selectedPerkIds,
        current: true,
      }
      
      Logger.info('Creating rune page:', JSON.stringify(newPage, null, 2))
      await lcu.createRunePage(newPage)
      
      return { success: true, message: '符文已应用' }
    } catch (error: any) {
      Logger.error('Apply runes failed', error)
      return { success: false, message: error.message || '符文应用失败' }
    }
  })

  // 手动应用召唤师技能
  ipcMain.handle('automation:apply-spells', async (_event, spell1Id: number, spell2Id: number) => {
    const lcu = getLCUClient()
    if (!lcu) return { success: false, message: '未连接客户端' }
    
    try {
      await lcu.setMySelection(spell1Id, spell2Id)
      return { success: true, message: '召唤师技能已应用' }
    } catch (error: any) {
      Logger.error('Apply spells failed', error)
      return { success: false, message: error.message }
    }
  })
  
  // === 数据相关 ===
  ipcMain.handle('data:get-champions', async () => {
    const staticData = getStaticDataManager()
    return staticData?.getAllChampions() || []
  })
  
  ipcMain.handle('data:get-items', async () => {
    const staticData = getStaticDataManager()
    return staticData?.getAllItems() || []
  })
  
  ipcMain.handle('data:get-augments', async () => {
    const staticData = getStaticDataManager()
    return staticData?.getAllAugments() || []
  })
  
  ipcMain.handle('data:get-tier-list', async (_event, mode: string, tier: string) => {
    const opgg = getOPGGClient()
    const config = getConfigService()
    const region = config?.get('region') || 'kr'
    
    return opgg?.getTierList(mode, region, tier) || null
  })
  
  ipcMain.handle('data:get-champion-build', async (_event, championId: number, position: string, mode?: string) => {
    const opgg = getOPGGClient()
    const config = getConfigService()
    
    if (!opgg || !config) return null
    
    const region = config.get('region')
    const tier = config.get('tier')
    const gameMode = mode || config.get('gameMode') || 'ranked'
    
    return opgg.getChampionBuild(championId, position, region, tier, gameMode)
  })
  
  ipcMain.handle('data:get-runes', async () => {
    const client = getLCUClient()
    if (!client) return []
    
    try {
      return await client.getRunePages()
    } catch {
      return []
    }
  })
  
  // === 战绩查询 ===
  ipcMain.handle('career:get-match-history', async (_event, puuid: string, begIndex?: number, endIndex?: number) => {
    const client = getLCUClient()
    if (!client) return null
    
    try {
      const result = await client.getMatchHistory(puuid, begIndex || 0, endIndex || 20)
      return result
    } catch (error) {
      Logger.error('Failed to get match history', error)
      return null
    }
  })
  
  ipcMain.handle('career:get-match-detail', async (_event, gameId: number) => {
    const client = getLCUClient()
    if (!client) return null
    
    try {
      return await client.getMatchDetail(gameId)
    } catch (error) {
      Logger.error('Failed to get match detail', error)
      return null
    }
  })
  
  ipcMain.handle('career:get-ranked-stats', async (_event, puuid: string) => {
    const client = getLCUClient()
    if (!client) return null
    
    try {
      return await client.getRankedStats(puuid)
    } catch (error) {
      Logger.error('Failed to get ranked stats', error)
      return null
    }
  })
  
  ipcMain.handle('career:get-summoner-by-puuid', async (_event, puuid: string) => {
    const client = getLCUClient()
    if (!client) return null
    
    try {
      return await client.getSummonerByPuuid(puuid)
    } catch (error) {
      Logger.error('Failed to get summoner', error)
      return null
    }
  })
  
  ipcMain.handle('career:get-summoner-by-name', async (_event, name: string) => {
    const client = getLCUClient()
    if (!client) return null
    
    try {
      return await client.getSummonerByName(name)
    } catch (error) {
      Logger.error('Failed to get summoner', error)
      return null
    }
  })
  
  // === 设置相关 ===
  ipcMain.handle('settings:get', async () => {
    const config = getConfigService()
    return config?.getSettings() || null
  })
  
  ipcMain.handle('settings:set', async (_event, settings: any) => {
    const config = getConfigService()
    config?.setSettings(settings)
  })
  
  // === 观战相关 ===
  ipcMain.handle('spectator:launch', async (_event, puuid: string) => {
    const client = getLCUClient()
    if (!client) return false
    
    try {
      await client.launchSpectator(puuid)
      return true
    } catch (error) {
      Logger.error('Failed to launch spectator', error)
      return false
    }
  })
  
  Logger.info('IPC handlers registered')
}
