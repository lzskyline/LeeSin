import Store from 'electron-store'
import { DEFAULT_SETTINGS } from '../../shared/constants'
import type { AppSettings } from '../../shared/types'

interface StoreSchema {
  settings: AppSettings
}

export class ConfigService {
  private store: Store<StoreSchema>
  
  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'leesin-config',
      defaults: {
        settings: { ...DEFAULT_SETTINGS } as AppSettings,
      },
    })
  }
  
  getSettings(): AppSettings {
    return this.store.get('settings')
  }
  
  setSettings(settings: Partial<AppSettings>): void {
    const current = this.getSettings()
    this.store.set('settings', { ...current, ...settings })
  }
  
  // 单个设置项
  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.getSettings()[key]
  }
  
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const settings = this.getSettings()
    settings[key] = value
    this.store.set('settings', settings)
  }
  
  // 重置为默认
  reset(): void {
    this.store.set('settings', { ...DEFAULT_SETTINGS } as AppSettings)
  }
  
  // 首选英雄设置
  setPreferredChampions(position: string, champions: number[]): void {
    const settings = this.getSettings()
    settings.preferredChampions[position] = champions
    this.store.set('settings', settings)
  }
  
  getPreferredChampions(position: string): number[] {
    return this.getSettings().preferredChampions[position] || []
  }
  
  // 禁用英雄设置
  setBannedChampions(champions: number[]): void {
    this.set('bannedChampions', champions)
  }
  
  getBannedChampions(): number[] {
    return this.get('bannedChampions')
  }
}
