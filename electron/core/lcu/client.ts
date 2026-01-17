import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import https from 'https'
import { Logger } from '../../services/logger'
import { LCU_ENDPOINTS } from '../../../shared/constants'
import type { Summoner, GameFlowPhase, ChampSelectSession, RunePage, Champion, SummonerSpell, Perk, PerkStyle } from '../../../shared/types'

export class LCUClient {
  private client: AxiosInstance
  private port: number
  private token: string
  
  constructor(port: number, token: string) {
    this.port = port
    this.token = token
    
    // 创建axios实例，禁用SSL验证
    this.client = axios.create({
      baseURL: `https://127.0.0.1:${port}`,
      headers: {
        'Authorization': `Basic ${Buffer.from(`riot:${token}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // 忽略自签名证书
      }),
      timeout: 10000,
    })
    
    // 请求日志
    this.client.interceptors.request.use((config) => {
      Logger.debug(`LCU Request: ${config.method?.toUpperCase()} ${config.url}`)
      return config
    })
    
    // 响应日志
    this.client.interceptors.response.use(
      (response) => {
        Logger.debug(`LCU Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        Logger.error(`LCU Error: ${error.message}`, error.response?.data)
        throw error
      }
    )
  }
  
  // 通用请求方法
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }
  
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }
  
  // === 召唤师相关 ===
  async getCurrentSummoner(): Promise<Summoner> {
    return this.get<Summoner>(LCU_ENDPOINTS.CURRENT_SUMMONER)
  }
  
  // === 游戏流相关 ===
  async getGameFlowPhase(): Promise<GameFlowPhase> {
    return this.get<GameFlowPhase>(LCU_ENDPOINTS.GAMEFLOW_PHASE)
  }
  
  async reconnectGame(): Promise<void> {
    await this.post(LCU_ENDPOINTS.RECONNECT)
  }
  
  // === 匹配相关 ===
  async acceptReadyCheck(): Promise<void> {
    await this.post(LCU_ENDPOINTS.READY_CHECK_ACCEPT)
  }
  
  async acceptTeamBuilderReadyCheck(): Promise<void> {
    await this.post(LCU_ENDPOINTS.TEAM_BUILDER_READY_CHECK_ACCEPT)
  }
  
  async getReadyCheck(): Promise<any> {
    return this.get(LCU_ENDPOINTS.READY_CHECK)
  }
  
  // === 英雄选择相关 ===
  async getChampSelectSession(): Promise<ChampSelectSession> {
    return this.get<ChampSelectSession>(LCU_ENDPOINTS.CHAMP_SELECT_SESSION)
  }
  
  async getCurrentChampion(): Promise<number> {
    return this.get<number>(LCU_ENDPOINTS.CHAMP_SELECT_CURRENT)
  }
  
  async executeAction(actionId: number, championId: number, type: 'pick' | 'ban', completed: boolean = true): Promise<void> {
    await this.patch(LCU_ENDPOINTS.CHAMP_SELECT_ACTION(actionId), {
      championId,
      type,
      completed,
    })
  }
  
  async setMySelection(spell1Id?: number, spell2Id?: number, skinId?: number): Promise<void> {
    const data: any = {}
    if (spell1Id !== undefined) data.spell1Id = spell1Id
    if (spell2Id !== undefined) data.spell2Id = spell2Id
    if (skinId !== undefined) data.selectedSkinId = skinId
    await this.patch(LCU_ENDPOINTS.CHAMP_SELECT_MY_SELECTION, data)
  }
  
  async reroll(): Promise<void> {
    await this.post(LCU_ENDPOINTS.CHAMP_SELECT_REROLL)
  }
  
  async swapBenchChampion(championId: number): Promise<void> {
    await this.post(LCU_ENDPOINTS.CHAMP_SELECT_BENCH_SWAP(championId))
  }
  
  // === 符文相关 ===
  async getRunePages(): Promise<RunePage[]> {
    return this.get<RunePage[]>(LCU_ENDPOINTS.PERKS_PAGES)
  }
  
  async getCurrentRunePage(): Promise<RunePage> {
    return this.get<RunePage>(LCU_ENDPOINTS.PERKS_CURRENT)
  }
  
  async createRunePage(page: Partial<RunePage>): Promise<RunePage> {
    return this.post<RunePage>(LCU_ENDPOINTS.PERKS_PAGES, page)
  }
  
  async deleteRunePage(id: number): Promise<void> {
    await this.delete(LCU_ENDPOINTS.PERKS_DELETE(id))
  }
  
  // === 静态数据 ===
  async getChampions(): Promise<Champion[]> {
    const data = await this.get<any[]>(LCU_ENDPOINTS.CHAMPIONS)
    return data.filter(c => c.id > 0).map(c => ({
      id: c.id,
      name: c.name,
      alias: c.alias,
      squarePortraitPath: c.squarePortraitPath,
      roles: c.roles || [],
    }))
  }
  
  async getSummonerSpells(): Promise<SummonerSpell[]> {
    return this.get<SummonerSpell[]>(LCU_ENDPOINTS.SUMMONER_SPELLS)
  }
  
  async getPerks(): Promise<Perk[]> {
    return this.get<Perk[]>(LCU_ENDPOINTS.PERKS)
  }
  
  async getPerkStyles(): Promise<PerkStyle[]> {
    const data = await this.get<{ styles: PerkStyle[] }>(LCU_ENDPOINTS.PERK_STYLES)
    return data.styles
  }
  
  // === 秒退 ===
  async dodge(): Promise<void> {
    await this.post(LCU_ENDPOINTS.DODGE, {
      destination: 'lcdsServiceProxy',
      method: 'call',
      args: '["", "teambuilder-draft", "quitV2", ""]',
    })
  }
  
  // === 观战 ===
  async launchSpectator(puuid: string): Promise<void> {
    await this.post(LCU_ENDPOINTS.SPECTATE_LAUNCH, { puuid })
  }
  
  // === 战绩查询 ===
  async getMatchHistory(puuid: string, begIndex: number = 0, endIndex: number = 20): Promise<any> {
    const params = { begIndex, endIndex }
    return this.get(LCU_ENDPOINTS.MATCH_HISTORY(puuid), { params })
  }
  
  async getMatchDetail(gameId: number): Promise<any> {
    return this.get(LCU_ENDPOINTS.MATCH_DETAIL(gameId))
  }
  
  async getRankedStats(puuid: string): Promise<any> {
    return this.get(LCU_ENDPOINTS.RANKED_STATS(puuid))
  }
  
  async getSummonerByPuuid(puuid: string): Promise<any> {
    return this.get(LCU_ENDPOINTS.SUMMONER_BY_PUUID(puuid))
  }
  
  async getSummonerByName(name: string): Promise<any> {
    return this.get(LCU_ENDPOINTS.SUMMONER_BY_NAME, { params: { name } })
  }
  
  // === 物品数据 ===
  async getItems(): Promise<any[]> {
    return this.get(LCU_ENDPOINTS.ITEMS)
  }
  
  // === 增强数据 (Arena) ===
  async getAugments(): Promise<any[]> {
    return this.get(LCU_ENDPOINTS.AUGMENTS)
  }
  
  // === 队列数据 ===
  async getQueues(): Promise<any[]> {
    return this.get(LCU_ENDPOINTS.QUEUES)
  }
  
  // 获取资源URL
  getAssetUrl(path: string): string {
    if (path.startsWith('/lol-game-data/assets')) {
      return `https://127.0.0.1:${this.port}${path}`
    }
    return `https://127.0.0.1:${this.port}/lol-game-data/assets${path}`
  }
}
