import { afterEach, describe, expect, it, vi } from "vitest"
import "./promise-try-polyfill"

describe("Promise.try polyfill", () => {
  afterEach(() => {
    vi.resetModules()
  })

  it("resolves with the callback result", async () => {
    await expect(Promise.try(() => 5)).resolves.toBe(5)
  })

  it("rejects when the callback throws", async () => {
    await expect(
      Promise.try(() => {
        throw new Error("callback failure")
      }),
    ).rejects.toThrow("callback failure")
  })

  it("forwards arguments to the callback", async () => {
    await expect(Promise.try((a: number, b: number) => a + b, 2, 3)).resolves.toBe(5)
  })

  it("installs a working method when the environment lacks Promise.try", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Promise, "try")
    const original = descriptor?.value as ((...args: unknown[]) => Promise<unknown>) | undefined
    Object.defineProperty(Promise, "try", { value: undefined, configurable: true, writable: true })
    try {
      vi.resetModules()
      await import("./promise-try-polyfill")
      expect(typeof Promise.try).toBe("function")
      if (typeof Promise.try === "function") {
        await expect(Promise.try(() => "installed")).resolves.toBe("installed")
        await expect(Promise.try((value: string) => value.toUpperCase(), "works")).resolves.toBe(
          "WORKS",
        )
      }
    } finally {
      Object.defineProperty(Promise, "try", { value: original, configurable: true, writable: true })
    }
  })
})
