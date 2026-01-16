import { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Swords, Settings, Minus, Square, X, History, Wand2 } from 'lucide-react'
import { useLCUStore, useGameFlowStore } from '../../store'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { path: '/', icon: Home, label: '主页' },
  { path: '/champselect', icon: Swords, label: '选人' },
  { path: '/build', icon: Wand2, label: '出装' },
  { path: '/career', icon: History, label: '战绩' },
  { path: '/settings', icon: Settings, label: '设置' },
]

const phaseLabels: Record<string, string> = {
  None: '空闲',
  Lobby: '房间中',
  Matchmaking: '匹配中',
  ReadyCheck: '确认对局',
  ChampSelect: '选择英雄',
  GameStart: '游戏启动',
  InProgress: '游戏中',
  Reconnect: '重连中',
  EndOfGame: '结算中',
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { connected, summoner } = useLCUStore()
  const { phase } = useGameFlowStore()
  
  return (
    <div className="flex flex-col h-screen bg-lol-bg-primary">
      {/* 标题栏 */}
      <header className="flex items-center justify-between h-10 px-4 bg-lol-bg-secondary border-b border-lol-border-dark drag-region">
        <div className="flex items-center gap-3 no-drag">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-lol-gold to-lol-gold-dark flex items-center justify-center">
              <span className="text-xs font-bold text-lol-bg-primary">L</span>
            </div>
            <span className="font-display text-lol-gold text-sm tracking-wider">LEESIN</span>
          </div>
          
          {/* 连接状态 */}
          <div className="flex items-center gap-2 ml-4 text-xs">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-lol-success' : 'bg-lol-error'}`} />
            <span className="text-lol-text-secondary">
              {connected 
                ? (summoner?.gameName || summoner?.displayName || '已连接') 
                : '未连接'}
            </span>
          </div>
          
          {/* 游戏状态 */}
          {connected && phase !== 'None' && (
            <div className="flex items-center gap-2 ml-4 px-2 py-0.5 rounded bg-lol-bg-tertiary border border-lol-border-dark">
              <div className="w-1.5 h-1.5 rounded-full bg-lol-gold animate-pulse" />
              <span className="text-xs text-lol-gold">{phaseLabels[phase] || phase}</span>
            </div>
          )}
        </div>
        
        {/* 窗口控制按钮 */}
        <div className="flex items-center no-drag">
          <button
            onClick={() => window.electronAPI.window.minimize()}
            className="p-2 hover:bg-lol-bg-tertiary text-lol-text-secondary hover:text-lol-text-primary transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.electronAPI.window.maximize()}
            className="p-2 hover:bg-lol-bg-tertiary text-lol-text-secondary hover:text-lol-text-primary transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.electronAPI.window.close()}
            className="p-2 hover:bg-lol-error text-lol-text-secondary hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <nav className="w-16 bg-lol-bg-secondary border-r border-lol-border-dark flex flex-col items-center py-4 gap-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path
            
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`relative w-12 h-12 flex flex-col items-center justify-center rounded transition-all group
                  ${isActive 
                    ? 'text-lol-gold' 
                    : 'text-lol-text-secondary hover:text-lol-text-primary'
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-lol-bg-tertiary border border-lol-gold-dark rounded"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10" />
                <span className="text-[10px] mt-0.5 relative z-10">{label}</span>
              </button>
            )
          })}
        </nav>
        
        {/* 主内容区 */}
        <main className="flex-1 overflow-auto p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
