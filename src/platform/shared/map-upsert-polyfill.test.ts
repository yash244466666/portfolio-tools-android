import { describe, expect, it } from "vitest"
import "./map-upsert-polyfill"

describe("Map upsert polyfills", () => {
  it("getOrInsert returns the existing value without overwriting", () => {
    const map = new Map<string, number>([["a", 1]])
    expect(map.getOrInsert("a", 99)).toBe(1)
    expect(map.get("a")).toBe(1)
  })

  it("getOrInsert inserts the default for a missing key", () => {
    const map = new Map<string, number>()
    expect(map.getOrInsert("b", 7)).toBe(7)
    expect(map.get("b")).toBe(7)
  })

  it("getOrInsertComputed returns the existing value without invoking the callback", () => {
    let calls = 0
    const map = new Map<string, number[]>([["a", [1]]])
    expect(
      map.getOrInsertComputed("a", () => {
        calls += 1
        return []
      }),
    ).toStrictEqual([1])
    expect(calls).toBe(0)
  })

  it("getOrInsertComputed inserts the callback value for a missing key and passes the key", () => {
    const map = new Map<string, number[]>()
    const inserted = map.getOrInsertComputed("b", (key) => {
      expect(key).toBe("b")
      return [2, 3]
    })
    expect(inserted).toStrictEqual([2, 3])
    expect(map.getOrInsertComputed("b", () => [99])).toStrictEqual([2, 3])
  })

  it("works on WeakMap keys", () => {
    const weak = new WeakMap<object, number[]>()
    const key = {}
    expect(weak.getOrInsertComputed(key, () => [5])).toStrictEqual([5])
    expect(weak.getOrInsertComputed(key, () => [99])).toStrictEqual([5])
  })

  it("installs on WeakSet", () => {
    const weak = new WeakSet<object>()
    const key = {}
    weak.getOrInsert(key)
    expect(weak.has(key)).toBe(true)
    weak.getOrInsertComputed(key, () => key)
    expect(weak.has(key)).toBe(true)
  })
})
