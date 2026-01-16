import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useLCU } from './hooks/useLCU'
import { useGameFlowStore } from './store'
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
  const navigate = useNavigate()
  
  useEffect(() => {
    if (phase === 'ChampSelect') {
      navigate('/champselect')
    }
  }, [phase, navigate])
  
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
