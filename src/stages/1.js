import { VenomBot } from '../venom.js'
import { menu } from '../menu.js'
import { storage } from '../storage.js'
import { neighborhoods } from './neighborhoods.js'
import { INACTIVITY_TIMEOUT_MS, STAGES } from './index.js'

export const stageOne = {
  async exec(params) {
    const message = params.message.trim()
    const isMsgValid = /^[0-2]$/.test(message)

    let msg =
      '❌ *Digite uma opção válida, por favor.* \n⚠️ ```APENAS UMA OPÇÃO POR VEZ``` ⚠️'

    const option = isMsgValid ? options[message] : undefined

    if (option) {
      msg = option.message
      storage[params.from].stage = option.nextStage

      if (option.nextStage === STAGES.FALAR_COM_ATENDENTE) {
        const now = Date.now()
        storage[params.from].finalStage = {
          startsIn: now,
          endsIn: now + INACTIVITY_TIMEOUT_MS,
        }
      }
    }

    await VenomBot.getInstance().sendText({ to: params.from, message: msg })
  },
}

const options = {
  1: () => {
    let message = '🚨  CARDÁPIO  🚨\n\n'

    Object.keys(menu).forEach((value) => {
      message += `${numbers[value]} - _${menu[value].description}_ \n`
    })

    return {
      message,
      nextStage: STAGES.CARRINHO,
    }
  },
  2: () => {
    const message =
      '\n-----------------------------------\n1️⃣ - ```FAZER PEDIDO``` \n0️⃣ - ```FALAR COM ATENDENTE```\n\n' +
      neighborhoods +
      '\n-----------------------------------\n1️⃣ - ```FAZER PEDIDO``` \n0️⃣ - ```FALAR COM ATENDENTE``` '

    return {
      message,
      nextStage: STAGES.MENU,
    }
  },
  0: () => {
    return {
      message:
        '🔃 Encaminhando você para um atendente. \n⏳ *Aguarde um instante*.\n \n⚠️ A qualquer momento, digite *ENCERRAR* para encerrar o atendimento. ⚠️',
      nextStage: STAGES.FALAR_COM_ATENDENTE,
    }
  },
}

const numbers = {
  1: '1️⃣',
  2: '2️⃣',
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
}
