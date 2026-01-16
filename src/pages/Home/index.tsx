import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Shield, Sparkles, Crosshair, RefreshCw } from 'lucide-react'
import { useLCUStore, useGameFlowStore, useSettingsStore, useDataStore } from '../../store'
import type { Summoner } from '../../../shared/types'

const features = [
  { id: 'autoAccept', label: '自动接受', icon: Zap, description: '匹配成功后自动接受对局' },
  { id: 'autoBP', label: '自动BP', icon: Crosshair, description: '自动选择/禁用预设英雄' },
  { id: 'autoRune', label: '自动符文', icon: Sparkles, description: '根据英雄自动设置推荐符文' },
  { id: 'autoSpell', label: '自动技能', icon: Shield, description: '自动设置召唤师技能' },
]

// 获取召唤师显示名称 (兼容Riot ID格式)
function getSummonerName(summoner: Summoner | null): string {
  if (!summoner) return ''
  // 优先使用gameName (Riot ID), 其次displayName
  return summoner.gameName || summoner.displayName || ''
}

export default function Home() {
  const { connected, summoner } = useLCUStore()
  const { phase } = useGameFlowStore()
  const { settings, updateSetting } = useSettingsStore()
  const { champions } = useDataStore()
  const [isLoading, setIsLoading] = useState(false)
  
  const summonerName = getSummonerName(summoner)
  
  const handleToggle = async (key: string, enabled: boolean) => {
    updateSetting(key as any, enabled)
    
    switch (key) {
      case 'autoAccept':
        await window.electronAPI.automation.toggleAutoAccept(enabled)
        break
      case 'autoBP':
        await window.electronAPI.automation.toggleAutoBP(enabled)
        break
      case 'autoRune':
        await window.electronAPI.automation.toggleAutoRune(enabled)
        break
      case 'autoSpell':
        await window.electronAPI.automation.toggleAutoSpell(enabled)
        break
    }
  }
  
  const handleDodge = async () => {
    if (phase !== 'ChampSelect') return
    
    setIsLoading(true)
    try {
      await window.electronAPI.champSelect.dodge()
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* 状态卡片 */}
      <div className="lol-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 头像 */}
            <div className="w-16 h-16 rounded-full bg-lol-bg-tertiary border-2 border-lol-gold-dark overflow-hidden flex items-center justify-center">
              {summoner?.profileIconId ? (
                <img 
                  src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${summoner.profileIconId}.jpg`}
                  alt="头像"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : summonerName ? (
                <span className="text-2xl font-display text-lol-gold">
                  {summonerName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <span className="text-lol-text-muted">?</span>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-display text-lol-gold">
                {connected ? (summonerName || '已连接') : '未连接'}
              </h2>
              <p className="text-sm text-lol-text-secondary">
                {connected ? `Lv.${summoner?.summonerLevel || 0}` : '等待连接LOL客户端...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 连接状态指示器 */}
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
              ${connected 
                ? 'bg-lol-success/10 text-lol-success border border-lol-success/30' 
                : 'bg-lol-error/10 text-lol-error border border-lol-error/30'
              }
            `}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-lol-success' : 'bg-lol-error'}`} />
              {connected ? '已连接' : '未连接'}
            </div>
          </div>
        </div>
      </div>
      
      {/* 功能开关 */}
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon
          const isEnabled = settings?.[feature.id as keyof typeof settings] as boolean
          
          return (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                lol-card p-4 cursor-pointer transition-all
                ${isEnabled ? 'border-lol-gold shadow-gold' : 'hover:border-lol-gold-dark'}
              `}
              onClick={() => handleToggle(feature.id, !isEnabled)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded flex items-center justify-center
                    ${isEnabled 
                      ? 'bg-lol-gold/20 text-lol-gold' 
                      : 'bg-lol-bg-tertiary text-lol-text-secondary'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lol-text-primary">{feature.label}</h3>
                    <p className="text-xs text-lol-text-secondary mt-0.5">{feature.description}</p>
                  </div>
                </div>
                
                {/* 开关 */}
                <div className={`
                  w-11 h-6 rounded-full p-0.5 transition-colors
                  ${isEnabled ? 'bg-lol-gold' : 'bg-lol-bg-tertiary'}
                `}>
                  <motion.div
                    className="w-5 h-5 rounded-full bg-white shadow"
                    animate={{ x: isEnabled ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
      
      {/* 快捷操作 */}
      <div className="lol-card p-6">
        <h3 className="font-display text-lol-gold mb-4">快捷操作</h3>
        
        <div className="flex gap-3">
          <button
            onClick={handleDodge}
            disabled={phase !== 'ChampSelect' || isLoading}
            className={`
              lol-button flex items-center gap-2
              ${phase === 'ChampSelect' ? '' : 'opacity-50 cursor-not-allowed'}
            `}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4" />
            )}
            秒退
          </button>
          
          <button
            onClick={() => window.electronAPI.gameflow.reconnectGame()}
            disabled={phase !== 'Reconnect'}
            className={`
              lol-button flex items-center gap-2
              ${phase === 'Reconnect' ? '' : 'opacity-50 cursor-not-allowed'}
            `}
          >
            <RefreshCw className="w-4 h-4" />
            重连游戏
          </button>
        </div>
      </div>
      
      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="lol-card p-4 text-center">
          <div className="text-2xl font-display text-lol-gold">{champions.length}</div>
          <div className="text-xs text-lol-text-secondary mt-1">英雄数据</div>
        </div>
        <div className="lol-card p-4 text-center">
          <div className="text-2xl font-display text-lol-gold">
            {Object.values(settings?.preferredChampions || {}).flat().length}
          </div>
          <div className="text-xs text-lol-text-secondary mt-1">首选英雄</div>
        </div>
        <div className="lol-card p-4 text-center">
          <div className="text-2xl font-display text-lol-gold">
            {settings?.bannedChampions?.length || 0}
          </div>
          <div className="text-xs text-lol-text-secondary mt-1">禁用英雄</div>
        </div>
      </div>
    </div>
  )
}
