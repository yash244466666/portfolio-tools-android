/**
 * Explicit, user-initiated speed test against Cloudflare's public speed-test
 * endpoints. The provider is the second and last network provider in version 1
 * (ADR 0027). Every request is HTTPS-only to this exact origin, carries no
 * credential, referrer, or identifier, is bounded by payload and time budgets,
 * and is cancelled through an AbortController when the user leaves or stops.
 * Nothing is logged, cached, or persisted.
 *
 * The endpoints are undocumented for third-party use; the provider review in
 * issue #33 must re-approve them before release.
 */

import { megabitsPerSecond, median, jitter } from "./logic"

export const speedTestOrigin = "https://speed.cloudflare.com"
export const latencySamples = 5
export const latencyProbeBytes = 1
export const maximumLatencyResponseBytes = 4 * 1024
// Cloudflare rejects a single request above 10,000,000 bytes with a CORS-less
// 429, which a browser reports as a network failure; 8 MiB stays safely below
// that cap while remaining large enough for a useful measurement.
export const downloadTestBytes = 8 * 1024 * 1024
export const uploadTestBytes = 4 * 1024 * 1024
export const latencyPhaseBudgetMs = 10_000
export const downloadPhaseBudgetMs = 15_000
export const uploadPhaseBudgetMs = 15_000
export const totalSpeedTestBudgetMs = 40_000

export type SpeedTestPhase = "latency" | "download" | "upload"

export interface SpeedTestProgress {
  phase: SpeedTestPhase
  completed: number
  total: number
}

export interface SpeedTestResult {
  latencyMs: number
  jitterMs: number | null
  downloadMbps: number
  uploadMbps: number
  downloadBytes: number
  uploadBytes: number
  downloadComplete: boolean
  uploadComplete: boolean
  edgeLocation: string | null
}

export type SpeedTestOutcome =
  | { status: "ok"; result: SpeedTestResult }
  | { status: "cancelled" }
  | { status: "offline" }
  | { status: "timeout" }
  | { status: "rate-limited" }
  | { status: "provider-failure" }
  | { status: "malformed" }

export type SpeedTestFailure = Exclude<SpeedTestOutcome, { status: "ok" }>

export type FetchLike = (input: URL, init: RequestInit) => Promise<Response>

export interface SpeedTestOptions {
  signal?: AbortSignal
  fetchImpl?: FetchLike
  nowMs?: () => number
  onProgress?: (progress: SpeedTestProgress) => void
}

interface PhaseFailure {
  status: "cancelled" | "offline" | "timeout" | "rate-limited" | "provider-failure" | "malformed"
}

interface PhaseSuccess {
  status: "ok"
  response: Response
}

type PhaseOutcome = PhaseSuccess | PhaseFailure

function defaultFetch(): FetchLike | null {
  return typeof fetch === "function" ? fetch : null
}

function isAbortLike(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  )
}

function edgeLocationFrom(response: Response): string | null {
  const value = response.headers?.get("cf-meta-colo")
  return typeof value === "string" && /^[A-Za-z0-9-]{1,8}$/.test(value) ? value : null
}

async function readAtMost(response: Response, cap: number): Promise<number | null> {
  const reader = response.body?.getReader?.()
  if (!reader) {
    try {
      const body = await response.arrayBuffer()
      return body.byteLength <= cap ? body.byteLength : null
    } catch {
      return null
    }
  }
  let bytes = 0
  try {
    while (bytes < cap) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value?.byteLength ?? 0
    }
    return bytes <= cap ? bytes : null
  } catch {
    return null
  } finally {
    await reader.cancel().catch(() => undefined)
  }
}

/**
 * Runs one phase request whose lifetime is bounded by both the user's signal
 * and a phase deadline. The returned response body is not yet consumed.
 */
async function requestPhase(
  fetchImpl: FetchLike,
  url: URL,
  init: RequestInit,
  outer: AbortSignal | undefined,
  budgetMs: number,
): Promise<PhaseOutcome> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(
    () => {
      timedOut = true
      controller.abort()
    },
    Math.max(1, budgetMs),
  )
  const onOuterAbort = () => controller.abort()
  outer?.addEventListener("abort", onOuterAbort, { once: true })

  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal })
    if (response.status === 429) return { status: "rate-limited" }
    if (!response.ok) return { status: "provider-failure" }
    return { status: "ok", response }
  } catch (error) {
    if (outer?.aborted) return { status: "cancelled" }
    if (timedOut || isAbortLike(error)) return { status: "timeout" }
    return { status: "offline" }
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener("abort", onOuterAbort)
  }
}

function requestInit(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    redirect: "error",
  }
}

/**
 * Measures five small probes, then streams a bounded download and uploads a
 * bounded payload. Returns a typed outcome; a download that reaches its time
 * budget after receiving data is reported as a partial (honest) measurement.
 */
