import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRegexRunner, type RegexWorkerLike } from "./regex-client"
import type { RegexRunResult, RegexWorkerResponse } from "./regex"

class FakeWorker implements RegexWorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  terminated = false
  posted: unknown[] = []

  postMessage(message: unknown): void {
    this.posted.push(message)
  }

  terminate(): void {
    this.terminated = true
  }

  deliver(response: RegexWorkerResponse): void {
    this.onmessage?.({ data: response })
  }

  fail(): void {
    this.onerror?.(new Error("worker fault"))
  }
}

function createTrackedFactory() {
  const created: FakeWorker[] = []
  return {
    created,
    factory: () => {
      const worker = new FakeWorker()
      created.push(worker)
      return worker
    },
  }
}

function workerAt(created: FakeWorker[], index: number): FakeWorker {
  const worker = created[index]
  if (!worker) throw new Error(`expected worker ${index} to exist`)
  return worker
}

const okResult: RegexRunResult = { status: "ok", matches: [], truncated: false }

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("regex runner contract", () => {
  it("posts a request and resolves the matching response", async () => {
    const { created, factory } = createTrackedFactory()
    const runner = createRegexRunner({ workerFactory: factory })

    const pending = runner.run({ pattern: "a", flags: "g", input: "a" })
    expect(created).toHaveLength(1)
    expect(workerAt(created, 0).posted).toEqual([{ id: 1, pattern: "a", flags: "g", input: "a" }])

    workerAt(created, 0).deliver({ id: 1, result: okResult })
    await expect(pending).resolves.toEqual(okResult)
  })

  it("ignores responses with stale run ids", async () => {
    const { created, factory } = createTrackedFactory()
    const runner = createRegexRunner({ workerFactory: factory })

    const pending = runner.run({ pattern: "a", flags: "g", input: "a" })
    workerAt(created, 0).deliver({ id: 99, result: { status: "timeout" } })
    workerAt(created, 0).deliver({ id: 1, result: okResult })
    await expect(pending).resolves.toEqual(okResult)
  })

  it("terminates a wedged worker at the wall-clock deadline and recovers", async () => {
    const { created, factory } = createTrackedFactory()
    const runner = createRegexRunner({ workerFactory: factory, timeoutMs: 100 })

    const first = runner.run({ pattern: "(a+)+$", flags: "", input: "aaaa!" })
    vi.advanceTimersByTime(100)
    await expect(first).resolves.toEqual({ status: "timeout" })
    expect(workerAt(created, 0).terminated).toBe(true)

    // The next run gets a fresh worker instead of inheriting the wedged one.
    const second = runner.run({ pattern: "a", flags: "g", input: "a" })
    expect(created).toHaveLength(2)
    expect(workerAt(created, 1).terminated).toBe(false)
    workerAt(created, 1).deliver({ id: 2, result: okResult })
    await expect(second).resolves.toEqual(okResult)
  })

  it("cancels an in-flight run and terminates its worker when a new run arrives", async () => {
    const { created, factory } = createTrackedFactory()
    const runner = createRegexRunner({ workerFactory: factory })

    const first = runner.run({ pattern: "(a+)+$", flags: "", input: "aaaa!" })
    const second = runner.run({ pattern: "a", flags: "g", input: "a" })
    await expect(first).resolves.toEqual({ status: "cancelled" })
    expect(workerAt(created, 0).terminated).toBe(true)
    expect(created).toHaveLength(2)

    workerAt(created, 1).deliver({ id: 2, result: okResult })
    await expect(second).resolves.toEqual(okResult)
  })

  it("resolves cancellation explicitly and stops the worker", async () => {
    const { created, factory } = createTrackedFactory()
    const runner = createRegexRunner({ workerFactory: factory })

    const pending = runner.run({ pattern: "(a+)+$", flags: "", input: "aaaa!" })
    runner.cancel()
    await expect(pending).resolves.toEqual({ status: "cancelled" })
    expect(workerAt(created, 0).terminated).toBe(true)

    const afterCancel = runner.run({ pattern: "a", flags: "g", input: "a" })
    workerAt(created, 1).deliver({ id: 2, result: okResult })
    await expect(afterCancel).resolves.toEqual(okResult)
  })

  it("resolves unsupported when no worker can be created", async () => {
    const runner = createRegexRunner({ workerFactory: () => null })
    await expect(runner.run({ pattern: "a", flags: "", input: "a" })).resolves.toEqual({
      status: "unsupported",
    })
  })

  it("resolves unsupported when the worker reports a fault", async () => {
    const { created, factory } = createTrackedFactory()
    const runner = createRegexRunner({ workerFactory: factory })

    const pending = runner.run({ pattern: "a", flags: "g", input: "a" })
    workerAt(created, 0).fail()
    await expect(pending).resolves.toEqual({ status: "unsupported" })
    expect(workerAt(created, 0).terminated).toBe(true)
  })

  it("stops accepting work after disposal", async () => {
    const { factory } = createTrackedFactory()
    const runner = createRegexRunner({ workerFactory: factory })

    runner.dispose()
    await expect(runner.run({ pattern: "a", flags: "", input: "a" })).resolves.toEqual({
      status: "cancelled",
    })
  })
})
