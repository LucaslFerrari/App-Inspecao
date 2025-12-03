// Gera um ID com fallback para ambientes que não têm crypto.randomUUID (ex.: alguns navegadores mobile)
export function safeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

