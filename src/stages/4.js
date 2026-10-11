import { VenomBot } from '../venom.js'
import { storage } from '../storage.js'
import { INACTIVITY_TIMEOUT_MS, STAGES } from './index.js'

export const stageFour = {
  async exec({ from, message }) {
    const address = storage[from].address
    const phone = from.split('@')

    storage[from].stage = STAGES.FALAR_COM_ATENDENTE

    const now = Date.now()
    storage[from].finalStage = {
      startsIn: now,
      endsIn: now + INACTIVITY_TIMEOUT_MS,
    }

    const itens = storage[from].itens
    const desserts = itens.map((item) => item.description).join(', ')
    const total = itens.reduce((sum, item) => sum + item.price, 0)
    const formattedTotal = total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

    const msg = `🔔 *NOVO PEDIDO* 🔔: \n\n📞 Cliente: +${
      phone[0]
    } \n🧁 Sabores: *${desserts}* \n📍 Endereço: *${address}* \n🚚 Taxa de entrega: *a confirmar*. \n💰 Valor dos bolos: *${formattedTotal}*. \n⏳ Tempo de entrega: *50 minutos*. \n🛑 Detalhes: *${message}*`

    await VenomBot.getInstance().sendText({ to: from, message: msg })
  },
}
