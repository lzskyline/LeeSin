import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { 
  Summoner, 
  GameFlowPhase, 
  ChampSelectSession, 
  Champion, 
  RunePage, 
  AppSettings,
  Item,
  Augment
} from '../shared/types'
import type { CachedChampionBuild } from '../shared/types/opgg'

// 类型安全的IPC封装
const electronAPI = {
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
  
  // LCU连接
  lcu: {
    getStatus: (): Promise<{ connected: boolean; summoner: Summoner | null }> => 
      ipcRenderer.invoke('lcu:get-status'),
    reconnect: (): Promise<void> => 
      ipcRenderer.invoke('lcu:reconnect'),
    onConnected: (callback: (data: { port: number; summoner: Summoner }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { port: number; summoner: Summoner }) => callback(data)
      ipcRenderer.on('lcu:connected', handler)
      return () => ipcRenderer.removeListener('lcu:connected', handler)
    },
    onDisconnected: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('lcu:disconnected', handler)
      return () => ipcRenderer.removeListener('lcu:disconnected', handler)
    },
    onError: (callback: (data: { message: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { message: string }) => callback(data)
      ipcRenderer.on('lcu:error', handler)
      return () => ipcRenderer.removeListener('lcu:error', handler)
    },
  },
  
  // 游戏流
  gameflow: {
    getPhase: (): Promise<GameFlowPhase> => 
      ipcRenderer.invoke('gameflow:get-phase'),
    reconnectGame: (): Promise<void> => 
      ipcRenderer.invoke('gameflow:reconnect'),
    onPhaseChanged: (callback: (data: { phase: GameFlowPhase; timestamp: number }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { phase: GameFlowPhase; timestamp: number }) => callback(data)
      ipcRenderer.on('gameflow:phase-changed', handler)
      return () => ipcRenderer.removeListener('gameflow:phase-changed', handler)
    },
  },
  
  // 英雄选择
  champSelect: {
    getSession: (): Promise<ChampSelectSession | null> => 
      ipcRenderer.invoke('champselect:get-session'),
    executePick: (championId: number): Promise<boolean> => 
      ipcRenderer.invoke('champselect:execute-pick', championId),
    executeBan: (championId: number): Promise<boolean> => 
      ipcRenderer.invoke('champselect:execute-ban', championId),
    dodge: (): Promise<boolean> => 
      ipcRenderer.invoke('champselect:dodge'),
    onSessionUpdated: (callback: (session: ChampSelectSession) => void) => {
      const handler = (_event: IpcRendererEvent, session: ChampSelectSession) => callback(session)
      ipcRenderer.on('champselect:session-updated', handler)
      return () => ipcRenderer.removeListener('champselect:session-updated', handler)
    },
    onTimerTick: (callback: (data: { remaining: number; phase: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { remaining: number; phase: string }) => callback(data)
      ipcRenderer.on('champselect:timer-tick', handler)
      return () => ipcRenderer.removeListener('champselect:timer-tick', handler)
    },
  },
  
  // 自动化
  automation: {
    toggleAutoAccept: (enabled: boolean): Promise<void> => 
      ipcRenderer.invoke('automation:toggle-auto-accept', enabled),
    toggleAutoBP: (enabled: boolean): Promise<void> => 
      ipcRenderer.invoke('automation:toggle-auto-bp', enabled),
    toggleAutoRune: (enabled: boolean): Promise<void> => 
      ipcRenderer.invoke('automation:toggle-auto-rune', enabled),
    toggleAutoSpell: (enabled: boolean): Promise<void> => 
      ipcRenderer.invoke('automation:toggle-auto-spell', enabled),
    setPreferredChampions: (position: string, champions: number[]): Promise<void> => 
      ipcRenderer.invoke('automation:set-preferred-champions', position, champions),
    setBannedChampions: (champions: number[]): Promise<void> => 
      ipcRenderer.invoke('automation:set-banned-champions', champions),
    onActionExecuted: (callback: (data: { action: string; success: boolean; message?: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { action: string; success: boolean; message?: string }) => callback(data)
      ipcRenderer.on('automation:action-executed', handler)
      return () => ipcRenderer.removeListener('automation:action-executed', handler)
    },
    applyRunes: (runes: { primaryStyleId: number; subStyleId: number; selectedPerkIds: number[] }): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke('automation:apply-runes', runes),
    applySpells: (spell1Id: number, spell2Id: number): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke('automation:apply-spells', spell1Id, spell2Id),
  },
  
  // 数据
  data: {
    getChampions: (): Promise<Champion[]> => 
      ipcRenderer.invoke('data:get-champions'),
    getItems: (): Promise<Item[]> => 
      ipcRenderer.invoke('data:get-items'),
    getAugments: (): Promise<Augment[]> => 
      ipcRenderer.invoke('data:get-augments'),
    getTierList: (mode: string, tier: string): Promise<any> => 
      ipcRenderer.invoke('data:get-tier-list', mode, tier),
    getChampionBuild: (championId: number, position: string, mode?: string): Promise<CachedChampionBuild | null> => 
      ipcRenderer.invoke('data:get-champion-build', championId, position, mode),
    getRunes: (): Promise<RunePage[]> => 
      ipcRenderer.invoke('data:get-runes'),
  },
  
  // 战绩查询
  career: {
    getMatchHistory: (puuid: string, begIndex?: number, endIndex?: number): Promise<any> =>
      ipcRenderer.invoke('career:get-match-history', puuid, begIndex, endIndex),
    getMatchDetail: (gameId: number): Promise<any> =>
      ipcRenderer.invoke('career:get-match-detail', gameId),
    getRankedStats: (puuid: string): Promise<any> =>
      ipcRenderer.invoke('career:get-ranked-stats', puuid),
    getSummonerByPuuid: (puuid: string): Promise<any> =>
      ipcRenderer.invoke('career:get-summoner-by-puuid', puuid),
    getSummonerByName: (name: string): Promise<any> =>
      ipcRenderer.invoke('career:get-summoner-by-name', name),
  },
  
  // 设置
  settings: {
    get: (): Promise<AppSettings> => 
      ipcRenderer.invoke('settings:get'),
    set: (settings: Partial<AppSettings>): Promise<void> => 
      ipcRenderer.invoke('settings:set', settings),
  },
  
  // 观战
  spectator: {
    launch: (puuid: string): Promise<boolean> => 
      ipcRenderer.invoke('spectator:launch', puuid),
  },
}

// 暴露到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// 类型声明
export type ElectronAPI = typeof electronAPI
