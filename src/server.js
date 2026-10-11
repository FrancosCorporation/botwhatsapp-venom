import { VenomBot } from './venom.js'
import { stages, getStage } from './stages.js'
import { saveStorage } from './storage.js'

const main = async () => {
  const session = process.env.BOT_SESSION?.trim() || 'Delicias-da-Neide'
  const displayName = process.env.BOT_DISPLAY_NAME?.trim() || 'Delícias da Neide'

  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(session)) {
    throw new Error(
      'BOT_SESSION deve ter até 64 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.',
    )
  }

  const venombot = await VenomBot.getInstance().init({
    session,
    displayName,
    headless: true,
    useChrome: false,
  })

  venombot.onMessage(async (message) => {
    if (
      message.isGroupMsg ||
      typeof message.from !== 'string' ||
      typeof message.body !== 'string'
    ) {
      return
    }

    try {
      const currentStage = getStage({ from: message.from })
      const currentHandler = stages[Number(currentStage)]

      if (!currentHandler) {
        throw new Error('O contato está em um estágio inválido.')
      }

      await currentHandler.stage.exec({
        from: message.from,
        message: message.body,
      })
    } catch (error) {
      console.error('Falha ao processar uma mensagem recebida:', error)

      try {
        await venombot.sendText({
          to: message.from,
          message:
            '⚠️ Não consegui processar sua mensagem. Tente novamente em instantes.',
        })
      } catch (replyError) {
        console.error('Falha ao enviar o aviso de erro:', replyError)
      }
    } finally {
      try {
        saveStorage()
      } catch (error) {
        console.error('Falha ao persistir o estado das conversas:', error)
      }
    }
  })
}

main().catch((error) => {
  console.error('Não foi possível iniciar o bot:', error)
  process.exitCode = 1
})
