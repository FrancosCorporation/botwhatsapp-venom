import { VenomBot } from '../venom.js'
import { storage } from '../storage.js'
import { STAGES } from './index.js'

export const stageThree = {
  async exec({ from, message }) {
    const address = message.trim()
    let msg

    if (address === '*') {
      storage[from].stage = STAGES.INICIAL
      storage[from].itens = []
      storage[from].address = ''
      msg = '🔴 Pedido *CANCELADO* com sucesso. Volte sempre!'
    } else if (!address) {
      msg = '📍 Informe o endereço no formato *Rua, número, bairro*.'
    } else {
      storage[from].address = address
      storage[from].stage = STAGES.PEDIDO

      const itens = storage[from].itens
      const desserts = itens.map((item) => item.description).join(', ')
      const total = itens.reduce((sum, item) => sum + item.price, 0)
      const formattedTotal = total.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })

      msg =
        `🗒️ *RESUMO DO PEDIDO*: \n\n🧁 Sabores: *${desserts}* \n🚚 Taxa de entrega: *a confirmar*. \n📍 Endereço: *${address}* \n💰 Valor dos bolos: *${formattedTotal}*. \n⏳ Tempo de entrega: *50 minutos*. \n\n` +
        '🔊 ```Agora, informe a forma de pagamento e se vai precisar de troco, por gentileza.```'
    }

    await VenomBot.getInstance().sendText({ to: from, message: msg })
  },
}
