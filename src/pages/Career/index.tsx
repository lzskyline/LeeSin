import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Trophy, Swords, RefreshCw } from 'lucide-react'
import { useLCUStore } from '../../store'

interface MatchGame {
  gameId: number
  queueId: number
  gameCreation: number
  gameDuration: number
  championId: number
  win: boolean
  kills: number
  deaths: number
  assists: number
  cs: number
  gold: number
  items: number[]
  gameMode?: string
}

interface RankedInfo {
  tier: string
  division: string
  lp: number
  wins: number
  losses: number
}

const TIER_COLORS: Record<string, string> = {
  IRON: '#5c5c5c',
  BRONZE: '#cd7f32',
  SILVER: '#c0c0c0',
  GOLD: '#ffd700',
  PLATINUM: '#00cec9',
  EMERALD: '#2ecc71',
  DIAMOND: '#9b59b6',
  MASTER: '#e74c3c',
  GRANDMASTER: '#e74c3c',
  CHALLENGER: '#f39c12',
}

const TIER_NAMES: Record<string, string> = {
  IRON: '坚韧黑铁',
  BRONZE: '英勇黄铜',
  SILVER: '不屈白银',
  GOLD: '荣耀黄金',
  PLATINUM: '华贵铂金',
  EMERALD: '流光翡翠',
  DIAMOND: '璀璨钻石',
  MASTER: '超凡大师',
  GRANDMASTER: '傲世宗师',
  CHALLENGER: '最强王者',
}

