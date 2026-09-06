import type { RegexRunResult, RegexWorkerRequest, RegexWorkerResponse } from "./regex"

/**
 * Wall-clock deadline after which a wedged evaluation Worker is terminated. The engine
 * inside the Worker has a softer budget, but a single catastrophic `exec` call can
 * block past it, so termination is the real backstop against hostile patterns.
 */
export const workerTimeoutMs = 3000

/** Minimal Worker surface the runner needs; tests inject a fake with the same shape. */
export interface RegexWorkerLike {
  postMessage(message: RegexWorkerRequest): void
  terminate(): void
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: unknown) => void) | null
}

export type RegexWorkerFactory = () => RegexWorkerLike | null

function createDefaultWorker(): RegexWorkerLike | null {
  if (typeof Worker === "undefined") return null
  try {
    // Classic Worker (no module type) so the oldest supported packaged WebViews can run it.
    return new Worker(new URL("./regex.worker.ts", import.meta.url)) as RegexWorkerLike
  } catch {
    return null
  }
}

export interface RegexRunner {
  run(request: Omit<RegexWorkerRequest, "id">): Promise<RegexRunResult>
  /** Cancels the in-flight run, resolving it as cancelled. */
  cancel(): void
  /** Cancels and permanently stops the runner; later runs resolve as cancelled. */
  dispose(): void
}

interface PendingRun {
  id: number
  resolve: (result: RegexRunResult) => void
  timer: number
}

/**
 * Creates a terminable regex evaluation runner. One Worker is reused across runs, but a
 * run that is still busy when the next one arrives — or that hits the wall-clock
 * deadline — gets its Worker terminated and replaced, so a hostile pattern can never
 * wedge the tool permanently. Stale responses are ignored by run id.
 */
export function createRegexRunner(
  options: { workerFactory?: RegexWorkerFactory; timeoutMs?: number } = {},
): RegexRunner {
  const workerFactory = options.workerFactory ?? createDefaultWorker
  const timeoutMs = options.timeoutMs ?? workerTimeoutMs

  let worker: RegexWorkerLike | null = null
  let nextRunId = 0
  let pending: PendingRun | null = null
  let disposed = false

  function terminateWorker(): void {
    worker?.terminate()
    worker = null
  }

  function settlePending(result: RegexRunResult, terminate: boolean): void {
    if (!pending) return
    const current = pending
    pending = null
    if (terminate) terminateWorker()
    window.clearTimeout(current.timer)
    current.resolve(result)
  }

  function ensureWorker(): RegexWorkerLike | null {
    if (worker) return worker
    const created = workerFactory()
    if (!created) return null
    worker = created
    return created
  }

  function run(request: Omit<RegexWorkerRequest, "id">): Promise<RegexRunResult> {
    if (disposed) return Promise.resolve({ status: "cancelled" })
    // The previous run may be wedged inside a catastrophic pattern; its Worker cannot
    // accept new work, so terminate it and let the caller's await settle as cancelled.
    settlePending({ status: "cancelled" }, true)

    const activeWorker = ensureWorker()
    if (!activeWorker) return Promise.resolve({ status: "unsupported" })

    const id = ++nextRunId
    return new Promise<RegexRunResult>((resolve) => {
      const timer = window.setTimeout(() => {
        if (pending?.id === id) settlePending({ status: "timeout" }, true)
      }, timeoutMs)

      pending = { id, resolve, timer }

      activeWorker.onmessage = (event: { data: unknown }) => {
        const response = event.data as Partial<RegexWorkerResponse> | null
        if (!response || response.id !== id || pending?.id !== id) return
        settlePending(response.result as RegexRunResult, false)
      }
      activeWorker.onerror = () => {
        if (pending?.id === id) settlePending({ status: "unsupported" }, true)
      }

      activeWorker.postMessage({ id, ...request })
    })
  }

  function cancel(): void {
    settlePending({ status: "cancelled" }, true)
  }

  function dispose(): void {
    disposed = true
    cancel()
  }

  return { run, cancel, dispose }
}
