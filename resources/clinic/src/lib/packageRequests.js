export function newPackageRequestKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

export function readPendingPackage(key, storage = globalThis.sessionStorage) {
  const saved = storage.getItem(key)
  return saved ? JSON.parse(saved) : null
}

export function savePendingPackage(key, payload, storage = globalThis.sessionStorage) {
  storage.setItem(key, JSON.stringify(payload))
}

export function clearPendingPackage(key, storage = globalThis.sessionStorage) {
  storage.removeItem(key)
}

export function packageRequestMayHaveSaved(error) {
  return ![400, 403, 404, 422].includes(error.status)
}
