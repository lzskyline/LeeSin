// LCU连接相关类型
export interface LCUCredentials {
  port: number
  token: string
  pid: number
}

export interface Summoner {
  accountId: number
  displayName: string
  gameName?: string  // Riot ID名称
  tagLine?: string   // Riot ID标签
  internalName: string
  percentCompleteForNextLevel: number
  profileIconId: number
  puuid: string
  rerollPoints: { currentPoints: number; maxRolls: number; numberOfRolls: number; pointsCostToRoll: number }
  summonerId: number
  summonerLevel: number
  xpSinceLastLevel: number
  xpUntilNextLevel: number
}

// 游戏流状态
export type GameFlowPhase = 
  | 'None'
  | 'Lobby'
  | 'Matchmaking'
  | 'CheckedIntoTournament'
  | 'ReadyCheck'
  | 'ChampSelect'
  | 'GameStart'
  | 'FailedToLaunch'
  | 'InProgress'
  | 'Reconnect'
  | 'WaitingForStats'
  | 'PreEndOfGame'
  | 'EndOfGame'
  | 'TerminatedInError'

// 英雄选择相关
export interface ChampSelectSession {
  gameId: number
  timer: ChampSelectTimer
  chatDetails: { chatRoomName: string; chatRoomPassword: string }
  myTeam: ChampSelectPlayer[]
  theirTeam: ChampSelectPlayer[]
  trades: ChampSelectTrade[]
  pickOrderSwaps: any[]
  actions: ChampSelectAction[][]
  localPlayerCellId: number
  allowBattleBoost: boolean
  allowDuplicatePicks: boolean
  allowLockedEvents: boolean
  allowRerolling: boolean
  allowSkinSelection: boolean
  bans: { myTeamBans: number[]; theirTeamBans: number[]; numBans: number }
  benchChampions: BenchChampion[]
  benchEnabled: boolean
  boostableSkinCount: number
  counter: number
  entitledFeatureState: { additionalRerolls: number; unlockedSkinIds: number[] }
  hasSimultaneousBans: boolean
  hasSimultaneousPicks: boolean
  isCustomGame: boolean
  isSpectating: boolean
  lockedEventIndex: number
  recoveryCounter: number
  rerollsRemaining: number
  skipChampionSelect: boolean
}

export interface ChampSelectTimer {
  adjustedTimeLeftInPhase: number
  internalNowInEpochMs: number
  isInfinite: boolean
  phase: string
  totalTimeInPhase: number
}

export interface ChampSelectPlayer {
  assignedPosition: string
  cellId: number
  championId: number
  championPickIntent: number
  entitledFeatureType: string
  nameVisibilityType: string
  obfuscatedPuuid: string
  obfuscatedSummonerId: number
  puuid: string
  selectedSkinId: number
  spell1Id: number
  spell2Id: number
  summonerId: number
  team: number
  wardSkinId: number
}

export interface ChampSelectAction {
  id: number
  actorCellId: number
  championId: number
  completed: boolean
  isAllyAction: boolean
  isInProgress: boolean
  pickTurn: number
  type: 'pick' | 'ban' | 'ten_bans_reveal'
}

export interface ChampSelectTrade {
  cellId: number
  id: number
  state: string
}

export interface BenchChampion {
  championId: number
  isPriority: boolean
}

// 英雄数据
export interface Champion {
  id: number
  name: string
  alias: string
  squarePortraitPath: string
  roles: string[]
}

// 符文相关
export interface RunePage {
  id: number
  name: string
  current: boolean
  isActive: boolean
  isDeletable: boolean
  isEditable: boolean
  isValid: boolean
  lastModified: number
  order: number
  primaryStyleId: number
  selectedPerkIds: number[]
  subStyleId: number
}

export interface Perk {
  id: number
  name: string
  iconPath: string
  shortDesc: string
  longDesc: string
}

export interface PerkStyle {
  id: number
  name: string
  iconPath: string
  allowedSubStyles: number[]
  slots: PerkStyleSlot[]
}

export interface PerkStyleSlot {
  type: string
  perks: number[]
}

// 召唤师技能
export interface SummonerSpell {
  id: number
  name: string
  description: string
  iconPath: string
  summonerLevel: number
  gameModes: string[]
}

// WebSocket事件
export interface LCUWebSocketEvent {
  uri: string
  eventType: 'Create' | 'Update' | 'Delete'
  data: any
}

// 配置类型
export interface AppSettings {
  autoAccept: boolean
  autoAcceptDelay: number
  autoBP: boolean
  autoRune: boolean
  autoSpell: boolean
  preferredChampions: { [position: string]: number[] }
  bannedChampions: number[]
  region: string
  tier: string
  gameMode: string  // ranked, aram, arena
}

// 战绩查询类型
export interface MatchHistoryQuery {
  puuid: string
  begIndex?: number
  endIndex?: number
}

export interface MatchHistoryResponse {
  games: MatchHistoryGame[]
  gameCount: number
}

export interface MatchHistoryGame {
  gameId: number
  queueId: number
  gameCreation: number
  gameDuration: number
  participants: MatchParticipant[]
}

export interface MatchParticipant {
  championId: number
  spell1Id: number
  spell2Id: number
  stats: {
    win: boolean
    kills: number
    deaths: number
    assists: number
    champLevel: number
    totalMinionsKilled: number
    neutralMinionsKilled: number
    goldEarned: number
    item0: number
    item1: number
    item2: number
    item3: number
    item4: number
    item5: number
    item6: number
    perk0: number
    gameEndedInEarlySurrender: boolean
  }
  timeline: {
    lane: string
    role: string
  }
}

export interface RankedStats {
  queueMap: {
    RANKED_SOLO_5x5?: RankedQueue
    RANKED_FLEX_SR?: RankedQueue
    RANKED_TFT?: RankedQueue
    CHERRY?: RankedQueue  // Arena
  }
}

export interface RankedQueue {
  queueType: string
  tier: string
  division: string
  leaguePoints: number
  wins: number
  losses: number
  highestTier?: string
  highestDivision?: string
  previousSeasonEndTier?: string
  previousSeasonEndDivision?: string
}

// 物品数据
export interface Item {
  id: number
  name: string
  description: string
  iconPath: string
  price: number
  priceTotal: number
}

// 增强数据 (Arena)
export interface Augment {
  id: number
  name: string
  description: string
  iconPath: string
  rarity: number
}

// IPC事件类型
export interface IPCEvents {
  // LCU
  'lcu:connected': { port: number; summoner: Summoner }
  'lcu:disconnected': void
  'lcu:error': { message: string }
  
  // GameFlow
  'gameflow:phase-changed': { phase: GameFlowPhase; timestamp: number }
  
  // ChampSelect
  'champselect:session-updated': ChampSelectSession
  'champselect:timer-tick': { remaining: number }
  'champselect:action-completed': { actionId: number; championId: number; type: string }
  
  // Automation
  'automation:action-executed': { action: string; success: boolean; message?: string }
}