export async function runSpeedTest(options: SpeedTestOptions = {}): Promise<SpeedTestOutcome> {
  const doFetch = options.fetchImpl ?? defaultFetch()
  if (!doFetch) return { status: "offline" }

  const nowMs = options.nowMs ?? (() => performance.now())
  const startedAt = nowMs()
  const remaining = () => totalSpeedTestBudgetMs - (nowMs() - startedAt)
  const report = (progress: SpeedTestProgress) => options.onProgress?.(progress)
  const cancelled = () => options.signal?.aborted === true

  // Latency
  const probes: number[] = []
  for (let index = 0; index < latencySamples; index += 1) {
    if (cancelled()) return { status: "cancelled" }
    const budget = Math.min(latencyPhaseBudgetMs / latencySamples, remaining())
    if (budget <= 0) return { status: "timeout" }
    const url = new URL(`${speedTestOrigin}/__down?bytes=${latencyProbeBytes}`)
    const probeStarted = nowMs()
    const outcome = await requestPhase(doFetch, url, requestInit(), options.signal, budget)
    if (outcome.status !== "ok") return outcome
    const bytes = await readAtMost(outcome.response, maximumLatencyResponseBytes)
    if (bytes === null) return { status: "malformed" }
    probes.push(Math.max(0, nowMs() - probeStarted))
    report({ phase: "latency", completed: index + 1, total: latencySamples })
  }

  const latencyMs = median(probes)
  if (latencyMs === null) return { status: "malformed" }

  // Download
  if (cancelled()) return { status: "cancelled" }
  const downloadBudget = Math.min(downloadPhaseBudgetMs, remaining())
  if (downloadBudget <= 0) return { status: "timeout" }
  const downloadUrl = new URL(`${speedTestOrigin}/__down?bytes=${downloadTestBytes}`)
  const downloadStarted = nowMs()
  const downloadController = new AbortController()
  let downloadTimedOut = false
  const downloadTimer = setTimeout(() => {
    downloadTimedOut = true
    downloadController.abort()
  }, downloadBudget)
  const onDownloadAbort = () => downloadController.abort()
  options.signal?.addEventListener("abort", onDownloadAbort, { once: true })

  let downloadBytes = 0
  let edgeLocation: string | null
  let downloadComplete = false
  let lastProgressAt = -Infinity
  try {
    let response: Response
    try {
      response = await doFetch(downloadUrl, {
        ...requestInit({ method: "GET" }),
        signal: downloadController.signal,
      })
    } catch (error) {
      if (cancelled()) return { status: "cancelled" }
      if (downloadTimedOut || isAbortLike(error)) return { status: "timeout" }
      return { status: "offline" }
    }
    if (response.status === 429) return { status: "rate-limited" }
    if (!response.ok) return { status: "provider-failure" }
    edgeLocation = edgeLocationFrom(response)

    const reader = response.body?.getReader?.()
    if (!reader) {
      try {
        const body = await response.arrayBuffer()
        downloadBytes = Math.min(body.byteLength, downloadTestBytes)
        downloadComplete = body.byteLength >= downloadTestBytes
      } catch {
        if (cancelled()) return { status: "cancelled" }
        if (!downloadTimedOut) return { status: "offline" }
      }
    } else {
      try {
        while (downloadBytes < downloadTestBytes) {
          const chunk = await reader.read()
          if (chunk.done) {
            downloadComplete = true
            break
          }
          downloadBytes += chunk.value?.byteLength ?? 0
          downloadBytes = Math.min(downloadBytes, downloadTestBytes)
          const at = nowMs()
          if (at - lastProgressAt >= 100) {
            lastProgressAt = at
            report({ phase: "download", completed: downloadBytes, total: downloadTestBytes })
          }
          if (downloadBytes >= downloadTestBytes) {
            downloadComplete = true
            break
          }
        }
      } catch {
        if (cancelled()) return { status: "cancelled" }
        if (!downloadTimedOut) return { status: "offline" }
      } finally {
        await reader.cancel().catch(() => undefined)
      }
    }
  } finally {
    clearTimeout(downloadTimer)
    options.signal?.removeEventListener("abort", onDownloadAbort)
  }

  if (cancelled()) return { status: "cancelled" }
  const downloadElapsed = nowMs() - downloadStarted
  const downloadMbps = megabitsPerSecond(downloadBytes, downloadElapsed)
  if (downloadMbps === null) {
    return downloadBytes === 0 ? { status: "timeout" } : { status: "malformed" }
  }
  report({ phase: "download", completed: downloadBytes, total: downloadTestBytes })

  // Upload
  if (cancelled()) return { status: "cancelled" }
  const uploadBudget = Math.min(uploadPhaseBudgetMs, remaining())
  if (uploadBudget <= 0) return { status: "timeout" }
  const uploadUrl = new URL(`${speedTestOrigin}/__up`)
  const payload = new Uint8Array(uploadTestBytes)
  const uploadStarted = nowMs()
  const uploadOutcome = await requestPhase(
    doFetch,
    uploadUrl,
    requestInit({
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: payload,
    }),
    options.signal,
    uploadBudget,
  )
  if (uploadOutcome.status !== "ok") return uploadOutcome
  const uploadRead = await readAtMost(uploadOutcome.response, maximumLatencyResponseBytes)
  if (uploadRead === null) return { status: "malformed" }
  if (cancelled()) return { status: "cancelled" }

  const uploadElapsed = nowMs() - uploadStarted
  const uploadMbps = megabitsPerSecond(uploadTestBytes, uploadElapsed)
  if (uploadMbps === null) return { status: "malformed" }
  report({ phase: "upload", completed: uploadTestBytes, total: uploadTestBytes })

  return {
    status: "ok",
    result: {
      latencyMs,
      jitterMs: jitter(probes),
      downloadMbps,
      uploadMbps,
      downloadBytes,
      uploadBytes: uploadTestBytes,
      downloadComplete,
      uploadComplete: true,
      edgeLocation,
    },
  }
}
