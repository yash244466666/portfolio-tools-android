import {
  runRegex,
  type RegexRunResult,
  type RegexWorkerRequest,
  type RegexWorkerResponse,
} from "./regex"

/**
 * Evaluation Worker entry. It exists so a hostile pattern can never freeze the UI
 * thread: the client terminates the whole Worker when a run exceeds its wall-clock
 * deadline (see `regex-client.ts`). All work happens inside `runRegex`, which is shared
 * with the pure tests.
 */
self.addEventListener("message", (event: MessageEvent<RegexWorkerRequest>) => {
  const request = event.data
  if (!request || typeof request.id !== "number") return
  let result: RegexRunResult
  try {
    result = runRegex({
      pattern: request.pattern,
      flags: request.flags,
      input: request.input,
    })
  } catch {
    // runRegex reports its own failures as typed results; this guard only exists so an
    // unexpected engine fault cannot silently kill the Worker.
    result = { status: "unsupported" }
  }
  const response: RegexWorkerResponse = { id: request.id, result }
  self.postMessage(response)
})
