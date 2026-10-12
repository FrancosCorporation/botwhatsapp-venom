import { randomUUID } from 'node:crypto'
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const defaultStorageFile = fileURLToPath(
  new URL('../data/storage.json', import.meta.url),
)
const storageFile = resolve(process.env.BOT_DATA_FILE || defaultStorageFile)

export const storage = Object.create(null)

function isOrderRecord(record) {
  return (
    record !== null &&
    typeof record === 'object' &&
    !Array.isArray(record) &&
    typeof record.stage === 'string' &&
    /^[0-5]$/.test(record.stage) &&
    Array.isArray(record.itens) &&
    record.itens.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        typeof item.description === 'string' &&
        Number.isFinite(item.price) &&
        item.price >= 0,
    ) &&
    typeof record.address === 'string' &&
    (record.finalStage === undefined ||
      (record.finalStage !== null &&
        typeof record.finalStage === 'object' &&
        !Array.isArray(record.finalStage) &&
        Number.isFinite(record.finalStage.startsIn) &&
        Number.isFinite(record.finalStage.endsIn)))
  )
}

function loadStorage() {
  if (!existsSync(storageFile)) return

  let persistedStorage

  try {
    persistedStorage = JSON.parse(readFileSync(storageFile, 'utf8'))
  } catch (error) {
    throw new Error(`Não foi possível ler o estado salvo em ${storageFile}.`, {
      cause: error,
    })
  }

  if (
    persistedStorage === null ||
    typeof persistedStorage !== 'object' ||
    Array.isArray(persistedStorage)
  ) {
    throw new Error(
      `O arquivo de estado ${storageFile} tem um formato inválido.`,
    )
  }

  for (const [contact, record] of Object.entries(persistedStorage)) {
    if (!isOrderRecord(record)) {
      throw new Error(
        `O estado salvo para um contato em ${storageFile} é inválido. Revise ou restaure um backup antes de iniciar o bot.`,
      )
    }

    storage[contact] = record
  }
}

export function saveStorage() {
  mkdirSync(dirname(storageFile), { recursive: true, mode: 0o700 })

  const temporaryFile = `${storageFile}.${process.pid}.${randomUUID()}.tmp`
  let descriptor
  let temporaryFileCreated = false

  try {
    descriptor = openSync(temporaryFile, 'wx', 0o600)
    temporaryFileCreated = true
    writeFileSync(descriptor, `${JSON.stringify(storage, null, 2)}\n`)
    fsyncSync(descriptor)
    closeSync(descriptor)
    descriptor = undefined
    renameSync(temporaryFile, storageFile)
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor)
    if (temporaryFileCreated && existsSync(temporaryFile)) unlinkSync(temporaryFile)
    throw new Error(`Não foi possível salvar o estado em ${storageFile}.`, {
      cause: error,
    })
  }
}

loadStorage()
