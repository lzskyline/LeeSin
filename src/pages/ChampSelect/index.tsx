import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Users, Swords } from 'lucide-react'
import { useChampSelectStore, useDataStore } from '../../store'
import BuildDetail from '../../components/BuildDetail'
import type { ChampSelectSession, ChampSelectPlayer } from '../../../shared/types'

export default function ChampSelect() {
  const { session, timer } = useChampSelectStore()
  const { champions } = useDataStore()
  const [selectedPlayer, setSelectedPlayer] = useState<ChampSelectPlayer | null>(null)
  
  const championsMap = new Map(champions.map(c => [c.id, c]))
  
  // 检查是否有有效的计时器数据
  const hasValidTimer = timer && timer.remaining > 0
  
  const getChampionName = (id: number): string => {
    return championsMap.get(id)?.name || `英雄${id}`
  }

  const getChampionIconUrl = (id: number): string => {
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${id}.png`
  }

  // 获取当前显示的英雄ID
  const getDisplayChampionId = (): number => {
    // 优先显示选中的队友英雄
    if (selectedPlayer && selectedPlayer.championId > 0) {
      return selectedPlayer.championId
    }
    // 否则显示自己的英雄
    const localPlayer = session?.myTeam.find(p => p.cellId === session?.localPlayerCellId)
    if (localPlayer && localPlayer.championId > 0) {
      return localPlayer.championId
    }
    return 0
  }

  // 检查英雄数据是否加载完成
  const isChampionDataReady = champions && champions.length > 0

  // 获取当前显示英雄的位置
  const getDisplayPosition = (): string => {
    if (selectedPlayer) {
      return normalizePosition(selectedPlayer.assignedPosition)
    }
    const localPlayer = session?.myTeam.find(p => p.cellId === session?.localPlayerCellId)
    return normalizePosition(localPlayer?.assignedPosition)
  }

  // 自动选择自己为默认显示
  useEffect(() => {
    if (session) {
      const localPlayer = session.myTeam.find(p => p.cellId === session.localPlayerCellId)
      // 只有在本地玩家已经选择了英雄时才自动选中
      if (localPlayer && localPlayer.championId > 0 && !selectedPlayer) {
        setSelectedPlayer(localPlayer)
      }
      // 如果当前选中的玩家没有英雄，清除选择
      if (selectedPlayer && selectedPlayer.championId === 0) {
        setSelectedPlayer(null)
      }
    }
  }, [session])
  
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Swords className="w-16 h-16 text-lol-text-muted mb-4" />
        <h2 className="text-xl font-display text-lol-gold mb-2">等待英雄选择</h2>
        <p className="text-lol-text-secondary">进入英雄选择阶段后，此页面将显示BP信息</p>
      </div>
    )
  }
  
  const myAction = findMyAction(session)
  const isMyTurn = myAction?.isInProgress || false
  const displayChampionId = getDisplayChampionId()
  const displayPosition = getDisplayPosition()

  // 判断是否支持应用符文/技能（排位、匹配、大乱斗支持）
  const canApply = true // 选人阶段都可以应用
  
  return (
    <div className="h-full flex flex-col p-3 gap-3">
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded
            ${isMyTurn ? 'bg-lol-gold/20 border border-lol-gold animate-pulse' : 'bg-lol-bg-secondary border border-lol-border-dark'}
          `}>
            <Clock className="w-4 h-4 text-lol-gold" />
            <span className="text-xl font-mono font-bold text-lol-gold">
              {hasValidTimer ? timer.remaining : '--'}
            </span>
            <span className="text-xs text-lol-text-secondary">秒</span>
          </div>
          
          <div className="text-xs text-lol-text-secondary">
            {timer.phase === 'BAN_PICK' && myAction?.type === 'ban' && '禁用阶段'}
            {timer.phase === 'BAN_PICK' && myAction?.type === 'pick' && '选择阶段'}
            {timer.phase === 'FINALIZATION' && '确认阶段'}
            {!timer.phase && '准备中...'}
          </div>
        </div>
        
        {isMyTurn && myAction && (
          <div className="text-sm text-lol-gold font-display">
            轮到你{myAction.type === 'ban' ? '禁用' : '选择'}英雄
          </div>
        )}
      </div>
      
      <div className="flex gap-3 flex-1 min-h-0">
        {/* 左侧：队伍信息 */}
        <div className="w-56 flex flex-col gap-3 flex-shrink-0 h-full">
          {/* 我方队伍 */}
          <div className="lol-card p-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2 flex-shrink-0">
              <Users className="w-4 h-4 text-lol-success" />
              <span className="text-xs font-medium text-lol-success">我方队伍</span>
            </div>
            <div className="flex-1 min-h-0">
              <div className="space-y-1.5 h-full overflow-hidden">
                {session.myTeam.map((player: ChampSelectPlayer) => (
                  <PlayerCard
                    key={player.cellId}
                    player={player}
                    isLocal={player.cellId === session.localPlayerCellId}
                    isSelected={selectedPlayer?.cellId === player.cellId}
                    championName={getChampionName(player.championId)}
                    championIconUrl={getChampionIconUrl(player.championId)}
                    onClick={() => setSelectedPlayer(player)}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* 敌方队伍 */}
          <div className="lol-card p-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2 flex-shrink-0">
              <Users className="w-4 h-4 text-lol-error" />
              <span className="text-xs font-medium text-lol-error">敌方队伍</span>
            </div>
            <div className="flex-1 min-h-0">
              <div className="space-y-1.5 h-full overflow-hidden">
                {session.theirTeam.map((player: ChampSelectPlayer) => (
                  <PlayerCard
                    key={player.cellId}
                    player={player}
                    isLocal={false}
                    isSelected={selectedPlayer?.cellId === player.cellId}
                    championName={getChampionName(player.championId)}
                    championIconUrl={getChampionIconUrl(player.championId)}
                    onClick={() => setSelectedPlayer(player)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 禁用信息 - 紧凑显示 */}
          <div className="lol-card p-2">
            <div className="flex gap-2 text-[10px]">
              <div className="flex-1">
                <span className="text-lol-text-muted">我方禁用: </span>
                <span className="text-lol-text-secondary">
                  {session.bans.myTeamBans.filter((id: number) => id > 0).map((id: number) => getChampionName(id)).join(', ') || '无'}
                </span>
              </div>
              <div className="flex-1">
                <span className="text-lol-text-muted">敌方禁用: </span>
                <span className="text-lol-text-secondary">
                  {session.bans.theirTeamBans.filter((id: number) => id > 0).map((id: number) => getChampionName(id)).join(', ') || '无'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 右侧：出装详情 */}
        <div className="flex-1 lol-card p-3 min-h-0 overflow-hidden flex flex-col">
          {displayChampionId > 0 ? (
            <BuildDetail
              championId={displayChampionId}
              position={displayPosition}
              mode="ranked"
              showApplyButtons={canApply}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-lol-text-muted">
              <Swords className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">选择英雄后显示出装推荐</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 玩家卡片组件
function PlayerCard({ 
  player, 
  isLocal,
  isSelected,
  championName,
  championIconUrl,
  onClick,
}: { 
  player: ChampSelectPlayer
  isLocal: boolean
  isSelected: boolean
  championName: string
  championIconUrl: string
  onClick: () => void
}) {
  const positionLabels: Record<string, string> = {
    top: '上单',
    jungle: '打野',
    middle: '中单',
    bottom: 'ADC',
    utility: '辅助',
    fill: '补位',
  }

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`
        flex items-center gap-2 p-2 rounded cursor-pointer transition-colors flex-shrink-0
        ${isSelected 
          ? 'bg-lol-gold/20 border border-lol-gold' 
          : isLocal 
            ? 'bg-lol-gold/10 border border-lol-gold-dark hover:bg-lol-gold/15' 
            : 'bg-lol-bg-tertiary hover:bg-lol-bg-secondary border border-transparent'
        }
      `}
    >
      {/* 英雄头像 - 固定尺寸占位符 */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-lol-bg-primary flex items-center justify-center overflow-hidden border border-lol-border">
        {player.championId > 0 ? (
          <img 
            src={championIconUrl}
            alt={championName}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        ) : (
          <span className="text-lol-text-muted text-lg leading-none">?</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="text-sm text-lol-text-primary truncate">
          {player.championId > 0 ? championName : '选择中...'}
        </div>
        <div className="text-[10px] text-lol-text-muted truncate">
          {positionLabels[player.assignedPosition?.toLowerCase()] || player.assignedPosition || ''}
        </div>
      </div>
      
      {isLocal && (
        <div className="flex-shrink-0 text-[10px] text-lol-gold px-1.5 py-0.5 bg-lol-gold/20 rounded">我</div>
      )}
    </motion.div>
  )
}

// 辅助函数
function findMyAction(session: ChampSelectSession) {
  for (const round of session.actions) {
    for (const action of round) {
      if (
        action.actorCellId === session.localPlayerCellId &&
        !action.completed &&
        action.isInProgress
      ) {
        return action
      }
    }
  }
  return null
}

function normalizePosition(position?: string): string {
  if (!position) return 'mid'
  const map: Record<string, string> = {
    top: 'top',
    jungle: 'jungle',
    middle: 'mid',
    mid: 'mid',
    bottom: 'adc',
    adc: 'adc',
    utility: 'support',
    support: 'support',
  }
  return map[position.toLowerCase()] || 'mid'
}
