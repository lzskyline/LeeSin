import { useState, useEffect } from 'react'
import { Sparkles, Shield, Swords, Check } from 'lucide-react'
import { useDataStore, useNotificationStore } from '../../store'
import type { CachedChampionBuild } from '../../../shared/types/opgg'

interface BuildDetailProps {
  championId: number
  position?: string
  mode?: string
  showApplyButtons?: boolean // 是否显示应用按钮
}

export default function BuildDetail({ championId, position = 'mid', mode = 'ranked', showApplyButtons = false }: BuildDetailProps) {
  const { champions } = useDataStore()
  const { addNotification } = useNotificationStore()
  const [build, setBuild] = useState<CachedChampionBuild | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [applyingRunes, setApplyingRunes] = useState(false)
  const [applyingSpells, setApplyingSpells] = useState(false)

  const getChampionName = (id: number): string => {
    return champions.find(c => c.id === id)?.name || `英雄${id}`
  }

  const getChampionIconUrl = (id: number): string => {
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${id}.png`
  }

  const formatPercent = (value?: number): string => {
    if (!value) return '0%'
    return `${(value * 100).toFixed(1)}%`
  }

  // 符文系图标URL
  const getRuneStyleIconUrl = (styleId: number): string => {
    const styleMap: Record<number, string> = {
      8000: '7201_precision',
      8100: '7200_domination',
      8200: '7202_sorcery',
      8300: '7203_whimsy',
      8400: '7204_resolve',
    }
    const styleName = styleMap[styleId] || '7201_precision'
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/${styleName}.png`
  }

  // 单个符文图标URL
  const getPerkIconUrl = (perkId: number): string => {
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
    
    const perkPathMap: Record<number, string> = {
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
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsadaptiveforceicon.png`
  }

  const getItemIconUrl = (itemId: number): string => {
    return `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/${itemId}.png`
  }

  const getSpellIconUrl = (spellId: number): string => {
    const spellMap: Record<number, string> = {
      1: 'summoner_boost',
      3: 'summoner_exhaust',
      4: 'summoner_flash',
      6: 'summoner_haste',
      7: 'summoner_heal',
      11: 'summoner_smite',
      12: 'summoner_teleport',
      13: 'summonermana',
      14: 'summonerignite',
      21: 'summonerbarrier',
      32: 'summoner_mark',
    }
    const spellName = spellMap[spellId] || 'summoner_flash'
    return `https://raw.communitydragon.org/latest/game/data/spells/icons2d/${spellName}.png`
  }

  // 加载出装数据
  useEffect(() => {
    if (championId > 0) {
      loadBuild()
    }
  }, [championId, position, mode])

  const loadBuild = async () => {
    setIsLoading(true)
    try {
      const needsPosition = mode !== 'arena' && mode !== 'aram-mayhem'
      const result = await window.electronAPI.data.getChampionBuild(
        championId,
        needsPosition ? position : 'none',
        mode
      )
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
      addNotification(error.message || '应用技能失败', 'error')
    } finally {
      setApplyingSpells(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-lol-gold border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!build) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-lol-text-muted">
        <p>暂无出装数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 overflow-y-auto h-full p-1">
      {/* 英雄信息 */}
      <div className="flex items-center gap-3">
        <img 
          src={getChampionIconUrl(build.championId)}
          alt=""
          className="w-12 h-12 rounded-full border-2 border-lol-gold"
        />
        <div className="flex-1">
          <h3 className="text-base font-display text-lol-gold">{getChampionName(build.championId)}</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-lol-success">{formatPercent(build.summary.winRate)} 胜率</span>
            <span className="text-lol-blue">{formatPercent(build.summary.pickRate)} 登场</span>
          </div>
        </div>
      </div>

      {/* 符文 - 显示多个推荐，自动应用时选择第一个 */}
      {build.runes && build.runes.length > 0 && (
        <div className="lol-card p-2">
          <h4 className="text-xs font-display text-lol-gold mb-2 flex items-center gap-1">
            <Sparkles size={12} />
            推荐符文
          </h4>
          <div className="space-y-2">
            {build.runes.slice(0, 2).map((rune, index) => (
              <div 
                key={index} 
                className="group relative flex items-center gap-2 p-2 bg-lol-bg-tertiary rounded"
              >
                <img src={getRuneStyleIconUrl(rune.primaryStyleId)} alt="" className="w-7 h-7 rounded-full" />
                <img src={getRuneStyleIconUrl(rune.subStyleId)} alt="" className="w-7 h-7 rounded-full opacity-70" />
                <div className="flex gap-1">
                  {rune.selectedPerkIds.slice(0, 6).map((perkId, idx) => (
                    <img key={idx} src={getPerkIconUrl(perkId)} alt="" className="w-6 h-6 rounded" />
                  ))}
                </div>
                <span className="text-xs text-lol-success ml-auto">{formatPercent(rune.pickRate)}</span>
                
                {/* 应用按钮 */}
                {showApplyButtons && (
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
        </div>
      )}

      {/* 召唤师技能 - 显示多个推荐，自动应用时选择第一个 */}
      {build.spells && build.spells.length > 0 && (
        <div className="lol-card p-2">
          <h4 className="text-xs font-display text-lol-gold mb-2 flex items-center gap-1">
            <Shield size={12} />
            召唤师技能
          </h4>
          <div className="space-y-2">
            {build.spells.slice(0, 2).map((spell, index) => (
              <div 
                key={index} 
                className="group relative flex items-center gap-2 p-2 bg-lol-bg-tertiary rounded"
              >
                {spell.ids.map((id, i) => (
                  <img key={i} src={getSpellIconUrl(id)} alt="" className="w-7 h-7 rounded" />
                ))}
                <span className="text-xs text-lol-success ml-auto">{formatPercent(spell.pickRate)}</span>
                
                {/* 应用按钮 */}
                {showApplyButtons && spell.ids.length >= 2 && (
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
        </div>
      )}

      {/* 装备 */}
      <div className="lol-card p-2">
        <h4 className="text-xs font-display text-lol-gold mb-2 flex items-center gap-1">
          <Swords size={12} />
          装备推荐
        </h4>
        <div className="space-y-2">
          {/* 出门装 */}
          {build.items.starter.length > 0 && (
            <div>
              <p className="text-[10px] text-lol-text-muted mb-1">出门装</p>
              <div className="flex flex-wrap gap-1">
                {build.items.starter.slice(0, 2).map((item, index) => (
                  <div key={index} className="flex items-center gap-1 px-1.5 py-1 bg-lol-bg-tertiary rounded">
                    {item.ids.map((id, i) => (
                      <img key={i} src={getItemIconUrl(id)} alt="" className="w-6 h-6 rounded" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 核心装备 */}
          {build.items.core.length > 0 && (
            <div>
              <p className="text-[10px] text-lol-text-muted mb-1">核心装备</p>
              <div className="flex flex-wrap gap-1">
                {build.items.core.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center gap-1 px-1.5 py-1 bg-lol-bg-tertiary rounded border border-lol-gold/20">
                    {item.ids.map((id, i) => (
                      <img key={i} src={getItemIconUrl(id)} alt="" className="w-6 h-6 rounded" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 鞋子 */}
          {build.items.boots.length > 0 && (
            <div>
              <p className="text-[10px] text-lol-text-muted mb-1">鞋子</p>
              <div className="flex flex-wrap gap-1">
                {build.items.boots.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center gap-1 px-1.5 py-1 bg-lol-bg-tertiary rounded">
                    {item.ids.map((id, i) => (
                      <img key={i} src={getItemIconUrl(id)} alt="" className="w-6 h-6 rounded" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
