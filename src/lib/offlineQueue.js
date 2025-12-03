"use client"

/**
 * Fila em IndexedDB para guardar inspeções offline.
 * Guarda o payload completo (incluindo evidências base64).
 */
const DB_NAME = "inspecoes_offline_db"
const STORE = "inspecoes"
let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB não suportado"))
    }

    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function getAll() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

async function put(item) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    const req = store.put(item)
    req.onsuccess = () => resolve(item)
    req.onerror = () => reject(req.error)
  })
}

async function removeMany(ids) {
  if (!ids?.length) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    let pending = ids.length
    ids.forEach((id) => {
      const req = store.delete(id)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        pending -= 1
        if (pending === 0) resolve()
      }
    })
  })
}

export async function enqueueInspecao(payload) {
  const item = {
    id: generateId(),
    payload,
    createdAt: new Date().toISOString(),
  }
  await put(item)
  return item
}

export async function hasPendingInspecoes() {
  const items = await getAll()
  return items.length > 0
}

/**
 * Tenta sincronizar todas as inspeções pendentes usando a função de upload recebida.
 * uploadFn deve receber (payload) e retornar uma Promise.
 */
export async function syncInspecoes(uploadFn) {
  if (typeof uploadFn !== "function") {
    throw new Error("uploadFn inválida")
  }

  const queue = await getAll()
  if (!queue.length) return { sent: [], remaining: [] }

  const sentIds = []
  const remaining = []

  for (const item of queue) {
    try {
      await uploadFn(item.payload)
      sentIds.push(item.id)
    } catch (err) {
      console.warn(`[offlineQueue] Falha ao sincronizar ${item.id}:`, err?.message)
      remaining.push(item)
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        break
      }
    }
  }

  if (sentIds.length) {
    await removeMany(sentIds)
  }

  return { sent: sentIds, remaining }
}


export async function getPendingCount() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const store = tx.objectStore(STORE)
    const req = store.count()
    req.onsuccess = () => resolve(req.result || 0)
    req.onerror = () => reject(req.error)
  })
}