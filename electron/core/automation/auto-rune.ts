import { LCUClient } from '../lcu/client'
import { OPGGClient } from '../data/opgg-client'
import { ConfigService } from '../../services/config'
import { Logger } from '../../services/logger'
import { POSITION_MAP } from '../../../shared/constants'
import type { AutoActionResult } from './auto-accept'

export class AutoRune {
  private lcuClient: LCUClient
  private opggClient: OPGGClient
  private configService: ConfigService
  private lastAppliedChampion: number = 0
  
  constructor(
    lcuClient: LCUClient, 
    opggClient: OPGGClient,
    configService: ConfigService
  ) {
    this.lcuClient = lcuClient
    this.opggClient = opggClient
    this.configService = configService
  }
  
  async execute(championId: number, position: string): Promise<AutoActionResult> {
    const settings = this.configService.getSettings()
    
    if (!settings.autoRune) {
      return { executed: false, success: false, message: 'Auto-rune disabled' }
    }
    
    // 防止重复设置同一英雄
    if (championId === this.lastAppliedChampion) {
      return { executed: false, success: false, message: 'Runes already set' }
    }
    
    try {
      // 从OP.GG获取推荐符文
      const normalizedPosition = POSITION_MAP[position] || 'mid'
      const build = await this.opggClient.getChampionBuild(
        championId, 
        normalizedPosition,
        settings.region,
        settings.tier
      )
      
      if (!build || !build.runes || build.runes.length === 0) {
        return { executed: true, success: false, message: 'No runes found' }
      }
      
      // 只应用第一个推荐符文
      const firstRune = build.runes[0]
      
      // 删除旧的自动符文页
      await this.deleteAutoRunePage()
      
      // 创建新符文页
      await this.lcuClient.createRunePage({
        name: `LeeSin-Auto`,
        primaryStyleId: firstRune.primaryStyleId,
        subStyleId: firstRune.subStyleId,
        selectedPerkIds: firstRune.selectedPerkIds,
        current: true,
      })
      
      this.lastAppliedChampion = championId
      
      Logger.info(`Runes set: primary=${firstRune.primaryStyleId} sub=${firstRune.subStyleId}`)
      return { executed: true, success: true, message: 'Runes applied' }
    } catch (error: any) {
      Logger.error('Auto-rune failed', error)
      return { executed: true, success: false, message: error.message }
    }
  }
  
  private async deleteAutoRunePage(): Promise<void> {
    try {
      const pages = await this.lcuClient.getRunePages()
      
      // 找到并删除LeeSin-Auto符文页
      for (const page of pages) {
        if (page.name.startsWith('LeeSin-Auto') && page.isDeletable) {
          await this.lcuClient.deleteRunePage(page.id)
          Logger.debug(`Deleted old rune page: ${page.name}`)
        }
      }
    } catch (error) {
      // 忽略删除错误
    }
  }
  
  reset(): void {
    this.lastAppliedChampion = 0
  }
}
