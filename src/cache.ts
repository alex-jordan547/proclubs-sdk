export const DEFAULT_CACHE_TTL_MS = 60_000
export const DEFAULT_CACHE_MAX_ENTRIES = 500

export interface ProClubsCacheOptions {
  ttlMs?: number
  maxEntries?: number
}

export type ProClubsCacheMode = 'default' | 'bypass' | 'refresh'

interface CacheEntry<T> {
  readonly value: T
  readonly expiresAt: number
}

export class MemoryCache<T> {
  readonly #ttlMs: number
  readonly #maxEntries: number
  readonly #entries = new Map<string, CacheEntry<T>>()

  constructor(ttlMs: number, maxEntries: number) {
    this.#ttlMs = ttlMs
    this.#maxEntries = maxEntries
  }

  get(key: string): T | undefined {
    const entry = this.#entries.get(key)
    if (!entry) {
      return undefined
    }

    if (entry.expiresAt <= Date.now()) {
      this.#entries.delete(key)
      return undefined
    }

    this.#entries.delete(key)
    this.#entries.set(key, entry)
    return cloneValue(entry.value)
  }

  set(key: string, value: T): void {
    this.#entries.delete(key)
    this.#entries.set(key, {
      value: cloneValue(value),
      expiresAt: Date.now() + this.#ttlMs,
    })

    while (this.#entries.size > this.#maxEntries) {
      const oldestKey = this.#entries.keys().next().value
      if (oldestKey === undefined) {
        return
      }
      this.#entries.delete(oldestKey)
    }
  }
}

export function cloneValue<T>(value: T): T {
  return structuredClone(value)
}
