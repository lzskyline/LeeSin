import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, Users, Shield } from 'lucide-react'
import { useNotificationStore, useLCUStore, useChampSelectStore } from '../../store'
import type { ChampSelectPlayer } from '../../../shared/types'

interface CareerDetailProps {
  player: ChampSelectPlayer | null
}

interface MatchHistoryItem {
  gameId: number
  championId: number
  win: boolean
  kills: number
  deaths: number
  assists: number
  gameMode: string
  timestamp: number
}

interface RankedStats {
  tier: string
  rank: string
  wins: number
  losses: number
}

export default function CareerDetail({ player }: CareerDetailProps) {
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([])
  const [rankedStats, setRankedStats] = useState<RankedStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [summonerInfo, setSummonerInfo] = useState<{ displayName: string; puuid: string; profileIconId?: number } | null>(null)
  const { addNotification } = useNotificationStore()
  const { summoner } = useLCUStore()
  const { session } = useChampSelectStore()

  useEffect(() => {
    if (player && player.summonerId !== 0) {
      loadSummonerInfo()
    }
  }, [player?.summonerId, player?.puuid, summoner])

  useEffect(() => {
    if (summonerInfo?.puuid) {
      loadCareerData(summonerInfo.puuid)
    }
  }, [summonerInfo?.puuid])

  const loadSummonerInfo = async () => {
    if (!player) return

    // 如果是本地玩家，直接使用 Store 中的信息
    if (session && player.cellId === session.localPlayerCellId && summoner) {
      setSummonerInfo({
        displayName: summoner.gameName ? `${summoner.gameName}#${summoner.tagLine}` : summoner.displayName,
        puuid: summoner.puuid,
        profileIconId: summoner.profileIconId
      })
      return
    }

    // 如果player有puuid，直接使用
    if (player.puuid) {
      try {
        const info = await window.electronAPI.career.getSummonerByPuuid(player.puuid)
        if (info) {
          setSummonerInfo({
            displayName: info.gameName ? `${info.gameName}#${info.tagLine}` : (info.displayName || '召唤师'),
            puuid: player.puuid,
            profileIconId: info.profileIconId
          })
        }
      } catch (error) {
        console.error('Failed to get summoner info', error)
      }
      return
    }

    // 如果没有puuid但有summonerId，尝试通过其他方式获取
    setSummonerInfo({
      displayName: '召唤师',
      puuid: player.puuid || ''
    })
  }

  const loadCareerData = async (puuid: string) => {
    if (!puuid) {
      setMatchHistory([])
      setRankedStats(null)
      return
    }

    setIsLoading(true)
    try {
      // 获取战绩数据
      const history = await window.electronAPI.career.getMatchHistory(puuid, 0, 10)
      if (history?.games?.games) {
        setMatchHistory(history.games.games.map((game: any) => {
          const participant = game.participants?.[0]
          return {
            gameId: game.gameId,
            championId: participant?.championId || 0,
            win: participant?.stats?.win || false,
            kills: participant?.stats?.kills || 0,
            deaths: participant?.stats?.deaths || 0,
            assists: participant?.stats?.assists || 0,
            gameMode: game.queueId?.toString() || 'unknown',
            timestamp: game.gameCreation || Date.now(),
          }
        }))
      } else {
        setMatchHistory([])
      }

      // 获取段位数据
      const stats = await window.electronAPI.career.getRankedStats(puuid)
      if (stats) {
        const rankedSolo = stats.queueMap?.RANKED_SOLO_5x5
        const current = stats.currentSeason
        
        setRankedStats({
          tier: stats.highestPreviousSeasonEndTier || current?.tier || 'UNRANKED',
          rank: stats.highestPreviousSeasonEndDivision || current?.division || '',
          wins: current?.wins || rankedSolo?.wins || 0,
          losses: current?.losses || rankedSolo?.losses || 0,
        })
      } else {
        setRankedStats(null)
      }
    } catch (error) {
      console.error('Failed to load career data', error)
      addNotification('加载战绩数据失败', 'error')
      setMatchHistory([])
      setRankedStats(null)
    } finally {
      setIsLoading(false)
    }
  }

  const getChampionIconUrl = (id: number): string => {
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${id}.png`
  }

  const formatKDA = (kills: number, deaths: number, assists: number): string => {
    if (deaths === 0) return 'Perfect'
    return ((kills + assists) / deaths).toFixed(2)
  }

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    return `${Math.floor(days / 30)}月前`
  }

  const getGameModeName = (queueId: string): string => {
    const queueMap: Record<string, string> = {
      '420': '单双排位',
      '430': '匹配模式',
      '440': '灵活排位',
      '450': '极地大乱斗',
      '900': '无限火力',
      '1900': '无限火力',
      '1300': '极限闪击',
      '1700': '斗魂竞技场',
      '1710': '斗魂竞技场1v1',
      '2400': '符文大乱斗',
    }
    return queueMap[queueId] || '未知模式'
  }

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Shield className="w-16 h-16 text-lol-text-muted mb-4" />
        <h2 className="text-xl font-display text-lol-gold mb-2">选择玩家查看战绩</h2>
        <p className="text-lol-text-secondary">点击左侧玩家卡片查看详细信息</p>
      </div>
    )
  }

  // 排除电脑玩家
  if (player.summonerId === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Users className="w-16 h-16 text-lol-text-muted mb-4" />
        <h2 className="text-xl font-display text-lol-gold mb-2">电脑玩家</h2>
        <p className="text-lol-text-secondary">无法查看电脑的战绩数据</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-lol-gold border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4 overflow-y-auto h-full p-1">
      {/* 玩家基本信息 - 固定高度 */}
      <div className="lol-card p-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-lol-bg-primary flex items-center justify-center overflow-hidden">
            {summonerInfo?.profileIconId ? (
              <img 
                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${summonerInfo.profileIconId}.jpg`}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            ) : (
              <span className="text-lg font-bold text-lol-gold">
                {(summonerInfo?.displayName || '?')[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-display text-lol-gold">
              {summonerInfo?.displayName || '召唤师'}
            </h3>
            <p className="text-sm text-lol-text-secondary">
              {player.assignedPosition || '未知位置'}
            </p>
          </div>
        </div>

        {/* 段位信息 */}
        {rankedStats && (
          <div className="flex items-center gap-3 p-3 bg-lol-bg-secondary rounded">
            <Trophy className="w-5 h-5 text-lol-gold" />
            <div className="flex-1">
              <div className="text-sm font-medium text-lol-text-primary">
                {rankedStats.tier} {rankedStats.rank}
              </div>
              <div className="text-xs text-lol-text-secondary">
                {rankedStats.wins}胜 {rankedStats.losses}负
                {rankedStats.wins + rankedStats.losses > 0 && 
                  ` (${((rankedStats.wins / (rankedStats.wins + rankedStats.losses)) * 100).toFixed(1)}%)`
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 近期战绩 */}
      <div className="lol-card p-4">
        <h4 className="text-base font-display text-lol-gold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          近期战绩 (最近10场)
        </h4>
        
        {matchHistory.length === 0 ? (
          <p className="text-lol-text-secondary text-center py-8">暂无战绩数据</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {matchHistory.slice(0, 10).map((game) => (
              <div 
                key={game.gameId}
                className={`
                  flex items-center gap-3 p-2 rounded
                  ${game.win ? 'bg-lol-success/10' : 'bg-lol-error/10'}
                `}
              >
                <img 
                  src={getChampionIconUrl(game.championId)}
                  alt=""
                  className="w-8 h-8 rounded"
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${game.win ? 'text-lol-success' : 'text-lol-error'}`}>
                      {game.win ? '胜利' : '失败'}
                    </span>
                    <span className="text-xs text-lol-text-muted">
                      {getGameModeName(game.gameMode)}
                    </span>
                    <span className="text-xs text-lol-text-muted">
                      {formatTimeAgo(game.timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-lol-text-secondary">
                    <span className="text-lol-gold">{game.kills}/{game.deaths}/{game.assists}</span>
                    <span>KDA: {formatKDA(game.kills, game.deaths, game.assists)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}