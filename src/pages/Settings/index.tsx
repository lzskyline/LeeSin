import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, RotateCcw, X, GripVertical } from 'lucide-react'
import { useSettingsStore, useDataStore, useNotificationStore } from '../../store'
import type { Champion } from '../../../shared/types'

const positions = [
  { id: 'top', label: '上单' },
  { id: 'jungle', label: '打野' },
  { id: 'mid', label: '中单' },
  { id: 'adc', label: 'ADC' },
  { id: 'support', label: '辅助' },
]

export default function Settings() {
  const { settings, setSettings } = useSettingsStore()
  const { champions } = useDataStore()
  const { addNotification } = useNotificationStore()
  
  const [activePosition, setActivePosition] = useState('mid')
  const [preferredChampions, setPreferredChampions] = useState<Record<string, number[]>>({})
  const [bannedChampions, setBannedChampions] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [region, setRegion] = useState('kr')
  const [tier, setTier] = useState('emerald_plus')
  
  useEffect(() => {
    if (settings) {
      setPreferredChampions(settings.preferredChampions || {})
      setBannedChampions(settings.bannedChampions || [])
      setRegion(settings.region || 'kr')
      setTier(settings.tier || 'emerald_plus')
    }
  }, [settings])
  
  const championsMap = new Map(champions.map(c => [c.id, c]))
  
  const getChampion = (id: number): Champion | undefined => championsMap.get(id)
  
  const filteredChampions = champions.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.alias.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const currentPreferred = preferredChampions[activePosition] || []
  
  const addPreferredChampion = (championId: number) => {
    if (currentPreferred.includes(championId)) return
    
    setPreferredChampions(prev => ({
      ...prev,
      [activePosition]: [...(prev[activePosition] || []), championId]
    }))
  }
  
  const removePreferredChampion = (championId: number) => {
    setPreferredChampions(prev => ({
      ...prev,
      [activePosition]: (prev[activePosition] || []).filter(id => id !== championId)
    }))
  }
  
  const addBannedChampion = (championId: number) => {
    if (bannedChampions.includes(championId)) return
    setBannedChampions(prev => [...prev, championId])
  }
  
  const removeBannedChampion = (championId: number) => {
    setBannedChampions(prev => prev.filter(id => id !== championId))
  }
  
  const handleSave = async () => {
    try {
      await window.electronAPI.settings.set({
        preferredChampions,
        bannedChampions,
        region,
        tier,
      })
      
      // 更新store
      if (settings) {
        setSettings({
          ...settings,
          preferredChampions,
          bannedChampions,
          region,
          tier,
        })
      }
      
      // 同步到主进程
      for (const [pos, champs] of Object.entries(preferredChampions)) {
        await window.electronAPI.automation.setPreferredChampions(pos, champs)
      }
      await window.electronAPI.automation.setBannedChampions(bannedChampions)
      
      addNotification('设置已保存', 'success')
    } catch (error) {
      addNotification('保存失败', 'error')
    }
  }
  
  const handleReset = () => {
    setPreferredChampions({})
    setBannedChampions([])
    setRegion('kr')
    setTier('emerald_plus')
    addNotification('设置已重置', 'info')
  }
  
  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display text-lol-gold">设置</h1>
        
        <div className="flex gap-2">
          <button onClick={handleReset} className="lol-button flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button onClick={handleSave} className="lol-button lol-button-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
      
      {/* 数据源设置 */}
      <div className="lol-card p-6">
        <h3 className="font-display text-lol-gold mb-4">数据源设置</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-lol-text-secondary mb-2">地区</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="lol-input w-full"
            >
              <option value="kr">韩服 (KR)</option>
              <option value="na">北美 (NA)</option>
              <option value="euw">欧西 (EUW)</option>
              <option value="eune">欧东 (EUNE)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-lol-text-secondary mb-2">段位</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="lol-input w-full"
            >
              <option value="emerald_plus">翡翠+</option>
              <option value="diamond_plus">钻石+</option>
              <option value="master_plus">大师+</option>
              <option value="all">全段位</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* 首选英雄设置 */}
      <div className="lol-card p-6">
        <h3 className="font-display text-lol-gold mb-4">首选英雄</h3>
        
        {/* 位置选择 */}
        <div className="flex gap-2 mb-4">
          {positions.map((pos) => (
            <button
              key={pos.id}
              onClick={() => setActivePosition(pos.id)}
              className={`
                px-4 py-2 rounded text-sm transition-colors
                ${activePosition === pos.id
                  ? 'bg-lol-gold text-lol-bg-primary font-medium'
                  : 'bg-lol-bg-tertiary text-lol-text-secondary hover:text-lol-text-primary'
                }
              `}
            >
              {pos.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-4">
          {/* 已选列表 */}
          <div className="w-64 bg-lol-bg-tertiary rounded p-3">
            <div className="text-sm text-lol-text-secondary mb-2">
              已选 ({currentPreferred.length})
            </div>
            <div className="space-y-1">
              {currentPreferred.map((id, index) => {
                const champion = getChampion(id)
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-2 bg-lol-bg-secondary rounded"
                  >
                    <GripVertical className="w-4 h-4 text-lol-text-muted cursor-grab" />
                    <span className="text-xs text-lol-text-muted w-4">{index + 1}</span>
                    <span className="flex-1 text-sm">{champion?.name || `ID:${id}`}</span>
                    <button
                      onClick={() => removePreferredChampion(id)}
                      className="p-1 hover:bg-lol-bg-tertiary rounded text-lol-text-muted hover:text-lol-error"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )
              })}
              {currentPreferred.length === 0 && (
                <div className="text-center text-sm text-lol-text-muted py-4">
                  点击右侧英雄添加
                </div>
              )}
            </div>
          </div>
          
          {/* 英雄选择 */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索英雄..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="lol-input w-full mb-3"
            />
            
            <div className="grid grid-cols-6 gap-2 max-h-60 overflow-auto">
              {filteredChampions.map((champion) => {
                const isSelected = currentPreferred.includes(champion.id)
                
                return (
                  <button
                    key={champion.id}
                    onClick={() => addPreferredChampion(champion.id)}
                    disabled={isSelected}
                    className={`
                      p-2 rounded text-xs text-center transition-colors
                      ${isSelected
                        ? 'bg-lol-gold/20 text-lol-gold border border-lol-gold-dark'
                        : 'bg-lol-bg-tertiary hover:bg-lol-bg-secondary text-lol-text-primary'
                      }
                    `}
                  >
                    {champion.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* 禁用英雄设置 */}
      <div className="lol-card p-6">
        <h3 className="font-display text-lol-gold mb-4">禁用英雄</h3>
        
        <div className="flex gap-4">
          {/* 已选列表 */}
          <div className="w-64 bg-lol-bg-tertiary rounded p-3">
            <div className="text-sm text-lol-text-secondary mb-2">
              已选 ({bannedChampions.length})
            </div>
            <div className="space-y-1">
              {bannedChampions.map((id) => {
                const champion = getChampion(id)
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-2 bg-lol-bg-secondary rounded"
                  >
                    <span className="flex-1 text-sm">{champion?.name || `ID:${id}`}</span>
                    <button
                      onClick={() => removeBannedChampion(id)}
                      className="p-1 hover:bg-lol-bg-tertiary rounded text-lol-text-muted hover:text-lol-error"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )
              })}
              {bannedChampions.length === 0 && (
                <div className="text-center text-sm text-lol-text-muted py-4">
                  点击右侧英雄添加
                </div>
              )}
            </div>
          </div>
          
          {/* 英雄选择 */}
          <div className="flex-1">
            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-auto">
              {champions.map((champion) => {
                const isSelected = bannedChampions.includes(champion.id)
                
                return (
                  <button
                    key={champion.id}
                    onClick={() => addBannedChampion(champion.id)}
                    disabled={isSelected}
                    className={`
                      p-2 rounded text-xs text-center transition-colors
                      ${isSelected
                        ? 'bg-lol-error/20 text-lol-error border border-lol-error/30'
                        : 'bg-lol-bg-tertiary hover:bg-lol-bg-secondary text-lol-text-primary'
                      }
                    `}
                  >
                    {champion.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
