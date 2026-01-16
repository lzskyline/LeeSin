// OP.GG API响应类型
export interface OPGGTierListResponse {
  meta: { version: string }
  data: OPGGChampionTier[]
}

export interface OPGGChampionTier {
  id: number
  is_rotation: boolean
  positions?: OPGGPosition[]
  average_stats?: OPGGAverageStats  // Arena/ARAM mode
}

export interface OPGGAverageStats {
  win_rate: number
  pick_rate: number
  ban_rate: number
  kda: number
  tier: number
  rank: number
  play?: number
  win?: number
  total_place?: number  // Arena
  first_place?: number  // Arena
}

export interface OPGGPosition {
  name: string
  stats: OPGGStats
  counters?: OPGGCounter[]
  runes: OPGGRune[]
  spells: number[]
  skill_masteries: OPGGSkillMastery[]
  core_items: OPGGCoreItem[]
  starter_items: OPGGStarterItem[]
  boots: OPGGBootsItem[]
  last_items?: OPGGLastItem[]
}

export interface OPGGStats {
  win_rate: number
  pick_rate: number
  ban_rate: number
  kda?: number
  tier_data?: { tier: number; rank: number }
  tier?: number
  rank?: number
}

export interface OPGGCounter {
  champion_id: number
  win: number
  play: number
}

export interface OPGGRune {
  id?: number
  primary_page_id: number
  primary_rune_ids: number[]
  secondary_page_id: number
  secondary_rune_ids: number[]
  stat_mod_ids: number[]
  play: number
  win: number
  pick_rate?: number
}

export interface OPGGSkillMastery {
  ids: string[]
  play: number
  win: number
  pick_rate?: number
}

export interface OPGGCoreItem {
  ids: number[]
  play: number
  win: number
  pick_rate?: number
  total_place?: number  // Arena
  first_place?: number  // Arena
}

export interface OPGGStarterItem {
  ids: number[]
  play: number
  win: number
  pick_rate?: number
}

export interface OPGGBootsItem {
  ids: number[]
  play: number
  win: number
  pick_rate?: number
}

export interface OPGGLastItem {
  ids: number[]
  play: number
  win: number
  pick_rate?: number
}

export interface OPGGChampionBuildResponse {
  meta: { version: string }
  data: OPGGChampionBuild
}

export interface OPGGChampionBuild {
  summary: OPGGBuildSummary
  positions?: OPGGBuildPosition[]  // Normal mode
  runes?: OPGGRune[]
  summoner_spells?: OPGGSummonerSpell[]
  skill_masteries?: OPGGSkillMastery[]
  skills?: OPGGSkillOrder[]
  core_items?: OPGGCoreItem[]
  starter_items?: OPGGStarterItem[]
  boots?: OPGGBootsItem[]
  last_items?: OPGGLastItem[]
  counters?: OPGGCounter[]
  // Arena specific
  augment_group?: OPGGAugmentGroup[]
  synergies?: OPGGSynergy[]
}

export interface OPGGBuildSummary {
  id: number
  positions?: { name: string; stats: OPGGStats }[]
  average_stats?: OPGGAverageStats  // Arena/ARAM
}

export interface OPGGBuildPosition {
  name: string
  stats: OPGGStats
  runes: OPGGRune[]
  summoner_spells: OPGGSummonerSpell[]
  skill_masteries: OPGGSkillMastery[]
  skills: OPGGSkillOrder[]
  core_items: OPGGCoreItem[]
  starter_items: OPGGStarterItem[]
  boots: OPGGBootsItem[]
  last_items: OPGGLastItem[]
  counters: OPGGCounter[]
}

export interface OPGGSummonerSpell {
  ids: number[]
  play: number
  win: number
  pick_rate?: number
}

export interface OPGGSkillOrder {
  order: string[]
  play: number
  win: number
  pick_rate?: number
}

// Arena Augments
export interface OPGGAugmentGroup {
  augments: OPGGAugment[]
}

export interface OPGGAugment {
  id: number
  win: number
  play: number
  total_place: number
  first_place: number
  pick_rate: number
}

// Arena Synergies
export interface OPGGSynergy {
  champion_id: number
  win: number
  play: number
  total_place: number
  first_place: number
  pick_rate: number
}

// 缓存的英雄构建数据
export interface CachedChampionBuild {
  championId: number
  position: string
  mode: string
  version: string
  timestamp: number
  summary: {
    winRate: number
    pickRate: number
    banRate?: number
    kda?: number
    tier?: number
    rank?: number
    // Arena specific
    averagePlace?: number
    firstRate?: number
  }
  runes: {
    primaryStyleId: number
    subStyleId: number
    selectedPerkIds: number[]
    pickRate?: number
  }[]
  spells: {
    ids: number[]
    pickRate?: number
  }[]
  skills: {
    masteries: string[]
    order: string[]
    pickRate?: number
  }
  items: {
    starter: { ids: number[]; pickRate?: number }[]
    core: { ids: number[]; pickRate?: number }[]
    boots: { ids: number[]; pickRate?: number }[]
    last: number[]
  }
  counters?: {
    strongAgainst: { championId: number; winRate: number }[]
    weakAgainst: { championId: number; winRate: number }[]
  }
  // Arena specific - 扁平化的增幅列表，按选取率排序
  augments?: { id: number; name?: string; iconUrl?: string; rarity?: string; pickRate: number; averagePlace: number }[]
  synergies?: { championId: number; winRate: number; averagePlace: number }[]
}

// 战绩相关类型
export interface MatchHistoryGame {
  gameId: number
  queueId: number
  gameCreation: number
  gameDuration: number
  championId: number
  spell1Id: number
  spell2Id: number
  stats: MatchStats
  timeline: MatchTimeline
}

export interface MatchStats {
  win: boolean
  kills: number
  deaths: number
  assists: number
  champLevel: number
  totalMinionsKilled: number
  neutralMinionsKilled: number
  goldEarned: number
  totalDamageDealtToChampions: number
  totalDamageTaken: number
  visionScore: number
  wardsPlaced: number
  item0: number
  item1: number
  item2: number
  item3: number
  item4: number
  item5: number
  item6: number
  perk0: number
  perk1: number
  perk2: number
  perk3: number
  perk4: number
  perk5: number
  perkSubStyle: number
  perkPrimaryStyle: number
  gameEndedInEarlySurrender: boolean
}

export interface MatchTimeline {
  lane: string
  role: string
}

export interface MatchDetail {
  gameId: number
  queueId: number
  mapId: number
  gameCreation: number
  gameDuration: number
  teams: MatchTeam[]
  participants: MatchParticipant[]
  participantIdentities: ParticipantIdentity[]
}

export interface MatchTeam {
  teamId: number
  win: string
  baronKills: number
  dragonKills: number
  riftHeraldKills: number
  towerKills: number
  inhibitorKills: number
  bans: { championId: number; pickTurn: number }[]
}

export interface MatchParticipant {
  participantId: number
  teamId: number
  championId: number
  spell1Id: number
  spell2Id: number
  stats: MatchStats
  timeline: MatchTimeline
}

export interface ParticipantIdentity {
  participantId: number
  player: {
    summonerId: number
    summonerName: string
    puuid: string
    profileIcon: number
  }
}

export interface RankedStats {
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
