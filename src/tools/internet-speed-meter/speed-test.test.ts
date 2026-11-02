import { describe, expect, it } from "vitest"
import {
  downloadTestBytes,
  latencySamples,
  runSpeedTest,
  speedTestOrigin,
  uploadTestBytes,
  type FetchLike,
} from "./speed-test"

const mebibyte = 1024 * 1024

function singleByteResponse(): Response {
  return new Response(new Uint8Array(1), {
    status: 200,
    headers: { "content-type": "application/octet-stream" },
  })
}

function streamResponse(chunks: readonly number[], headers: Record<string, string> = {}): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const size of chunks) controller.enqueue(new Uint8Array(size))
      controller.close()
    },
  })
  return new Response(stream, { status: 200, headers })
}

function emptyResponse(): Response {
  return new Response(null, { status: 200 })
}

interface FakeProvider {
  fetchImpl: FetchLike
  nowMs: () => number
  calls: { url: string; init: RequestInit }[]
}

function provider(options: {
  latency?: () => Response
  download?: () => Response
  upload?: () => Response
  advanceMs?: number
}): FakeProvider {
  let now = 0
  const calls: { url: string; init: RequestInit }[] = []
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url: url.toString(), init })
    now += options.advanceMs ?? 100
    // Latency probes are the only requests carrying a one-byte download.
    if (url.searchParams.get("bytes") === "1") {
      return (options.latency ?? singleByteResponse)()
    }
    if (url.pathname === "/__up") return (options.upload ?? emptyResponse)()
    return (
      options.download ?? (() => streamResponse([mebibyte, mebibyte], { "cf-meta-colo": "DAC" }))
    )()
  }
  return { fetchImpl, nowMs: () => now, calls }
}

describe("runSpeedTest", () => {
  it("measures latency, download, and upload against the exact provider origin", async () => {
    const fake = provider({})
    const outcome = await runSpeedTest({ fetchImpl: fake.fetchImpl, nowMs: fake.nowMs })
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") throw new Error("expected ok")

    expect(outcome.result.latencyMs).toBe(100)
    expect(outcome.result.jitterMs).toBe(0)
    expect(outcome.result.downloadMbps).toBeCloseTo(167.77216, 6)
    expect(outcome.result.uploadMbps).toBeCloseTo(335.54432, 6)
    expect(outcome.result.downloadBytes).toBe(2 * mebibyte)
    expect(outcome.result.uploadBytes).toBe(uploadTestBytes)
    expect(outcome.result.downloadComplete).toBe(true)
    expect(outcome.result.uploadComplete).toBe(true)
    expect(outcome.result.edgeLocation).toBe("DAC")

    expect(
      fake.calls.filter((call) => call.url === `${speedTestOrigin}/__down?bytes=1`),
    ).toHaveLength(latencySamples)
    expect(
      fake.calls.some(
        (call) => call.url === `${speedTestOrigin}/__down?bytes=${downloadTestBytes}`,
      ),
    ).toBe(true)
    expect(fake.calls.some((call) => call.url === `${speedTestOrigin}/__up`)).toBe(true)
    for (const call of fake.calls) {
      expect(new URL(call.url).origin).toBe(speedTestOrigin)
      expect(call.init.credentials).toBe("omit")
      expect(call.init.referrerPolicy).toBe("no-referrer")
      expect(call.init.redirect).toBe("error")
      expect(call.init.cache).toBe("no-store")
    }
  })

  it("reports a rate limit distinctly", async () => {
    const fake = provider({ latency: () => new Response(null, { status: 429 }) })
    expect(await runSpeedTest({ fetchImpl: fake.fetchImpl, nowMs: fake.nowMs })).toEqual({
      status: "rate-limited",
    })
  })

  it("reports provider failures distinctly", async () => {
    const fake = provider({ latency: () => new Response(null, { status: 503 }) })
    expect(await runSpeedTest({ fetchImpl: fake.fetchImpl, nowMs: fake.nowMs })).toEqual({
      status: "provider-failure",
    })
  })

  it("reports an offline network when fetch rejects", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError("network down")
    }
    expect(await runSpeedTest({ fetchImpl, nowMs: () => 0 })).toEqual({ status: "offline" })
  })

  it("reports a timeout when the request aborts without the user cancelling", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new DOMException("aborted", "AbortError")
    }
    expect(await runSpeedTest({ fetchImpl, nowMs: () => 0 })).toEqual({ status: "timeout" })
  })

  it("reports user cancellation before any request", async () => {
    const controller = new AbortController()
    controller.abort()
    const fake = provider({})
    expect(
      await runSpeedTest({
        signal: controller.signal,
        fetchImpl: fake.fetchImpl,
        nowMs: fake.nowMs,
      }),
    ).toEqual({ status: "cancelled" })
    expect(fake.calls).toHaveLength(0)
  })

  it("rejects an oversized latency body instead of trusting it", async () => {
    const fake = provider({
      latency: () => new Response(new Uint8Array(8 * 1024), { status: 200 }),
    })
    expect(await runSpeedTest({ fetchImpl: fake.fetchImpl, nowMs: fake.nowMs })).toEqual({
      status: "malformed",
    })
  })

  it("reports an upload failure after a successful download", async () => {
    const fake = provider({ upload: () => new Response(null, { status: 429 }) })
    expect(await runSpeedTest({ fetchImpl: fake.fetchImpl, nowMs: fake.nowMs })).toEqual({
      status: "rate-limited",
    })
  })
})
