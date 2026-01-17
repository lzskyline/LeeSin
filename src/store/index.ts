import { create } from 'zustand'
import type { Summoner, GameFlowPhase, ChampSelectSession, AppSettings, Champion } from '../../shared/types'

// LCU连接状态
interface LCUState {
  connected: boolean
  summoner: Summoner | null
  setConnected: (connected: boolean, summoner?: Summoner | null) => void
}

export const useLCUStore = create<LCUState>((set) => ({
  connected: false,
  summoner: null,
  setConnected: (connected, summoner = null) => set({ connected, summoner }),
}))

// 游戏流状态
interface GameFlowState {
  phase: GameFlowPhase
  setPhase: (phase: GameFlowPhase) => void
}

export const useGameFlowStore = create<GameFlowState>((set) => ({
  phase: 'None',
  setPhase: (phase) => set({ phase }),
}))

// 英雄选择状态
interface ChampSelectState {
  session: ChampSelectSession | null
  timer: { remaining: number; phase: string }
  hasAutoNavigatedToBuild: boolean  // 是否已自动跳转到出装页面
  setSession: (session: ChampSelectSession | null) => void
  setTimer: (timer: { remaining: number; phase: string }) => void
  setHasAutoNavigatedToBuild: (value: boolean) => void
}

export const useChampSelectStore = create<ChampSelectState>((set) => ({
  session: null,
  timer: { remaining: 0, phase: '' },
  hasAutoNavigatedToBuild: false,
  setSession: (session) => set({ session }),
  setTimer: (timer) => set({ timer }),
  setHasAutoNavigatedToBuild: (value) => set({ hasAutoNavigatedToBuild: value }),
}))

// 设置状态
interface SettingsState {
  settings: AppSettings | null
  setSettings: (settings: AppSettings) => void
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),
  updateSetting: (key, value) => set((state) => ({
    settings: state.settings ? { ...state.settings, [key]: value } : null
  })),
}))

// 数据状态
interface DataState {
  champions: Champion[]
  setChampions: (champions: Champion[]) => void
}

export const useDataStore = create<DataState>((set) => ({
  champions: [],
  setChampions: (champions) => set({ champions }),
}))

// 通知状态
interface NotificationState {
  notifications: { id: string; message: string; type: 'success' | 'error' | 'info' }[]
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void
  removeNotification: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (message, type) => {
    const id = Date.now().toString()
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }]
    }))
    // 3秒后自动移除
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }))
    }, 3000)
  },
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
}))

// 出装页面状态（用于在页面切换时保持选中的英雄）
interface BuildPageState {
  selectedChampionId: number | null
  selectedMode: string
  setSelectedChampionId: (id: number | null) => void
  setSelectedMode: (mode: string) => void
}

export const useBuildPageStore = create<BuildPageState>((set) => ({
  selectedChampionId: null,
  selectedMode: 'ranked',
  setSelectedChampionId: (id) => set({ selectedChampionId: id }),
  setSelectedMode: (mode) => set({ selectedMode: mode }),
}))
