import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles, Shield, Swords, Users, ArrowLeft, Crown, Database, Check } from 'lucide-react'
import { useLCUStore, useDataStore, useSettingsStore, useGameFlowStore, useNotificationStore, useBuildPageStore } from '../../store'
import { useLocation, useNavigate } from 'react-router-dom'
import type { CachedChampionBuild } from '../../../shared/types/opgg'

interface TierChampion {
  id: number
  tier: number
  rank: number
  winRate: number
  pickRate: number
  banRate?: number
  averagePlace?: number
  position?: string
}

const POSITIONS = [
  { id: 'top', label: '上单' },
  { id: 'jungle', label: '打野' },
  { id: 'mid', label: '中单' },
  { id: 'adc', label: '下路' },
  { id: 'support', label: '辅助' },
]

const MODES = [
  { id: 'ranked', label: '排位' },
  { id: 'aram', label: '极地大乱斗' },
  { id: 'arena', label: '竞技场' },
  { id: 'aram-mayhem', label: '符文大乱斗' },
]

export default function Build() {
  const { connected } = useLCUStore()
  const { champions } = useDataStore()
  const { settings } = useSettingsStore()
  const { phase } = useGameFlowStore()
  const { addNotification } = useNotificationStore()
  const { selectedChampionId: storedChampionId, selectedMode: storedMode, setSelectedChampionId, setSelectedMode: setStoredMode } = useBuildPageStore()
  const location = useLocation()
  const navigate = useNavigate()

  // 从URL参数获取初始值（优先级高于 store）
  const searchParams = new URLSearchParams(location.search)
  const initialChampionId = searchParams.get('championId')
  const initialPosition = searchParams.get('position') || 'mid'

  // 初始化：优先使用 URL 参数，其次使用 store 中保存的状态
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChampion, setSelectedChampionLocal] = useState<number | null>(
    initialChampionId ? parseInt(initialChampionId) : storedChampionId
  )
  const [selectedPosition, setSelectedPosition] = useState(initialPosition)
  const [selectedMode, setSelectedModeLocal] = useState(storedMode || 'ranked')
  const [build, setBuild] = useState<CachedChampionBuild | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showChampionList, setShowChampionList] = useState(false)
  const [allTierData, setAllTierData] = useState<any[]>([])  // 缓存完整的排行榜数据（包含所有分路）
  const [tierList, setTierList] = useState<TierChampion[]>([])
  const [tierLoading, setTierLoading] = useState(false)
  const [region, setRegion] = useState(settings?.region || 'kr')
  const [tier, setTier] = useState(settings?.tier || 'emerald_plus')
  const [applyingRunes, setApplyingRunes] = useState(false)
  const [applyingSpells, setApplyingSpells] = useState(false)
  const [actualPosition, setActualPosition] = useState<string | null>(null)  // 实际加载的分路（可能和 selectedPosition 不同）

  // 封装 setSelectedChampion，同时更新 store
  const setSelectedChampion = (id: number | null) => {
    setSelectedChampionLocal(id)
    setSelectedChampionId(id)
  }

  // 封装 setSelectedMode，同时更新 store
  const setSelectedMode = (mode: string) => {
    setSelectedModeLocal(mode)
    setStoredMode(mode)
  }

  // Sync with settings
  useEffect(() => {
    if (settings) {
      setRegion(settings.region || 'kr')
      setTier(settings.tier || 'emerald_plus')
    }
  }, [settings])

  // Listen for URL parameter changes (when navigating from champ select)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const championId = searchParams.get('championId')
    const position = searchParams.get('position')

    if (championId) {
      const parsedId = parseInt(championId)
      if (!isNaN(parsedId)) {
        setSelectedChampion(parsedId)
        setShowChampionList(false)
        setSearchQuery('')
        // 从URL跳转时手动加载build数据
        if (connected) {
          setTimeout(() => loadBuild(), 50)
        }
      }
    }

    if (position) {
      setSelectedPosition(position)
    }
  }, [location.search])

  // Filter champions based on search
  const filteredChampions = champions.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.alias.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 获取英雄的可用分路列表（从缓存的排行榜数据中）
  const getChampionPositions = (championId: number): string[] => {
    if (selectedMode !== 'ranked') return []  // 非排位模式没有分路概念
    const hero = allTierData.find((c: any) => c.id === championId)
    if (!hero?.positions) return []
    return hero.positions.map((p: any) => p.name.toLowerCase())
  }

  // 获取英雄的最佳分路（按胜率排序）
  const getBestPosition = (championId: number): string | null => {
    const positions = getChampionPositions(championId)
    if (positions.length === 0) return null

    // 从缓存数据中找到该英雄并按胜率排序
    const hero = allTierData.find((c: any) => c.id === championId)
    if (!hero?.positions) return null

    const sortedPositions = [...hero.positions].sort((a: any, b: any) => 
      (b.stats.win_rate || 0) - (a.stats.win_rate || 0)
    )

    return sortedPositions[0].name.toLowerCase()
  }

  // Load tier list when mode changes and no champion is selected
  // 注意：移除了 selectedPosition 依赖，因为现在使用 useMemo 过滤数据
  useEffect(() => {
    if (connected && !selectedChampion) {
      loadTierList()
    }
  }, [selectedMode, connected, selectedChampion, tier])

  // Load build when champion changes
  useEffect(() => {
    if (selectedChampion && connected) {
      loadBuild()
    }
  }, [selectedChampion, selectedMode, tier])

  const loadTierList = async () => {
    setTierLoading(true)
    try {
      const result = await window.electronAPI.data.getTierList(selectedMode, tier)
      if (result?.data) {
        // 保存完整的原始数据到 allTierData（用于后续查询英雄可用分路）
        setAllTierData(result.data)

        const parsed: TierChampion[] = result.data
          .map((c: any) => {
            // Arena/ARAM mode uses average_stats
            if (c.average_stats) {
              return {
                id: c.id,
                tier: c.average_stats.tier || 0,
                rank: c.average_stats.rank || 0,
                winRate: c.average_stats.win_rate || 0,
                pickRate: c.average_stats.pick_rate || 0,
                banRate: c.average_stats.ban_rate,
                averagePlace: c.average_stats.total_place && c.average_stats.play
                  ? c.average_stats.total_place / c.average_stats.play
                  : undefined,
              }
            }
            // Ranked mode uses positions
            const pos = c.positions?.[0]
            return {
              id: c.id,
              tier: pos?.stats?.tier_data?.tier || pos?.stats?.tier || 0,
              rank: pos?.stats?.tier_data?.rank || pos?.stats?.rank || 0,
              winRate: pos?.stats?.win_rate || 0,
              pickRate: pos?.stats?.pick_rate || 0,
              banRate: pos?.stats?.ban_rate,
              position: pos?.name,
            }
          })
          // 过滤胜率为0%的脏数据
          .filter((champ: TierChampion) => champ.winRate > 0)
          // 按胜率从高到低排序
          .sort((a: TierChampion, b: TierChampion) => b.winRate - a.winRate)
          // 只显示前30名
          .slice(0, 30)

        setTierList(parsed)
      }
    } catch (error) {
      console.error('Failed to load tier list', error)
    } finally {
      setTierLoading(false)
    }
  }

  // 根据选中的分路过滤排行榜数据（使用 useMemo 避免重复计算）
  const filteredTierList = useMemo(() => {
    if (selectedMode !== 'ranked' || !allTierData.length) {
      return tierList  // 非排位模式或没有数据时直接返回
    }

    const positionMap: Record<string, string> = {
      top: 'TOP',
      jungle: 'JUNGLE',
      mid: 'MID',
      adc: 'ADC',
      support: 'SUPPORT',
    }

    const targetPosition = positionMap[selectedPosition]

    const filtered = allTierData
      .map((c: any) => {
        // 找到该英雄在指定分路的数据
        const positionData = c.positions?.find((p: any) => p.name === targetPosition)
        if (!positionData) return null

        return {
          id: c.id,
          tier: positionData.stats?.tier_data?.tier || positionData.stats?.tier || 0,
          rank: positionData.stats?.tier_data?.rank || positionData.stats?.rank || 0,
          winRate: positionData.stats?.win_rate || 0,
          pickRate: positionData.stats?.pick_rate || 0,
          banRate: positionData.stats?.ban_rate,
          position: positionData.name,
        } as TierChampion  // 类型断言，确保返回类型正确
      })
      .filter((champ): champ is TierChampion => champ !== null && champ.winRate > 0)  // 过滤胜率为0%的脏数据
      .sort((a, b) => b.winRate - a.winRate)  // 按胜率从高到低排序
      .slice(0, 30)  // 只显示前30名

    return filtered
  }, [selectedMode, selectedPosition, allTierData, tierList])

  const loadBuild = async () => {
    if (!selectedChampion) return

    setIsLoading(true)
    try {
      // Arena and ARAM Mayhem don't need position
      const needsPosition = selectedMode !== 'arena' && selectedMode !== 'aram-mayhem'

      // 自动使用英雄的最佳分路（按胜率排序的第一个）
      let positionToLoad = 'none'

      if (needsPosition) {
        // 优先使用最佳分路
        const bestPosition = getBestPosition(selectedChampion)
        if (bestPosition) {
          positionToLoad = bestPosition
          setActualPosition(bestPosition)
        } else {
          // 如果没有排行榜数据，使用传入的分路或默认 mid
          positionToLoad = selectedPosition || 'mid'
          setActualPosition(positionToLoad)
        }
      } else {
        setActualPosition(null)
      }

      const result = await window.electronAPI.data.getChampionBuild(
        selectedChampion,
        positionToLoad,
        selectedMode
      )

      // 如果返回 null，尝试其他位置作为备选
      if (!result && needsPosition) {
        console.log(`No build data for ${selectedChampion} in ${positionToLoad}, trying fallback positions`)

        // 定义备选位置（按优先级）
        const fallbackPositions = ['mid', 'top', 'jungle', 'adc', 'support', 'utility', 'bottom']

        for (const fallbackPos of fallbackPositions) {
          if (fallbackPos === positionToLoad) continue

          const fallbackResult = await window.electronAPI.data.getChampionBuild(
            selectedChampion,
            fallbackPos,
            selectedMode
          )

          if (fallbackResult) {
            console.log(`Found build data in fallback position: ${fallbackPos}`)
            setBuild(fallbackResult)
            setActualPosition(fallbackPos)
            setIsLoading(false)
            return
          }
        }
      }

      setBuild(result)
    } catch (error) {
      console.error('Failed to load build', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 应用符文
  const handleApplyRunes = async (rune: { primaryStyleId: number; subStyleId: number; selectedPerkIds: number[] }) => {
    setApplyingRunes(true)
    try {
      const result = await window.electronAPI.automation.applyRunes(rune)
      addNotification(result.message, result.success ? 'success' : 'error')
    } catch (error: any) {
      addNotification(error.message || '应用符文失败', 'error')
    } finally {
      setApplyingRunes(false)
    }
  }

  // 应用召唤师技能
  const handleApplySpells = async (spell1: number, spell2: number) => {
    setApplyingSpells(true)
    try {
      const result = await window.electronAPI.automation.applySpells(spell1, spell2)
      addNotification(result.message, result.success ? 'success' : 'error')
    } catch (error: any) {
      addNotification(error.message || '应用召唤师技能失败', 'error')
    } finally {
      setApplyingSpells(false)
    }
  }

  const selectChampion = (championId: number) => {
    setSelectedChampion(championId)
    setShowChampionList(false)
    setSearchQuery('')
    // 更新URL参数
    const params = new URLSearchParams(location.search)
    params.set('championId', championId.toString())
    navigate(`${location.pathname}?${params.toString()}`, { replace: true })
  }

  const getChampionName = (id: number): string => {
    return champions.find(c => c.id === id)?.name || `Champion ${id}`
  }

  const formatPercent = (value?: number): string => {
    if (!value) return '0%'
    return `${(value * 100).toFixed(1)}%`
  }

  // 获取英雄头像URL
  const getChampionIconUrl = (championId: number): string => {
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`
  }

  // 符文系图标URL - 使用正确的CommunityDragon路径
  const getRuneStyleIconUrl = (styleId: number): string => {
    const styleMap: Record<number, string> = {
      8000: '7201_precision',      // 精密
      8100: '7200_domination',     // 主宰
      8200: '7202_sorcery',        // 巫术
      8300: '7203_whimsy',         // 启迪
      8400: '7204_resolve',        // 坚决
    }
    const styleName = styleMap[styleId] || '7201_precision'
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/${styleName}.png`
  }

  // 单个符文图标URL - CommunityDragon使用全小写路径
  const getPerkIconUrl = (perkId: number): string => {
    // 属性碎片 Stat Mods - 路径在 perk-images/statmods/
    const statModsMap: Record<number, string> = {
      5001: 'statmodshealthscalingicon',
      5002: 'statmodsarmoricon',
      5003: 'statmodsmagicresicon',
      5005: 'statmodsattackspeedicon',
      5007: 'statmodscdrscalingicon',
      5008: 'statmodsadaptiveforceicon',
      5010: 'statmodsmovementspeedicon',
      5011: 'statmodshealthplusicon',
      5013: 'statmodstenacityicon',
    }
    
    const statModIcon = statModsMap[perkId]
    if (statModIcon) {
      return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/${statModIcon}.png`
    }
    
    // 符文ID到路径的映射 - 注意：CommunityDragon服务器使用全小写路径
    const perkPathMap: Record<number, string> = {
      // 精密系 Precision (8000)
      8005: 'precision/presstheattack/presstheattack',
      8008: 'precision/lethaltempo/lethaltempotemp',
      8010: 'precision/conqueror/conqueror',
      8021: 'precision/fleetfootwork/fleetfootwork',
      8009: 'precision/presenceofmind/presenceofmind',
      9101: 'precision/absorblife/absorblife',
      9104: 'precision/legendalacrity/legendalacrity',
      9105: 'precision/legendhaste/legendhaste',
      9103: 'precision/legendbloodline/legendbloodline',
      9111: 'precision/triumph',
      8014: 'precision/coupdegrace/coupdegrace',
      8017: 'precision/cutdown/cutdown',
      8299: 'sorcery/laststand/laststand',
      // 主宰系 Domination (8100)
      8112: 'domination/electrocute/electrocute',
      8124: 'domination/predator/predator',
      8128: 'domination/darkharvest/darkharvest',
      9923: 'domination/hailofblades/hailofblades',
      8126: 'domination/cheapshot/cheapshot',
      8139: 'domination/tasteofblood/greenterror_tasteofblood',
      8143: 'domination/suddenimpact/suddenimpact',
      8136: 'domination/zombieward/zombieward',
      8120: 'domination/ghostporo/ghostporo',
      8138: 'domination/eyeballcollection/eyeballcollection',
      8135: 'domination/treasurehunter/treasurehunter',
      8134: 'domination/ingenioushunter/ingenioushunter',
      8105: 'domination/relentlesshunter/relentlesshunter',
      8106: 'domination/ultimatehunter/ultimatehunter',
      // 巫术系 Sorcery (8200)
      8214: 'sorcery/summonaery/summonaery',
      8229: 'sorcery/arcanecomet/arcanecomet',
      8230: 'sorcery/phaserush/phaserush',
      8224: 'sorcery/nullifyingorb/axiom_arcanist',
      8226: 'sorcery/manaflowband/manaflowband',
      8275: 'sorcery/nimbuscloak/6361',
      8210: 'sorcery/transcendence/transcendence',
      8234: 'sorcery/celerity/celeritytemp',
      8233: 'sorcery/absolutefocus/absolutefocus',
      8237: 'sorcery/scorch/scorch',
      8232: 'sorcery/waterwalking/waterwalking',
      8236: 'sorcery/gatheringstorm/gatheringstorm',
      // 坚决系 Resolve (8400)
      8437: 'resolve/graspoftheundying/graspoftheundying',
      8439: 'resolve/veteranaftershock/veteranaftershock',
      8465: 'resolve/guardian/guardian',
      8446: 'resolve/demolish/demolish',
      8463: 'resolve/fontoflife/fontoflife',
      8401: 'resolve/mirrorshell/mirrorshell',
      8429: 'resolve/conditioning/conditioning',
      8444: 'resolve/secondwind/secondwind',
      8473: 'resolve/boneplating/boneplating',
      8451: 'resolve/overgrowth/overgrowth',
      8453: 'resolve/revitalize/revitalize',
      8242: 'sorcery/unflinching/unflinching',
      // 启迪系 Inspiration (8300)
      8351: 'inspiration/glacialaugment/glacialaugment',
      8360: 'inspiration/unsealedspellbook/unsealedspellbook',
      8369: 'inspiration/firststrike/firststrike',
      8306: 'inspiration/hextechflashtraption/hextechflashtraption',
      8304: 'inspiration/magicalfootwear/magicalfootwear',
      8313: 'inspiration/perfecttiming/alchemistcabinet',
      8321: 'inspiration/cashback/cashback2',
      8316: 'inspiration/jackofalltrades/jackofalltrades2',
      8345: 'inspiration/biscuitdelivery/biscuitdelivery',
      8347: 'inspiration/cosmicinsight/cosmicinsight',
      8410: 'resolve/approachvelocity/approachvelocity',
      8352: 'inspiration/timewarptonic/timewarptonic',
    }
    const path = perkPathMap[perkId]
    if (path) {
      return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/${path}.png`
    }
    // 回退: 使用默认自适应之力图标
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsadaptiveforceicon.png`
  }

  // 获取装备图标URL - 使用Data Dragon (更稳定)
  const getItemIconUrl = (itemId: number): string => {
    return `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/${itemId}.png`
  }

  // 召唤师技能图标URL
  const getSpellIconUrl = (spellId: number): string => {
    const spellMap: Record<number, string> = {
      1: 'summoner_boost',        // 净化
      3: 'summoner_exhaust',      // 虚弱
      4: 'summoner_flash',        // 闪现
      6: 'summoner_haste',        // 幽灵疾步
      7: 'summoner_heal',         // 治疗
      11: 'summoner_smite',       // 惩戒
      12: 'summoner_teleport',    // 传送
      13: 'summonermana',         // 清晰术
      14: 'summonerignite',       // 点燃
      21: 'summonerbarrier',      // 屏障
      32: 'summoner_mark',        // 雪球 (ARAM)
      54: 'summoner_empty',       // 空
    }
    const spellName = spellMap[spellId] || 'summoner_flash'
    return `https://raw.communitydragon.org/latest/game/data/spells/icons2d/${spellName}.png`
  }

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lol-bg-tertiary border border-lol-border flex items-center justify-center">
            <Search size={24} className="text-lol-text-muted" />
          </div>
          <p className="text-lol-text-muted">请先连接LOL客户端</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      {/* Mode & Position & Data Source Selection */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mode Selection */}
        <div className="flex bg-gradient-to-b from-lol-bg-tertiary to-lol-bg-secondary rounded border border-lol-border p-0.5 shadow-lg">
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                selectedMode === mode.id
                  ? 'bg-gradient-to-b from-lol-gold to-lol-gold-dark text-lol-bg-primary shadow-gold'
                  : 'text-lol-text-secondary hover:text-lol-gold hover:bg-lol-bg-tertiary/50'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Data Source - 右侧 */}
        <div className="ml-auto flex items-center gap-1.5">
          <Database size={12} className="text-lol-text-muted" />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-lol-bg-tertiary border border-lol-border rounded px-1.5 py-1 text-xs text-lol-text-secondary focus:outline-none focus:border-lol-gold"
          >
            <option value="kr">韩服</option>
            <option value="na">北美</option>
            <option value="euw">欧西</option>
          </select>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="bg-lol-bg-tertiary border border-lol-border rounded px-1.5 py-1 text-xs text-lol-text-secondary focus:outline-none focus:border-lol-gold"
          >
            <option value="emerald_plus">翡翠+</option>
            <option value="diamond_plus">钻石+</option>
            <option value="master_plus">大师+</option>
          </select>
        </div>
      </div>

      {/* Champion Search - 紧凑版 */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <input
              type="text"
              placeholder="搜索英雄..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowChampionList(true)
              }}
              onFocus={() => setShowChampionList(true)}
              className="w-full bg-gradient-to-b from-lol-bg-tertiary to-lol-bg-secondary border border-lol-border rounded px-3 py-2 pr-8 text-sm text-lol-text-primary placeholder-lol-text-muted focus:outline-none focus:border-lol-gold transition-all"
            />
            <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-lol-text-muted" />
          </div>
          
          {selectedChampion && (
            <button
              onClick={() => {
                // 返回到出装排行榜，清空 selectedChampion
                setSelectedChampion(null)
                setBuild(null)
                setActualPosition(null)
                // 清除 URL 参数
                navigate(location.pathname, { replace: true })
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-b from-lol-bg-tertiary to-lol-bg-secondary rounded border border-lol-border hover:border-lol-gold/50 transition-colors"
            >
              <ArrowLeft size={14} className="text-lol-text-secondary" />
              <span className="text-sm text-lol-text-secondary">返回</span>
            </button>
          )}
        </div>

        {/* Champion Dropdown */}
        <AnimatePresence>
          {showChampionList && searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 bg-gradient-to-b from-lol-bg-tertiary to-lol-bg-secondary border border-lol-border rounded-lg shadow-2xl max-h-64 overflow-y-auto"
            >
              {filteredChampions.slice(0, 10).map(champion => (
                <button
                  key={champion.id}
                  onClick={() => selectChampion(champion.id)}
                  className="w-full px-4 py-2.5 text-left hover:bg-lol-gold/10 text-lol-text-primary transition-colors flex items-center gap-3 border-b border-lol-border/30 last:border-b-0"
                >
                  <img 
                    src={getChampionIconUrl(champion.id)}
                    alt={champion.name}
                    className="w-9 h-9 rounded-full border-2 border-lol-gold/30"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <span>{champion.name}</span>
                </button>
              ))}
              {filteredChampions.length === 0 && (
                <div className="px-4 py-3 text-lol-text-muted text-center">
                  未找到英雄
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Build Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin w-10 h-10 border-3 border-lol-gold border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-lol-text-muted text-sm">加载出装数据...</p>
          </div>
        </div>
      ) : build ? (
        <div className="space-y-3">
          {/* Summary Stats - 紧凑版英雄头卡 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lol-card p-3"
          >
            <div className="flex items-center gap-3">
              {/* 英雄头像 */}
              <div className="relative flex-shrink-0">
                <img 
                  src={getChampionIconUrl(build.championId)}
                  alt={getChampionName(build.championId)}
                  className="w-12 h-12 rounded-full border-2 border-lol-gold"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.opacity = '0.5'
                  }}
                />
                {build.summary.tier !== undefined && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-lol-gold rounded-full flex items-center justify-center text-[10px] font-bold text-lol-bg-primary">
                    T{build.summary.tier}
                  </div>
                )}
              </div>
              
              {/* 英雄名称和模式标签 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-display text-lol-gold">
                    {getChampionName(build.championId)}
                  </h3>
                  {/* 显示实际分路（排位模式） */}
                  {actualPosition && selectedMode === 'ranked' && (
                    <span className="text-xs text-lol-text-secondary bg-lol-bg-tertiary px-2 py-0.5 rounded">
                      {POSITIONS.find(p => p.id === actualPosition)?.label || actualPosition.toUpperCase()}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    selectedMode === 'aram' ? 'bg-blue-500/20 text-blue-400' :
                    selectedMode === 'aram-mayhem' ? 'bg-cyan-500/20 text-cyan-400' :
                    selectedMode === 'arena' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-lol-gold/20 text-lol-gold'
                  }`}>
                    {selectedMode === 'aram' ? '大乱斗' :
                     selectedMode === 'aram-mayhem' ? '符文大乱斗' :
                     selectedMode === 'arena' ? '竞技场' : '排位'}
                  </span>
                </div>
              </div>
              
              {/* 关键数据 - 紧凑显示 */}
              <div className="flex items-center gap-4 text-sm flex-shrink-0">
                <div className="text-center">
                  <span className="text-lol-success font-medium">{formatPercent(build.summary.winRate)}</span>
                  <span className="text-lol-text-muted text-xs ml-1">胜率</span>
                </div>
                <div className="text-center">
                  <span className="text-lol-blue font-medium">{formatPercent(build.summary.pickRate)}</span>
                  <span className="text-lol-text-muted text-xs ml-1">登场</span>
                </div>
                {build.summary.averagePlace !== undefined && (
                  <div className="text-center">
                    <span className="text-lol-gold font-medium">#{build.summary.averagePlace.toFixed(1)}</span>
                    <span className="text-lol-text-muted text-xs ml-1">名次</span>
                  </div>
                )}
                {build.summary.banRate !== undefined && build.summary.banRate > 0 && (
                  <div className="text-center">
                    <span className="text-lol-error font-medium">{formatPercent(build.summary.banRate)}</span>
                    <span className="text-lol-text-muted text-xs ml-1">禁用</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Runes Section (not for Arena) */}
          {build.runes && build.runes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lol-card p-3"
            >
              <h3 className="text-xs font-display text-lol-gold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles size={12} />
                推荐符文
              </h3>
              <div className="flex gap-2 flex-wrap">
                {[...build.runes]
                  .sort((a, b) => {
                    // 优先按胜率排序，胜率相同时按出场率排序
                    const winRateDiff = (b.pickRate || 0) - (a.pickRate || 0)
                    if (Math.abs(winRateDiff) > 0.001) return winRateDiff
                    return (b.pickRate || 0) - (a.pickRate || 0)
                  })
                  .slice(0, 2)
                  .map((rune, index) => (
                  <div key={index} className="group relative flex items-center gap-2 px-2 py-1.5 bg-lol-bg-tertiary rounded">
                    <img 
                      src={getRuneStyleIconUrl(rune.primaryStyleId)}
                      alt=""
                      className="w-7 h-7 rounded-full"
                    />
                    <img 
                      src={getRuneStyleIconUrl(rune.subStyleId)}
                      alt=""
                      className="w-7 h-7 rounded-full opacity-70"
                    />
                    <div className="flex gap-1">
                      {rune.selectedPerkIds.slice(0, 6).map((perkId, idx) => (
                        <img
                          key={idx}
                          src={getPerkIconUrl(perkId)}
                          alt=""
                          className="w-7 h-7 rounded"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-lol-success ml-1">{formatPercent(rune.pickRate)}</span>
                    
                    {/* 应用按钮 - 只在英雄选择阶段显示 */}
                    {phase === 'ChampSelect' && (
                      <button
                        onClick={() => handleApplyRunes(rune)}
                        disabled={applyingRunes}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-lol-gold text-lol-bg-primary text-xs rounded flex items-center gap-1 hover:bg-lol-gold-light disabled:opacity-50"
                      >
                        <Check size={12} />
                        应用
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Spells Section (not for Arena) */}
          {build.spells && build.spells.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lol-card p-3"
            >
              <h3 className="text-xs font-display text-lol-gold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Shield size={12} />
                召唤师技能
              </h3>
              <div className="flex gap-2 flex-wrap">
                {[...build.spells]
                  .sort((a, b) => {
                    // 优先按胜率排序，胜率相同时按出场率排序
                    const winRateDiff = (b.pickRate || 0) - (a.pickRate || 0)
                    if (Math.abs(winRateDiff) > 0.001) return winRateDiff
                    return (b.pickRate || 0) - (a.pickRate || 0)
                  })
                  .slice(0, 3)
                  .map((spell, index) => (
                  <div key={index} className="group relative flex items-center gap-1.5 px-2 py-1.5 bg-lol-bg-tertiary rounded">
                    {spell.ids.map((id, i) => (
                      <img
                        key={i}
                        src={getSpellIconUrl(id)}
                        alt=""
                        className="w-7 h-7 rounded"
                      />
                    ))}
                    <span className="text-xs text-lol-success ml-1">{formatPercent(spell.pickRate)}</span>
                    
                    {/* 应用按钮 - 只在英雄选择阶段且有两个技能时显示 */}
                    {phase === 'ChampSelect' && spell.ids.length >= 2 && (
                      <button
                        onClick={() => handleApplySpells(spell.ids[0], spell.ids[1])}
                        disabled={applyingSpells}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-lol-gold text-lol-bg-primary text-xs rounded flex items-center gap-1 hover:bg-lol-gold-light disabled:opacity-50"
                      >
                        <Check size={12} />
                        应用
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Items Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lol-card p-3"
          >
            <h3 className="text-xs font-display text-lol-gold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Swords size={12} />
              装备推荐
            </h3>
            
            <div className="space-y-3">
              {/* Starter Items */}
              {build.items.starter.length > 0 && (
                <div>
                  <p className="text-[10px] text-lol-text-muted mb-1">出门装</p>
                  <div className="flex flex-wrap gap-2">
                    {build.items.starter.slice(0, 2).map((item, index) => (
                      <div key={index} className="flex items-center gap-1 px-2 py-1 bg-lol-bg-tertiary rounded h-9">
                        {item.ids.map((id, i) => (
                          <img key={i} src={getItemIconUrl(id)} alt="" className="w-7 h-7 rounded" />
                        ))}
                        <span className="text-[10px] text-lol-success ml-1">{formatPercent(item.pickRate)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Core Items - 并排显示 */}
              {build.items.core.length > 0 && (
                <div>
                  <p className="text-[10px] text-lol-text-muted mb-1">核心装备</p>
                  <div className="flex flex-wrap gap-2">
                    {build.items.core.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-center gap-1 px-2 py-1 bg-lol-bg-tertiary rounded border border-lol-gold/20 h-9">
                        {item.ids.map((id, i) => (
                          <img key={i} src={getItemIconUrl(id)} alt="" className="w-7 h-7 rounded" />
                        ))}
                        <span className="text-[10px] text-lol-success ml-1">{formatPercent(item.pickRate)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Boots */}
              {build.items.boots.length > 0 && (
                <div>
                  <p className="text-[10px] text-lol-text-muted mb-1">鞋子</p>
                  <div className="flex flex-wrap gap-2">
                    {build.items.boots.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-center gap-1 px-2 py-1 bg-lol-bg-tertiary rounded h-9">
                        {item.ids.map((id, i) => (
                          <img key={i} src={getItemIconUrl(id)} alt="" className="w-7 h-7 rounded" />
                        ))}
                        <span className="text-[10px] text-lol-success ml-1">{formatPercent(item.pickRate)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Items */}
              {build.items.last.length > 0 && (
                <div>
                  <p className="text-[10px] text-lol-text-muted mb-1">可选装备</p>
                  <div className="flex flex-wrap gap-1">
                    {build.items.last.slice(0, 10).map((id, index) => (
                      <img key={index} src={getItemIconUrl(id)} alt="" className="w-7 h-7 rounded" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Arena/ARAM Mayhem Augments - 按稀有度分组 */}
          {build.augments && build.augments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="lol-card p-3"
            >
              <h3 className={`text-xs font-display mb-2 flex items-center gap-1.5 uppercase tracking-wider ${
                selectedMode === 'aram-mayhem' ? 'text-cyan-400' : 'text-lol-gold'
              }`}>
                <Sparkles size={12} />
                推荐强化符文
              </h3>
              
              {/* 按稀有度分组显示 */}
              {(() => {
                const isAramMayhem = selectedMode === 'aram-mayhem'
                // 分组: 棱彩 > 黄金 > 白银
                const prismatic = build.augments.filter(a => a.rarity === 'kPrismatic')
                const gold = build.augments.filter(a => a.rarity === 'kGold')
                const silver = build.augments.filter(a => a.rarity === 'kSilver' || !a.rarity)
                
                const rarityGroups = [
                  { name: '棱彩', items: prismatic, color: 'text-purple-400', bg: 'border-purple-500/30' },
                  { name: '黄金', items: gold, color: 'text-yellow-400', bg: 'border-yellow-500/30' },
                  { name: '白银', items: silver, color: 'text-gray-300', bg: 'border-gray-500/30' },
                ]
                
                return (
                  <div className="space-y-2">
                    {rarityGroups.map(group => group.items.length > 0 && (
                      <div key={group.name}>
                        <p className={`text-[10px] ${group.color} mb-1`}>{group.name}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.slice(0, 8).map((aug, index) => (
                            <div key={index} className={`flex items-center gap-1.5 px-2 py-1 bg-lol-bg-tertiary rounded border ${group.bg} h-8`}>
                              {aug.iconUrl ? (
                                <img src={aug.iconUrl} alt="" className="w-6 h-6 rounded" />
                              ) : (
                                <div className="w-6 h-6 rounded bg-lol-bg-secondary flex items-center justify-center text-[10px]">?</div>
                              )}
                              <span className={`text-[11px] truncate max-w-[80px] ${isAramMayhem ? 'text-cyan-300' : 'text-lol-text-primary'}`}>
                                {aug.name || `#${aug.id}`}
                              </span>
                              <span className="text-[10px] text-lol-success">{formatPercent(aug.pickRate)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </motion.div>
          )}

          {/* Arena Synergies (只在竞技场模式显示，符文大乱斗不显示) */}
          {build.synergies && build.synergies.length > 0 && selectedMode === 'arena' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lol-card p-5"
            >
              <h3 className="text-sm font-display text-lol-purple mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Users size={16} />
                最佳搭档
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {build.synergies.slice(0, 6).map((syn, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-lol-bg-tertiary rounded-lg">
                    <img 
                      src={getChampionIconUrl(syn.championId)}
                      alt=""
                      className="w-10 h-10 rounded-full border border-lol-gold/30"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.opacity = '0.3'
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-lol-text-primary">{getChampionName(syn.championId)}</p>
                      <p className="text-xs text-lol-text-muted">
                        #{syn.averagePlace.toFixed(1)} · {formatPercent(syn.winRate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Counters */}
          {build.counters && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="grid grid-cols-2 gap-4"
            >
              {/* Strong Against */}
              {build.counters.strongAgainst.length > 0 && (
                <div className="lol-card p-4">
                  <h3 className="text-sm font-medium text-lol-success mb-3">克制英雄</h3>
                  <div className="space-y-2">
                    {build.counters.strongAgainst.slice(0, 5).map((counter, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <img 
                          src={getChampionIconUrl(counter.championId)}
                          alt=""
                          className="w-8 h-8 rounded-full border border-lol-success/30"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.opacity = '0.3'
                          }}
                        />
                        <span className="flex-1 text-sm text-lol-text-secondary">
                          {getChampionName(counter.championId)}
                        </span>
                        <span className="text-sm text-lol-success">
                          {formatPercent(counter.winRate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak Against */}
              {build.counters.weakAgainst.length > 0 && (
                <div className="lol-card p-4">
                  <h3 className="text-sm font-medium text-lol-error mb-3">被克制英雄</h3>
                  <div className="space-y-2">
                    {build.counters.weakAgainst.slice(0, 5).map((counter, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <img 
                          src={getChampionIconUrl(counter.championId)}
                          alt=""
                          className="w-8 h-8 rounded-full border border-lol-error/30"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.opacity = '0.3'
                          }}
                        />
                        <span className="flex-1 text-sm text-lol-text-secondary">
                          {getChampionName(counter.championId)}
                        </span>
                        <span className="text-sm text-lol-error">
                          {formatPercent(counter.winRate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      ) : selectedChampion ? (
        <div className="text-center py-12 text-lol-text-muted">
          加载出装数据失败
        </div>
      ) : (
        /* 英雄胜率排行榜 */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lol-card p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Crown size={18} className="text-lol-gold" />
            <h3 className="text-sm font-display text-lol-gold uppercase tracking-wider">
              {MODES.find(m => m.id === selectedMode)?.label || '排位'} 英雄排行
            </h3>
            {/* 分路选择器 - 仅排位模式显示 */}
            {selectedMode === 'ranked' && (
              <div className="flex ml-auto bg-lol-bg-tertiary rounded border border-lol-border p-0.5">
                {POSITIONS.map(pos => (
                  <button
                    key={pos.id}
                    onClick={() => setSelectedPosition(pos.id)}
                    className={`px-2 py-1 rounded text-xs transition-all duration-200 ${
                      selectedPosition === pos.id
                        ? 'bg-lol-gold/20 text-lol-gold font-medium'
                        : 'text-lol-text-muted hover:text-lol-gold'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {tierLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-lol-gold border-t-transparent rounded-full" />
            </div>
          ) : (selectedMode === 'ranked' ? filteredTierList : tierList).length === 0 ? (
            <div className="text-center py-8 text-lol-text-muted">
              暂无排行数据
            </div>
          ) : (
            <div className="space-y-1">
              {/* 表头 */}
              <div className="flex items-center gap-2 px-2 py-1 text-xs text-lol-text-muted border-b border-lol-border/50">
                <span className="w-8 text-center">#</span>
                <span className="w-10"></span>
                <span className="flex-1">英雄</span>
                <span className="w-14 text-center">胜率</span>
                <span className="w-14 text-center">登场</span>
                {(selectedMode === 'arena' || selectedMode === 'aram-mayhem') ? (
                  <span className="w-14 text-center">名次</span>
                ) : (
                  <span className="w-14 text-center">禁用</span>
                )}
              </div>

              {/* 排行列表 - 根据模式选择使用过滤后的数据 */}
              {(selectedMode === 'ranked' ? filteredTierList : tierList).map((champ, index) => (
                <motion.div
                  key={champ.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => selectChampion(champ.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors hover:bg-lol-gold/10 ${
                    index < 3 ? 'bg-lol-gold/5' : ''
                  }`}
                >
                  <span className={`w-8 text-center text-sm font-medium ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-300' :
                    index === 2 ? 'text-amber-600' :
                    'text-lol-text-muted'
                  }`}>
                    {index + 1}
                  </span>
                  <img
                    src={getChampionIconUrl(champ.id)}
                    alt=""
                    className="w-8 h-8 rounded-full border border-lol-border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.opacity = '0.3'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-lol-text-primary truncate block">
                      {getChampionName(champ.id)}
                    </span>
                    {champ.position && (
                      <span className="text-[10px] text-lol-text-muted">
                        {champ.position.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className={`w-14 text-center text-sm ${
                    champ.winRate >= 0.52 ? 'text-lol-success' :
                    champ.winRate <= 0.48 ? 'text-lol-error' :
                    'text-lol-text-primary'
                  }`}>
                    {formatPercent(champ.winRate)}
                  </span>
                  <span className="w-14 text-center text-sm text-lol-blue">
                    {formatPercent(champ.pickRate)}
                  </span>
                  {(selectedMode === 'arena' || selectedMode === 'aram-mayhem') ? (
                    <span className="w-14 text-center text-sm text-lol-gold">
                      #{champ.averagePlace?.toFixed(1) || '-'}
                    </span>
                  ) : (
                    <span className="w-14 text-center text-sm text-lol-text-muted">
                      {champ.banRate ? formatPercent(champ.banRate) : '-'}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
