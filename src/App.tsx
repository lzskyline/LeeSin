import { useEffect, useRef, useState } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useLCU } from './hooks/useLCU'
import { useGameFlowStore, useChampSelectStore } from './store'
import Layout from './components/Layout'
import Home from './pages/Home'
import ChampSelect from './pages/ChampSelect'
import Build from './pages/Build'
import Career from './pages/Career'
import Settings from './pages/Settings'
import Notifications from './components/Notifications'
import type { ChampSelectSession } from '../shared/types'

// 辅助函数
function normalizePosition(position: string): string {
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

function hasLocalPlayerLocked(session: ChampSelectSession): boolean {
  if (!session) return false
  
  // 检查是否处于 BAN_PICK 之后的阶段
  if (session.timer.phase === 'FINALIZATION' || session.timer.phase === 'GAME_START') {
    return true
  }
  
  // 大乱斗 (ARAM) 逻辑：只要 benchEnabled 为 true，或者没有 pick actions
  if (session.benchEnabled) {
    const localPlayer = session.myTeam.find(p => p.cellId === session.localPlayerCellId)
    return !!(localPlayer && localPlayer.championId > 0)
  }
  
  // 检查是否有未完成的 pick 动作
  let hasPendingPick = false
  for (const round of session.actions) {
    for (const action of round) {
      if (action.actorCellId === session.localPlayerCellId && action.type === 'pick' && !action.completed) {
        hasPendingPick = true
      }
    }
  }
  if (hasPendingPick) return false
  
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

// 自动导航组件 - 必须在 Router 内部使用
function AutoNavigator() {
  const { phase } = useGameFlowStore()
  const { session, setHasAutoNavigatedToBuild } = useChampSelectStore()
  const navigate = useNavigate()
  const location = useLocation()
  const prevPhaseRef = useRef(phase)
  const [redirectedChampionId, setRedirectedChampionId] = useState<number>(0)

  // 进入选人阶段时自动跳转
  useEffect(() => {
    // 只有当 phase 从非 ChampSelect 变为 ChampSelect 时，才自动跳转
    if (phase === 'ChampSelect' && prevPhaseRef.current !== 'ChampSelect') {
      // 重置状态
      setRedirectedChampionId(0)
      
      // 总是跳转到选人界面，除非已经在那里
      if (location.pathname !== '/champselect') {
        navigate('/champselect')
      }
    }
    
    prevPhaseRef.current = phase
  }, [phase, navigate, location.pathname])

  // 监听英雄锁定/选择，跳转到出装页面
  useEffect(() => {
    if (phase === 'ChampSelect' && session) {
      const localPlayer = session.myTeam.find(p => p.cellId === session.localPlayerCellId)
      
      if (localPlayer && localPlayer.championId > 0) {
        // 判断是否应该跳转
        // 1. 英雄已锁定（经典模式）或 已选择（大乱斗模式）
        // 2. 目标英雄ID与上次跳转的不同（防止重复跳转，同时支持大乱斗换人）
        if (hasLocalPlayerLocked(session) && localPlayer.championId !== redirectedChampionId) {
          setRedirectedChampionId(localPlayer.championId)
          const normalizedPos = normalizePosition(localPlayer.assignedPosition)
          
          // 延迟跳转，给用户一点反应时间，也确保数据就绪
          setTimeout(() => {
            navigate(`/build?championId=${localPlayer.championId}&position=${normalizedPos}`)
          }, 500)
        }
      }
    }
  }, [session, phase, redirectedChampionId, navigate])

  // 当离开选人阶段时，重置标记
  useEffect(() => {
    if (phase !== 'ChampSelect') {
      setHasAutoNavigatedToBuild(false)
      setRedirectedChampionId(0)
    }
  }, [phase, setHasAutoNavigatedToBuild])

  return null
}

function AppContent() {
  // 初始化LCU连接和事件监听
  useLCU()
  
  return (
    <>
      <AutoNavigator />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/champselect" element={<ChampSelect />} />
          <Route path="/build" element={<Build />} />
          <Route path="/career" element={<Career />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Notifications />
    </>
  )
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}

export default App
