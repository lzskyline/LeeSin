import { LCUClient } from '../lcu/client'
import { Logger } from '../../services/logger'
import type { AutoActionResult } from './auto-accept'

export class Dodge {
  private lcuClient: LCUClient
  
  constructor(lcuClient: LCUClient) {
    this.lcuClient = lcuClient
  }
  
  async execute(): Promise<AutoActionResult> {
    try {
      await this.lcuClient.dodge()
      
      Logger.info('Dodge successful')
      return { executed: true, success: true, message: 'Left lobby' }
    } catch (error: any) {
      Logger.error('Dodge failed', error)
      return { executed: true, success: false, message: error.message }
    }
  }
}
