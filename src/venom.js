import { create } from 'venom-bot'
import { chmodSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export class VenomBot {
  #venombot

  #session

  #displayName

  static getInstance() {
    if (VenomBot.instance === undefined) VenomBot.instance = new VenomBot()
    return VenomBot.instance
  }

  async init({ session, displayName = session, headless, useChrome }) {
    this.#session = session
    this.#displayName = displayName
    this.#venombot = await create({
      session,
      headless,
      useChrome,
      multidevice: false,
    })

    const tokenDirectory = resolve(process.cwd(), 'tokens')
    const sessionDirectory = resolve(tokenDirectory, session)

    if (existsSync(tokenDirectory)) chmodSync(tokenDirectory, 0o700)
    if (existsSync(sessionDirectory)) chmodSync(sessionDirectory, 0o700)

    return this
  }

  get getSessionName() {
    return this.#session
  }

  get getDisplayName() {
    return this.#displayName
  }

  async onMessage(callback) {
    if (!this.#venombot) throw new Error('VenomBot not initialized.')
    return await this.#venombot.onMessage(callback)
  }

  async sendText({ to, message }) {
    if (!this.#venombot) throw new Error('VenomBot not initialized.')
    return await this.#venombot.sendText(to, message)
  }

  // Is not working
  // async sendButtons({ to, title, buttons, description }) {
  //   if (!this.#venombot) throw new Error('VenomBot not initialized.')

  //   return await this.#venombot.sendButtons(
  //     to,
  //     title,
  //     buttons,
  //     description,
  //   )
  // }

  async markUnseenMessage({ to }) {
    if (!this.#venombot) throw new Error('VenomBot not initialized.')
    return await this.#venombot.markUnseenMessage(to)
  }
}
