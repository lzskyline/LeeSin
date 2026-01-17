import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useLCU } from './hooks/useLCU'
import { useGameFlowStore, useChampSelectStore } from './store'
import Layout from './components/Layout'
import Home from './pages/Home'
import ChampSelect from './pages/ChampSelect'
import Build from './pages/Build'
import Career from './pages/Career'
import Settings from './pages/Settings'
import Notifications from './components/Notifications'

// 自动导航组件 - 必须在 Router 内部使用
function AutoNavigator() {
  const { phase } = useGameFlowStore()
  const { setHasAutoNavigatedToBuild } = useChampSelectStore()
  const navigate = useNavigate()
  const location = useLocation()
  const prevPhaseRef = useRef(phase)

  // 进入选人阶段时自动跳转
  useEffect(() => {
    // 只有当 phase 从非 ChampSelect 变为 ChampSelect 时，才自动跳转
    // 并且如果当前不在 build 页面（防止刷新后被拉回）
    if (phase === 'ChampSelect' && prevPhaseRef.current !== 'ChampSelect') {
      // 如果已经在相关页面，就不跳转了
      if (location.pathname !== '/champselect' && location.pathname !== '/build') {
        navigate('/champselect')
      }
    }
    
    prevPhaseRef.current = phase
  }, [phase, navigate, location.pathname])

  // 当离开选人阶段时，重置标记
  useEffect(() => {
    if (phase !== 'ChampSelect') {
      setHasAutoNavigatedToBuild(false)
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
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
