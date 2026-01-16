import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { Logger } from '../../services/logger'
import type { LCUWebSocketEvent, GameFlowPhase, ChampSelectSession } from '../../../shared/types'

export class LCUWebSocket extends EventEmitter {
  private ws: WebSocket | null = null
  private port: number
  private token: string
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  private shouldReconnect = true
  
  constructor(port: number, token: string) {
    super()
    this.port = port
    this.token = token
  }
  
  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return
    }
    
    this.isConnecting = true
    this.shouldReconnect = true
    
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`riot:${this.token}`).toString('base64')
      
      this.ws = new WebSocket(`wss://127.0.0.1:${this.port}/`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
        rejectUnauthorized: false, // 忽略自签名证书
      })
      
      this.ws.on('open', () => {
        Logger.info('LCU WebSocket connected')
        this.isConnecting = false
        
        // 订阅所有JSON API事件
        this.subscribe()
        
        this.emit('open')
        resolve()
      })
      
      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data.toString())
      })
      
      this.ws.on('error', (error) => {
        Logger.error('LCU WebSocket error', error)
        this.isConnecting = false
        this.emit('error', error)
      })
      
      this.ws.on('close', (code, reason) => {
        Logger.info(`LCU WebSocket closed: code=${code}`)
        this.isConnecting = false
        this.ws = null
        this.emit('close')
        
        // 自动重连
        if (this.shouldReconnect) {
          this.scheduleReconnect()
        }
      })
      
      // 连接超时
      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false
          reject(new Error('WebSocket connection timeout'))
        }
      }, 10000)
    })
  }
  
  private subscribe(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return
    }
    
    // WAMP订阅协议: [5, "OnJsonApiEvent"]
    // 5 = SUBSCRIBE消息类型
    this.ws.send(JSON.stringify([5, 'OnJsonApiEvent']))
    Logger.debug('WebSocket subscription sent')
  }
  
  private handleMessage(rawData: string): void {
    try {
      const message = JSON.parse(rawData)
      
      // WAMP EVENT消息格式: [8, "OnJsonApiEvent", { uri, eventType, data }]
      if (Array.isArray(message) && message[0] === 8 && message[1] === 'OnJsonApiEvent') {
        const event: LCUWebSocketEvent = message[2]
        this.routeEvent(event)
      }
    } catch (error) {
      // 忽略解析错误
    }
  }
  
  private routeEvent(event: LCUWebSocketEvent): void {
    const { uri, eventType, data } = event
    
    // 发送通用事件
    this.emit('event', event)
    
    // 按URI路由到特定事件
    switch (uri) {
      case '/lol-gameflow/v1/gameflow-phase':
        this.emit('gameflow-phase', data as GameFlowPhase)
        break
        
      case '/lol-champ-select/v1/session':
        if (eventType === 'Delete') {
          this.emit('champselect-session-end')
        } else {
          this.emit('champselect-session', data as ChampSelectSession)
        }
        break
        
      case '/lol-champ-select/v1/current-champion':
        this.emit('current-champion', data as number)
        break
        
      case '/lol-matchmaking/v1/ready-check':
        this.emit('ready-check', data)
        break
        
      case '/lol-lobby/v2/lobby':
        this.emit('lobby', data)
        break
        
      case '/lol-end-of-game/v1/eog-stats-block':
        this.emit('end-of-game', data)
        break
        
      default:
        // 未处理的事件
        break
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    
    this.reconnectTimer = setTimeout(() => {
      Logger.info('Attempting WebSocket reconnect...')
      this.connect().catch(() => {
        // 重连失败会自动再次触发重连
      })
    }, 5000)
  }
  
  disconnect(): void {
    this.shouldReconnect = false
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
  
  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
