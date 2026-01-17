import { LCUClient } from '../lcu/client'
import { OPGGClient } from '../data/opgg-client'
import { ConfigService } from '../../services/config'
import { Logger } from '../../services/logger'
import { POSITION_MAP, SUMMONER_SPELL_IDS } from '../../../shared/constants'
import type { AutoActionResult } from './auto-accept'

export class AutoSpell {
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
    
    if (!settings.autoSpell) {
      return { executed: false, success: false, message: 'Auto-spell disabled' }
    }
    
    // 防止重复设置同一英雄
    if (championId === this.lastAppliedChampion) {
      return { executed: false, success: false, message: 'Spells already set' }
    }
    
    try {
      // 从OP.GG获取推荐技能
      const normalizedPosition = POSITION_MAP[position] || 'mid'
      const build = await this.opggClient.getChampionBuild(
        championId, 
        normalizedPosition,
        settings.region,
        settings.tier
      )
      
      if (!build || !build.spells || build.spells.length === 0) {
        // 使用默认技能：闪现 + 点燃
        await this.applyDefaultSpells(position)
        return { executed: true, success: true, message: 'Default spells set' }
      }
      
      // 只应用第一个推荐召唤师技能
      const firstSpell = build.spells[0]
      await this.lcuClient.setMySelection(firstSpell.ids[0], firstSpell.ids[1])
      
      this.lastAppliedChampion = championId
      
      Logger.info(`Summoner spells set: ${firstSpell.ids[0]}, ${firstSpell.ids[1]}`)
      return { executed: true, success: true, message: 'Spells applied' }
    } catch (error: any) {
      Logger.error('Auto-spell failed', error)
      return { executed: true, success: false, message: error.message }
    }
  }
  
  private async applyDefaultSpells(position: string): Promise<void> {
    const spell1 = SUMMONER_SPELL_IDS.FLASH
    let spell2 = SUMMONER_SPELL_IDS.IGNITE
    
    // 根据位置选择默认技能
    switch (position.toLowerCase()) {
      case 'jungle':
        spell2 = SUMMONER_SPELL_IDS.SMITE
        break
      case 'top':
        spell2 = SUMMONER_SPELL_IDS.TELEPORT
        break
      case 'support':
      case 'utility':
        spell2 = SUMMONER_SPELL_IDS.EXHAUST
        break
      case 'adc':
      case 'bottom':
        spell2 = SUMMONER_SPELL_IDS.HEAL
        break
    }
    
    await this.lcuClient.setMySelection(spell1, spell2)
  }
  
  reset(): void {
    this.lastAppliedChampion = 0
  }
}
