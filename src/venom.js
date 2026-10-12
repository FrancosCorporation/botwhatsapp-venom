import { create } from 'venom-bot'
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  renameSync,
} from 'node:fs'
import { resolve } from 'node:path'

function pathInfoOrNull(path) {
  try {
    return lstatSync(path)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function preparePrivateTokenDirectory() {
  const workingDirectory = process.cwd()
  const privateDirectory = resolve(workingDirectory, '.private')
  const tokenDirectory = resolve(privateDirectory, 'tokens')
  const legacyTokenDirectory = resolve(workingDirectory, 'tokens')

  mkdirSync(privateDirectory, { recursive: true, mode: 0o700 })
  const privateDirectoryInfo = pathInfoOrNull(privateDirectory)
  if (!privateDirectoryInfo?.isDirectory() || privateDirectoryInfo.isSymbolicLink()) {
    throw new Error('O diretório privado .private deve ser uma pasta real.')
  }
  chmodSync(privateDirectory, 0o700)

  const legacyInfo = pathInfoOrNull(legacyTokenDirectory)
  const tokenDirectoryInfo = pathInfoOrNull(tokenDirectory)
  if (legacyInfo) {
    if (!legacyInfo.isDirectory() || legacyInfo.isSymbolicLink()) {
      throw new Error('A pasta legada tokens deve ser uma pasta real para migração segura.')
    }
    if (tokenDirectoryInfo) {
      throw new Error(
        'As pastas tokens e .private/tokens já existem. Revise e una as sessões antes de iniciar.',
      )
    }
    renameSync(legacyTokenDirectory, tokenDirectory)
  } else if (tokenDirectoryInfo && (!tokenDirectoryInfo.isDirectory() || tokenDirectoryInfo.isSymbolicLink())) {
    throw new Error('O diretório .private/tokens deve ser uma pasta real.')
  }

  mkdirSync(tokenDirectory, { recursive: true, mode: 0o700 })
  chmodSync(tokenDirectory, 0o700)

  return { privateDirectory, tokenDirectory }
}

function restrictSessionPermissions(tokenDirectory, session) {
  chmodSync(tokenDirectory, 0o700)

  const sessionDirectory = resolve(tokenDirectory, session)
  const sessionDirectoryInfo = pathInfoOrNull(sessionDirectory)
  if (sessionDirectoryInfo) {
    if (!sessionDirectoryInfo.isDirectory() || sessionDirectoryInfo.isSymbolicLink()) {
      throw new Error('A pasta da sessão do WhatsApp deve ser uma pasta real.')
    }
    chmodSync(sessionDirectory, 0o700)
  }

  const tokenFile = resolve(tokenDirectory, `${session}.data.json`)
  const tokenFileInfo = pathInfoOrNull(tokenFile)
  if (tokenFileInfo) {
    if (!tokenFileInfo.isFile() || tokenFileInfo.isSymbolicLink()) {
      throw new Error('O arquivo da sessão do WhatsApp deve ser um arquivo regular.')
    }
    chmodSync(tokenFile, 0o600)
  }
}

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
    const { privateDirectory, tokenDirectory } = preparePrivateTokenDirectory()
    this.#venombot = await create({
      session,
      headless,
      useChrome,
      multidevice: false,
      folderNameToken: 'tokens',
      // Venom applies 0777 inside this directory; .private stays 0700.
      mkdirFolderToken: '/.private',
    })

    chmodSync(privateDirectory, 0o700)
    restrictSessionPermissions(tokenDirectory, session)

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
