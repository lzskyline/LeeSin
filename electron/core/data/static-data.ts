import { LCUClient } from '../lcu/client'
import { Logger } from '../../services/logger'
import type { Champion, SummonerSpell, Perk, PerkStyle, Item, Augment } from '../../../shared/types'

interface GameQueue {
  id: number
  name: string
  shortName: string
  description: string
  mapId: number
  gameMode: string
}

export class StaticDataManager {
  private lcuClient: LCUClient
  private champions: Map<number, Champion> = new Map()
  private championsByAlias: Map<string, Champion> = new Map()
  private summonerSpells: Map<number, SummonerSpell> = new Map()
  private perks: Map<number, Perk> = new Map()
  private perkStyles: Map<number, PerkStyle> = new Map()
  private items: Map<number, Item> = new Map()
  private augments: Map<number, Augment> = new Map()
  private queues: Map<number, GameQueue> = new Map()
  private initialized = false
  
  constructor(lcuClient: LCUClient) {
    this.lcuClient = lcuClient
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return
    
    Logger.info('Loading static data...')
    
    try {
      await Promise.all([
        this.loadChampions(),
        this.loadSummonerSpells(),
        this.loadPerks(),
        this.loadPerkStyles(),
        this.loadItems(),
        this.loadAugments(),
        this.loadQueues(),
      ])
      
      this.initialized = true
      Logger.info(`Static data loaded: ${this.champions.size} champions, ${this.items.size} items, ${this.augments.size} augments`)
    } catch (error) {
      Logger.error('Failed to load static data', error)
      throw error
    }
  }
  
  private async loadChampions(): Promise<void> {
    const champions = await this.lcuClient.getChampions()
    
    for (const champion of champions) {
      this.champions.set(champion.id, champion)
      this.championsByAlias.set(champion.alias.toLowerCase(), champion)
    }
  }
  
  private async loadSummonerSpells(): Promise<void> {
    const spells = await this.lcuClient.getSummonerSpells()
    
    for (const spell of spells) {
      this.summonerSpells.set(spell.id, spell)
    }
  }
  
  private async loadPerks(): Promise<void> {
    const perks = await this.lcuClient.getPerks()
    
    for (const perk of perks) {
      this.perks.set(perk.id, perk)
    }
  }
  
  private async loadPerkStyles(): Promise<void> {
    const styles = await this.lcuClient.getPerkStyles()
    
    for (const style of styles) {
      this.perkStyles.set(style.id, style)
    }
  }
  
  private async loadItems(): Promise<void> {
    try {
      const items = await this.lcuClient.getItems()
      
      for (const item of items) {
        if (item.id > 0) {
          this.items.set(item.id, {
            id: item.id,
            name: item.name,
            description: item.description || '',
            iconPath: item.iconPath || '',
            price: item.price || 0,
            priceTotal: item.priceTotal || 0,
          })
        }
      }
    } catch (error) {
      Logger.warn('Failed to load items', error)
    }
  }
  
  private async loadAugments(): Promise<void> {
    try {
      const augments = await this.lcuClient.getAugments()
      
      for (const aug of augments) {
        if (aug.id > 0) {
          this.augments.set(aug.id, {
            id: aug.id,
            name: aug.name || aug.nameTRA || '',
            description: aug.desc || aug.descTRA || '',
            iconPath: aug.iconSmall || aug.iconLarge || '',
            rarity: aug.rarity || 0,
          })
        }
      }
    } catch (error) {
      Logger.warn('Failed to load augments', error)
    }
  }
  
  private async loadQueues(): Promise<void> {
    try {
      const queues = await this.lcuClient.getQueues()
      
      for (const queue of queues) {
        this.queues.set(queue.id, {
          id: queue.id,
          name: queue.name || '',
          shortName: queue.shortName || '',
          description: queue.description || '',
          mapId: queue.mapId || 0,
          gameMode: queue.gameMode || '',
        })
      }
    } catch (error) {
      Logger.warn('Failed to load queues', error)
    }
  }
  
  // Champion methods
  getChampionById(id: number): Champion | undefined {
    return this.champions.get(id)
  }
  
  getChampionByAlias(alias: string): Champion | undefined {
    return this.championsByAlias.get(alias.toLowerCase())
  }
  
  getAllChampions(): Champion[] {
    return Array.from(this.champions.values())
  }
  
  // Spell methods
  getSummonerSpellById(id: number): SummonerSpell | undefined {
    return this.summonerSpells.get(id)
  }
  
  getAllSummonerSpells(): SummonerSpell[] {
    return Array.from(this.summonerSpells.values())
  }
  
  // Perk methods
  getPerkById(id: number): Perk | undefined {
    return this.perks.get(id)
  }
  
  getPerkStyleById(id: number): PerkStyle | undefined {
    return this.perkStyles.get(id)
  }
  
  getAllPerkStyles(): PerkStyle[] {
    return Array.from(this.perkStyles.values())
  }
  
  // Item methods
  getItemById(id: number): Item | undefined {
    return this.items.get(id)
  }
  
  getAllItems(): Item[] {
    return Array.from(this.items.values())
  }
  
  // Augment methods
  getAugmentById(id: number): Augment | undefined {
    return this.augments.get(id)
  }
  
  getAllAugments(): Augment[] {
    return Array.from(this.augments.values())
  }
  
  // Queue methods
  getQueueById(id: number): GameQueue | undefined {
    return this.queues.get(id)
  }
  
  getQueueNameById(id: number): string {
    const queue = this.queues.get(id)
    return queue?.name || queue?.shortName || `Queue ${id}`
  }
  
  // Search methods
  searchChampions(query: string): Champion[] {
    if (!query) return this.getAllChampions()
    
    const lowerQuery = query.toLowerCase()
    return this.getAllChampions().filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      c.alias.toLowerCase().includes(lowerQuery)
    )
  }
  
  isInitialized(): boolean {
    return this.initialized
  }
}
