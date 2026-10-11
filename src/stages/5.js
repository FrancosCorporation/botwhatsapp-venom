import { VenomBot } from '../venom.js'
import { storage } from '../storage.js'
import { INACTIVITY_TIMEOUT_MS, STAGES } from './index.js'

export const finalStage = {
  async exec({ from, message }) {
    const normalizedMessage = message.trim().toUpperCase()
    const history = storage[from].finalStage
    const isExpired = !history || history.endsIn <= Date.now()

    if (isExpired || normalizedMessage === 'ENCERRAR') {
      storage[from].stage = STAGES.INICIAL
      storage[from].itens = []
      storage[from].address = ''
      delete storage[from].finalStage

      return VenomBot.getInstance().sendText({
        to: from,
        message: '🔚 *Atendimento encerrado* 🔚',
      })
    }

    storage[from].finalStage.endsIn = Date.now() + INACTIVITY_TIMEOUT_MS
  },
}
