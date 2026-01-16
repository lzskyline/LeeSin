// 游戏流状态常量
export const GAME_FLOW_PHASES = {
  NONE: 'None',
  LOBBY: 'Lobby',
  MATCHMAKING: 'Matchmaking',
  READY_CHECK: 'ReadyCheck',
  CHAMP_SELECT: 'ChampSelect',
  GAME_START: 'GameStart',
  IN_PROGRESS: 'InProgress',
  RECONNECT: 'Reconnect',
  END_OF_GAME: 'EndOfGame',
} as const

// LCU API端点
export const LCU_ENDPOINTS = {
  // 召唤师
  CURRENT_SUMMONER: '/lol-summoner/v1/current-summoner',
  SUMMONER_BY_PUUID: (puuid: string) => `/lol-summoner/v2/summoners/puuid/${puuid}`,
  SUMMONER_BY_NAME: '/lol-summoner/v1/summoners',
  
  // 游戏流
  GAMEFLOW_PHASE: '/lol-gameflow/v1/gameflow-phase',
  GAMEFLOW_SESSION: '/lol-gameflow/v1/session',
  RECONNECT: '/lol-gameflow/v1/reconnect',
  
  // 匹配
  READY_CHECK_ACCEPT: '/lol-matchmaking/v1/ready-check/accept',
  READY_CHECK: '/lol-matchmaking/v1/ready-check',
  
  // 英雄选择
  CHAMP_SELECT_SESSION: '/lol-champ-select/v1/session',
  CHAMP_SELECT_CURRENT: '/lol-champ-select/v1/current-champion',
  CHAMP_SELECT_ACTION: (id: number) => `/lol-champ-select/v1/session/actions/${id}`,
  CHAMP_SELECT_MY_SELECTION: '/lol-champ-select/v1/session/my-selection',
  CHAMP_SELECT_REROLL: '/lol-champ-select/v1/session/my-selection/reroll',
  CHAMP_SELECT_BENCH_SWAP: (id: number) => `/lol-champ-select/v1/session/bench/swap/${id}`,
  
  // 符文
  PERKS_PAGES: '/lol-perks/v1/pages',
  PERKS_CURRENT: '/lol-perks/v1/currentpage',
  PERKS_DELETE: (id: number) => `/lol-perks/v1/pages/${id}`,
  
  // 战绩
  MATCH_HISTORY: (puuid: string) => `/lol-match-history/v1/products/lol/${puuid}/matches`,
  MATCH_DETAIL: (gameId: number) => `/lol-match-history/v1/games/${gameId}`,
  RANKED_STATS: (puuid: string) => `/lol-ranked/v1/ranked-stats/${puuid}`,
  
  // 静态数据
  CHAMPIONS: '/lol-game-data/assets/v1/champion-summary.json',
  SUMMONER_SPELLS: '/lol-game-data/assets/v1/summoner-spells.json',
  PERKS: '/lol-game-data/assets/v1/perks.json',
  PERK_STYLES: '/lol-game-data/assets/v1/perkstyles.json',
  ITEMS: '/lol-game-data/assets/v1/items.json',
  AUGMENTS: '/lol-game-data/assets/v1/cherry-augments.json',
  QUEUES: '/lol-game-queues/v1/queues',
  
  // 秒退
  DODGE: '/lol-login/v1/session/invoke',
  
  // 观战
  SPECTATE_LAUNCH: '/lol-spectator/v1/spectate/launch',
} as const

// OP.GG API
export const OPGG_API = {
  BASE_URL: 'https://lol-api-champion.op.gg',
  TIER_LIST: (region: string, mode: string, tier: string) => 
    `/api/${region}/champions/${mode}?tier=${tier}`,
  CHAMPION_BUILD: (region: string, mode: string, championId: number, position: string, tier: string) =>
    `/api/${region}/champions/${mode}/${championId}/${position}?tier=${tier}`,
  ARENA_BUILD: (region: string, championId: number, tier: string) =>
    `/api/${region}/champions/arena/${championId}?tier=${tier}`,
} as const

// 默认配置
export const DEFAULT_SETTINGS = {
  autoAccept: true,
  autoAcceptDelay: 500,
  autoBP: false,
  autoRune: true,
  autoSpell: true,
  preferredChampions: {},
  bannedChampions: [],
  region: 'kr',
  tier: 'emerald_plus',
  gameMode: 'ranked',
} as const

// 游戏模式
export const GAME_MODES = {
  RANKED: 'ranked',
  ARAM: 'aram',
  ARENA: 'arena',
  URF: 'urf',
  ARAM_MAYHEM: 'aram-mayhem',  // 符文大乱斗
} as const

// 队列ID到游戏模式映射
export const QUEUE_MODE_MAP: Record<number, string> = {
  420: 'ranked',       // 单双排位
  430: 'ranked',       // 匹配模式
  440: 'ranked',       // 灵活排位
  450: 'aram',         // 极地大乱斗
  900: 'urf',          // 无限火力
  1900: 'urf',         // 无限火力
  1300: 'nexus_blitz', // 极限闪击
  1700: 'arena',       // 斗魂竞技场
  1710: 'arena',       // 斗魂竞技场 1v1
  2400: 'aram-mayhem', // 符文大乱斗
}

// 位置映射
export const POSITION_MAP: Record<string, string> = {
  TOP: 'top',
  JUNGLE: 'jungle',
  MIDDLE: 'mid',
  BOTTOM: 'adc',
  UTILITY: 'support',
  top: 'top',
  jungle: 'jungle',
  mid: 'mid',
  adc: 'adc',
  support: 'support',
}

// 召唤师技能ID
export const SUMMONER_SPELL_IDS = {
  FLASH: 4,
  IGNITE: 14,
  TELEPORT: 12,
  HEAL: 7,
  EXHAUST: 3,
  BARRIER: 21,
  CLEANSE: 1,
  GHOST: 6,
  SMITE: 11,
  MARK: 32, // ARAM Snowball
} as const
