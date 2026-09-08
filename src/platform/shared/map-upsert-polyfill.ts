/*
 * Polyfills for the ES2025 `Map.prototype.getOrInsert` /
 * `Map.prototype.getOrInsertComputed` upsert methods (the same proposal also
 * covers WeakMap and WeakSet). pdf.js 6 uses them 30+ times on both the main
 * thread and the worker; they ship in very recent Chromium (2025+) and the
 * Android system WebView on older tracks (for example Chromium 124) lacks
 * them, so pdf.js rendering rejects with `getOrInsertComputed is not a
 * function`. Install at application entry and prepend to the bundled pdf.js
 * worker asset in `vite.config.ts`.
 */
declare global {
  interface Map<K, V> {
    getOrInsert(key: K, defaultValue: V): V
    getOrInsertComputed(key: K, callbackfn: (key: K) => V): V
  }
  interface WeakMap<K extends object, V> {
    getOrInsert(key: K, defaultValue: V): V
    getOrInsertComputed(key: K, callbackfn: (key: K) => V): V
  }
  interface WeakSet<T extends object> {
    getOrInsert(value: T): void
    getOrInsertComputed(value: T, callbackfn: (value: T) => T): void
  }
}

interface GetSetPrototype {
  getOrInsert?: unknown
  getOrInsertComputed?: unknown
  has(key: unknown): boolean
  get(key: unknown): unknown
  set(key: unknown, value: unknown): unknown
}

function installKeyValueUpsert(prototype: GetSetPrototype): void {
  if (typeof prototype.getOrInsert !== "function") {
    Object.defineProperty(prototype, "getOrInsert", {
      value: function getOrInsert<K, V>(this: Map<K, V>, key: K, defaultValue: V): V {
        if (this.has(key)) return this.get(key) as V
        this.set(key, defaultValue)
        return defaultValue
      },
      writable: true,
      configurable: true,
    })
  }
  if (typeof prototype.getOrInsertComputed !== "function") {
    Object.defineProperty(prototype, "getOrInsertComputed", {
      value: function getOrInsertComputed<K, V>(
        this: Map<K, V>,
        key: K,
        callbackfn: (key: K) => V,
      ): V {
        if (this.has(key)) return this.get(key) as V
        const value = callbackfn(key)
        this.set(key, value)
        return value
      },
      writable: true,
      configurable: true,
    })
  }
}

interface AddPrototype {
  getOrInsert?: unknown
  getOrInsertComputed?: unknown
  has(value: unknown): boolean
  add(value: unknown): unknown
}

function installAddUpsert(prototype: AddPrototype): void {
  if (typeof prototype.getOrInsert !== "function") {
    Object.defineProperty(prototype, "getOrInsert", {
      value: function getOrInsert<T extends object>(this: WeakSet<T>, value: T): void {
        if (!this.has(value)) this.add(value)
      },
      writable: true,
      configurable: true,
    })
  }
  if (typeof prototype.getOrInsertComputed !== "function") {
    Object.defineProperty(prototype, "getOrInsertComputed", {
      value: function getOrInsertComputed<T extends object>(
        this: WeakSet<T>,
        value: T,
        callbackfn: (value: T) => T,
      ): void {
        if (!this.has(value)) this.add(callbackfn(value))
      },
      writable: true,
      configurable: true,
    })
  }
}

installKeyValueUpsert(Map.prototype)
installKeyValueUpsert(WeakMap.prototype)
installAddUpsert(WeakSet.prototype)

export {}