export default function Career() {
  const { connected, summoner } = useLCUStore()
  const [searchName, setSearchName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [matches, setMatches] = useState<MatchGame[]>([])
  const [rankedInfo, setRankedInfo] = useState<{ solo?: RankedInfo; flex?: RankedInfo }>({})
  const [currentPuuid, setCurrentPuuid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load current summoner's data on mount
  useEffect(() => {
    if (connected && summoner?.puuid) {
      loadSummonerData(summoner.puuid)
    }
  }, [connected, summoner])

  const loadSummonerData = async (puuid: string) => {
    setIsLoading(true)
    setError(null)
    setCurrentPuuid(puuid)

    try {
      // Load match history
      const historyResult = await window.electronAPI.career.getMatchHistory(puuid, 0, 20)
      
      // API返回格式可能是 { games: { games: [...] } } 或 { games: [...] }
      let gamesArray: any[] = []
      if (historyResult) {
        if (Array.isArray(historyResult.games)) {
          gamesArray = historyResult.games
        } else if (historyResult.games?.games && Array.isArray(historyResult.games.games)) {
          gamesArray = historyResult.games.games
        } else if (Array.isArray(historyResult)) {
          gamesArray = historyResult
        }
      }
      
      if (gamesArray.length > 0) {
        const parsedMatches = parseMatches(gamesArray)
        setMatches(parsedMatches)
      } else {
        setMatches([])
      }

      // Load ranked stats
      const rankedResult = await window.electronAPI.career.getRankedStats(puuid)
      if (rankedResult?.queueMap) {
        const solo = rankedResult.queueMap.RANKED_SOLO_5x5
        const flex = rankedResult.queueMap.RANKED_FLEX_SR
        
        setRankedInfo({
          solo: solo ? {
            tier: solo.tier,
            division: solo.division,
            lp: solo.leaguePoints,
            wins: solo.wins,
            losses: solo.losses,
          } : undefined,
          flex: flex ? {
            tier: flex.tier,
            division: flex.division,
            lp: flex.leaguePoints,
            wins: flex.wins,
            losses: flex.losses,
          } : undefined,
        })
      }
    } catch (err: any) {
      console.error('Load summoner data error:', err)
      setError(err.message || '加载数据失败')
    } finally {
      setIsLoading(false)
    }
  }

  const parseMatches = (games: any[]): MatchGame[] => {
    return games.map(game => {
      const participant = game.participants?.[0]
      if (!participant) {
        return null
      }
      const stats = participant.stats || {}
      
      return {
        gameId: game.gameId,
        queueId: game.queueId,
        gameCreation: game.gameCreation,
        gameDuration: game.gameDuration,
        championId: participant.championId,
        win: stats.win || false,
        kills: stats.kills || 0,
        deaths: stats.deaths || 0,
        assists: stats.assists || 0,
        cs: (stats.totalMinionsKilled || 0) + (stats.neutralMinionsKilled || 0),
        gold: stats.goldEarned || 0,
        items: [stats.item0, stats.item1, stats.item2, stats.item3, stats.item4, stats.item5, stats.item6].filter(Boolean),
        gameMode: getGameMode(game.queueId),
      }
    }).filter(Boolean) as MatchGame[]
  }

  const getGameMode = (queueId: number): string => {
    const modeMap: Record<number, string> = {
      420: '单双排',
      440: '灵活组排',
      450: '大乱斗',
      900: '无限火力',
      1010: '雪球大作战',
      1020: '极限闪击',
      1300: '极限闪击',
      1400: '终极魔典',
      1700: '竞技场',
      1710: '竞技场',
      1810: '蜂群作战',
      1820: '蜂群作战',
      1830: '蜂群作战',
      1840: '蜂群作战',
      1900: '无限火力',
      2400: '符文大乱斗',
      430: '匹配模式',
      400: '匹配模式',
      490: '快速游戏',
      830: '入门人机',
      840: '新手人机',
      850: '一般人机',
      870: '排位灵活',
      880: '排位灵活',
      1090: '云顶之弈',
      1100: '云顶排位',
      1111: '云顶之弈',
      2000: '教程',
      2010: '教程',
      2020: '教程',
    }
    return modeMap[queueId] || '其他模式'
  }

  const handleSearch = async () => {
    if (!searchName.trim()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.career.getSummonerByName(searchName.trim())
      if (result?.puuid) {
        await loadSummonerData(result.puuid)
      } else {
        setError('未找到该召唤师')
      }
    } catch (err: any) {
      setError(err.message || '搜索失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToMe = () => {
    if (summoner?.puuid) {
      loadSummonerData(summoner.puuid)
      setSearchName('')
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
    return date.toLocaleDateString('zh-CN')
  }

  const getKDA = (k: number, d: number, a: number): string => {
    if (d === 0) return '完美'
    return ((k + a) / d).toFixed(2)
  }

  const getTierName = (tier: string): string => {
    return TIER_NAMES[tier] || tier
  }

  // Calculate stats
  const totalGames = matches.length
  const wins = matches.filter(m => m.win).length
  const losses = totalGames - wins
  const winRate = totalGames > 0 ? (wins / totalGames * 100).toFixed(1) : '0'
  const avgKills = totalGames > 0 ? (matches.reduce((a, m) => a + m.kills, 0) / totalGames).toFixed(1) : '0'
  const avgDeaths = totalGames > 0 ? (matches.reduce((a, m) => a + m.deaths, 0) / totalGames).toFixed(1) : '0'
  const avgAssists = totalGames > 0 ? (matches.reduce((a, m) => a + m.assists, 0) / totalGames).toFixed(1) : '0'

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lol-text-muted">请先连接LOL客户端</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="搜索召唤师名称..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-lol-bg-secondary border border-lol-border rounded-lg px-4 py-2 pr-10 text-lol-text-primary placeholder-lol-text-muted focus:outline-none focus:border-lol-gold"
          />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-lol-text-secondary hover:text-lol-gold"
          >
            <Search size={18} />
          </button>
        </div>
        {currentPuuid !== summoner?.puuid && (
          <button
            onClick={handleBackToMe}
            className="px-4 py-2 bg-lol-gold text-lol-bg-primary rounded-lg font-medium hover:bg-lol-gold-light transition-colors"
          >
            返回我的
          </button>
        )}
        <button
          onClick={() => currentPuuid && loadSummonerData(currentPuuid)}
          disabled={isLoading}
          className="p-2 text-lol-text-secondary hover:text-lol-gold disabled:opacity-50"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-lol-error/20 border border-lol-error/50 rounded-lg p-3 text-lol-error text-sm">
          {error}
        </div>
      )}

      {/* 排位信息卡片 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 单排 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lol-card p-4"
        >
          <div className="flex items-center gap-3">
            <Trophy size={24} className="text-lol-gold" />
            <div>
              <h3 className="text-sm text-lol-text-secondary">单双排位</h3>
              {rankedInfo.solo ? (
                <>
                  <p 
                    className="text-lg font-display font-bold"
                    style={{ color: TIER_COLORS[rankedInfo.solo.tier] || '#c89b3c' }}
                  >
                    {getTierName(rankedInfo.solo.tier)} {rankedInfo.solo.division}
                  </p>
                  <p className="text-xs text-lol-text-muted">
                    {rankedInfo.solo.lp} 胜点 · {rankedInfo.solo.wins}胜 {rankedInfo.solo.losses}负
                  </p>
                </>
              ) : (
                <p className="text-lol-text-muted">未定级</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* 灵活组排 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lol-card p-4"
        >
          <div className="flex items-center gap-3">
            <Swords size={24} className="text-lol-blue" />
            <div>
              <h3 className="text-sm text-lol-text-secondary">灵活组排</h3>
              {rankedInfo.flex ? (
                <>
                  <p 
                    className="text-lg font-display font-bold"
                    style={{ color: TIER_COLORS[rankedInfo.flex.tier] || '#c89b3c' }}
                  >
                    {getTierName(rankedInfo.flex.tier)} {rankedInfo.flex.division}
                  </p>
                  <p className="text-xs text-lol-text-muted">
                    {rankedInfo.flex.lp} 胜点 · {rankedInfo.flex.wins}胜 {rankedInfo.flex.losses}负
                  </p>
                </>
              ) : (
                <p className="text-lol-text-muted">未定级</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 近期战绩统计 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="lol-card p-3"
      >
        <h3 className="text-xs text-lol-text-secondary mb-2">最近 {totalGames} 场对局</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xl font-display text-lol-gold">{winRate}%</p>
            <p className="text-[10px] text-lol-text-muted">胜率</p>
          </div>
          <div>
            <p className="text-sm">
              <span className="text-lol-success">{wins}胜</span>
              <span className="text-lol-text-muted"> / </span>
              <span className="text-lol-error">{losses}负</span>
            </p>
            <p className="text-[10px] text-lol-text-muted">胜/负</p>
          </div>
          <div>
            <p className="text-sm text-lol-text-primary">
              {avgKills} / {avgDeaths} / {avgAssists}
            </p>
            <p className="text-[10px] text-lol-text-muted">平均KDA</p>
          </div>
          <div>
            <p className="text-sm text-lol-text-primary">
              {totalGames > 0 ? getKDA(
                matches.reduce((a, m) => a + m.kills, 0),
                matches.reduce((a, m) => a + m.deaths, 0),
                matches.reduce((a, m) => a + m.assists, 0)
              ) : '0'}
            </p>
            <p className="text-[10px] text-lol-text-muted">KDA比</p>
          </div>
        </div>
      </motion.div>

      {/* 对局历史列表 */}
      <div className="space-y-1.5">
        <h3 className="text-xs text-lol-text-secondary">对局历史</h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={24} className="animate-spin text-lol-gold" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-8 text-lol-text-muted">
            暂无对局记录
          </div>
        ) : (
          <div className="space-y-1.5">
            {matches.map((match, index) => (
              <motion.div
                key={match.gameId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-2 p-2 rounded-lg border ${
                  match.win
                    ? 'bg-lol-success/10 border-lol-success/30'
                    : 'bg-lol-error/10 border-lol-error/30'
                }`}
              >
                {/* 胜负指示条 */}
                <div className={`w-1 h-10 rounded-full flex-shrink-0 ${match.win ? 'bg-lol-success' : 'bg-lol-error'}`} />

                {/* 英雄图标 */}
                <img
                  src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${match.championId}.png`}
                  alt=""
                  className="w-10 h-10 rounded-lg border border-lol-border-dark flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />

                {/* 对局信息 - 固定宽度 */}
                <div className="w-[100px] flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium ${match.win ? 'text-lol-success' : 'text-lol-error'}`}>
                      {match.win ? '胜利' : '失败'}
                    </span>
                    <span className="text-[10px] text-lol-text-muted">
                      {formatDuration(match.gameDuration)}
                    </span>
                  </div>
                  <div className="text-[10px] text-lol-text-secondary mt-0.5">
                    <span className="px-1 py-0.5 rounded bg-lol-bg-tertiary">
                      {match.gameMode}
                    </span>
                  </div>
                </div>

                {/* KDA - 固定宽度 */}
                <div className="w-[80px] text-center flex-shrink-0">
                  <p className="text-xs font-medium text-lol-text-primary">
                    {match.kills} / <span className="text-lol-error">{match.deaths}</span> / {match.assists}
                  </p>
                  <p className="text-[10px] text-lol-text-muted">
                    {getKDA(match.kills, match.deaths, match.assists)} KDA
                  </p>
                </div>

                {/* 装备 - 固定宽度 */}
                <div className="flex items-center gap-0.5 w-[170px] flex-shrink-0">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const itemId = match.items[idx]
                    return itemId && itemId > 0 ? (
                      <img
                        key={idx}
                        src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/${itemId}.png`}
                        alt=""
                        className="w-6 h-6 rounded border border-lol-border-dark"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div key={idx} className="w-6 h-6 rounded bg-lol-bg-tertiary/50 border border-lol-border-dark" />
                    )
                  })}
                  {/* 饰品位 */}
                  {match.items[6] && match.items[6] > 0 ? (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/${match.items[6]}.png`}
                      alt=""
                      className="w-5 h-5 rounded-full border border-lol-gold-dark ml-0.5"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-lol-bg-tertiary/50 border border-lol-border-dark ml-0.5" />
                  )}
                </div>

                {/* CS、金币和时间 - 靠右展示 */}
                <div className="flex items-center gap-3 ml-auto text-xs flex-shrink-0">
                  <div className="text-right w-[50px]">
                    <p className="text-lol-text-secondary">{match.cs} CS</p>
                    <p className="text-lol-gold text-[10px]">{(match.gold / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="text-[10px] text-lol-text-muted w-[60px] text-right">
                    {formatTime(match.gameCreation)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
