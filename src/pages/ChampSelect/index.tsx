import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Users, Swords, ExternalLink } from 'lucide-react'
import { useChampSelectStore, useDataStore, useGameFlowStore } from '../../store'
import { useNavigate } from 'react-router-dom'
import CareerDetail from '../../components/CareerDetail'
import type { ChampSelectSession, ChampSelectPlayer } from '../../../shared/types'

export default function ChampSelect() {
  const { session, timer } = useChampSelectStore()
  const { phase } = useGameFlowStore()
  const { champions } = useDataStore()
  const navigate = useNavigate()
  const [selectedPlayer, setSelectedPlayer] = useState<ChampSelectPlayer | null>(null)
  const [redirectedChampionId, setRedirectedChampionId] = useState<number>(0)

  const championsMap = new Map(champions.map(c => [c.id, c]))

  // 检查是否有有效的计时器数据
  const hasValidTimer = timer && timer.remaining > 0
  
  const getChampionName = (id: number): string => {
    return championsMap.get(id)?.name || `英雄${id}`
  }

  const getChampionIconUrl = (id: number): string => {
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${id}.png`
  }



  // 跳转到出装页面
  const goToBuildPage = (championId: number, position: string) => {
    const normalizedPos = normalizePosition(position)
    navigate(`/build?championId=${championId}&position=${normalizedPos}`)
  }

  // 自动选择自己为默认显示，并检测是否所有英雄已锁定
  useEffect(() => {
    if (session) {
      const localPlayer = session.myTeam.find(p => p.cellId === session.localPlayerCellId)

      if (localPlayer) {
        // 只有在本地玩家已经选择了英雄且当前没有选中任何玩家时，才自动选中自己
        // 或者如果已经选中了自己，更新自己的信息
        if (localPlayer.championId > 0 || localPlayer.championPickIntent > 0) {
          if (!selectedPlayer) {
            setSelectedPlayer(localPlayer)
          } else if (selectedPlayer.cellId === localPlayer.cellId) {
             // 保持选中状态，只更新数据
             setSelectedPlayer(localPlayer)
          }
        }
      }

      // 如果选中的是其他玩家，也要更新该玩家的数据
      if (selectedPlayer && session) {
        const updatedSelectedPlayer = [...session.myTeam, ...session.theirTeam].find(p => p.cellId === selectedPlayer.cellId)
        if (updatedSelectedPlayer) {
           // 只有当关键信息改变时才更新，避免频繁刷新导致 UI 重置
           if (updatedSelectedPlayer.championId !== selectedPlayer.championId || 
               updatedSelectedPlayer.championPickIntent !== selectedPlayer.championPickIntent) {
               setSelectedPlayer(updatedSelectedPlayer)
           }
        }
      }

      // 检查本地玩家是否已锁定英雄，如果是则自动跳转到出装页面
      // 必须确保当前确实处于选人阶段，防止退出房间后误跳转
      if (phase === 'ChampSelect' && localPlayer && localPlayer.championId > 0 && hasLocalPlayerLocked(session)) {
        if (redirectedChampionId !== localPlayer.championId) {
          setRedirectedChampionId(localPlayer.championId)
          const normalizedPos = normalizePosition(localPlayer.assignedPosition)
          setTimeout(() => {
            navigate(`/build?championId=${localPlayer.championId}&position=${normalizedPos}`)
          }, 500)
        }
      }
    }
  }, [session, navigate, redirectedChampionId, phase])
  
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
                    getChampionName={getChampionName}
                    getChampionIconUrl={getChampionIconUrl}
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
                    getChampionName={getChampionName}
                    getChampionIconUrl={getChampionIconUrl}
                    onClick={() => setSelectedPlayer(player)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* 右侧：详情面板 */}
        <div className="flex-1 lol-card p-3 min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0">
            <CareerDetail player={selectedPlayer} />
          </div>
          
          {/* 跳转到出装页面按钮 - 当选择了一个锁定了英雄或预选了英雄的玩家时显示 */}
          {selectedPlayer && (selectedPlayer.championId > 0 || selectedPlayer.championPickIntent > 0) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 pt-3 border-t border-lol-border/50 flex gap-2"
            >
              <button
                onClick={() => goToBuildPage(selectedPlayer.championId || selectedPlayer.championPickIntent, selectedPlayer.assignedPosition)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-b from-lol-gold/20 to-lol-gold-dark/20 border border-lol-gold hover:from-lol-gold/30 hover:to-lol-gold-dark/30 rounded transition-colors group"
              >
                <span className="text-sm font-medium text-lol-gold">查看出装推荐</span>
                <ExternalLink className="w-4 h-4 text-lol-gold group-hover:translate-x-0.5 transition-transform" />
              </button>
            </motion.div>
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
  getChampionName,
  getChampionIconUrl,
  onClick,
}: { 
  player: ChampSelectPlayer
  isLocal: boolean
  isSelected: boolean
  getChampionName: (id: number) => string
  getChampionIconUrl: (id: number) => string
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

  const activeChampionId = player.championId > 0 ? player.championId : player.championPickIntent
  const displayChampionName = activeChampionId > 0 ? getChampionName(activeChampionId) : '选择中...'
  const displayIconUrl = activeChampionId > 0 ? getChampionIconUrl(activeChampionId) : ''

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
        {activeChampionId > 0 ? (
          <img 
            src={displayIconUrl}
            alt={displayChampionName}
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
          {displayChampionName}
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

// 判断本地玩家是否已锁定英雄
function hasLocalPlayerLocked(session: ChampSelectSession): boolean {
  if (!session) return false
  
  // 检查是否处于 BAN_PICK 之后的阶段
  if (session.timer.phase === 'FINALIZATION' || session.timer.phase === 'GAME_START') {
    return true
  }
  
  // 检查是否有未完成的 pick 动作
  const myAction = findMyAction(session)
  if (myAction && myAction.type === 'pick' && !myAction.completed) {
    return false
  }
  
  // 检查是否已经选择了英雄
  const localPlayer = session.myTeam.find(p => p.cellId === session.localPlayerCellId)
  if (!localPlayer || localPlayer.championId === 0) {
    return false
  }

  // 遍历所有我的 pick 动作，检查是否有已完成的
  let hasCompletedPick = false
  for (const round of session.actions) {
    for (const action of round) {
      if (action.actorCellId === session.localPlayerCellId && action.type === 'pick') {
        if (action.completed) {
          hasCompletedPick = true
        }
      }
    }
  }
  
  return hasCompletedPick
}

