import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertCircle, Info } from 'lucide-react'
import { useNotificationStore } from '../../store'

const icons = {
  success: Check,
  error: AlertCircle,
  info: Info,
}

const colors = {
  success: 'border-lol-success text-lol-success',
  error: 'border-lol-error text-lol-error',
  info: 'border-lol-gold text-lol-gold',
}

export default function Notifications() {
  const { notifications, removeNotification } = useNotificationStore()
  
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <AnimatePresence>
        {notifications.map((notification) => {
          const Icon = icons[notification.type]
          
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`
                flex items-center gap-3 px-4 py-3 
                bg-lol-bg-secondary border rounded
                shadow-lg min-w-[280px] max-w-[400px]
                ${colors[notification.type]}
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-sm text-lol-text-primary">
                {notification.message}
              </span>
              <button
                onClick={() => removeNotification(notification.id)}
                className="p-1 hover:bg-lol-bg-tertiary rounded text-lol-text-secondary hover:text-lol-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
