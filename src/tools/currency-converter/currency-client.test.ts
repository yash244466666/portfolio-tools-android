import { describe, expect, it } from "vitest"
import { fetchBaseRates, type FetchLike } from "./currency-client"
import { maximumRatesResponseBytes } from "./currency"

const nowMs = 1_700_000_000_000

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  })
}

const validRow = { base: "USD", quote: "EUR", rate: 0.86, date: "2026-09-07" }

function fetchReturning(response: Response): FetchLike {
  return () => Promise.resolve(response)
}

describe("fetchBaseRates", () => {
  it("parses a bounded provider response", async () => {
    const outcome = await fetchBaseRates({
      base: "USD",
      nowMs,
      fetchImpl: fetchReturning(jsonResponse([validRow])),
    })
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return
    expect(outcome.entry.fetchedAtMs).toBe(nowMs)
    expect(outcome.entry.quotes["EUR"]).toEqual({ rate: 0.86, date: "2026-09-07" })
  })

  it("rejects a response body above the documented cap without parsing it", async () => {
    // One valid row plus a 300 KiB padding field is larger than the 256 KiB
    // cap the module promises; a real Response exposes a readable body, so
    // the stream reader must stop before buffering the whole thing.
    const oversized = [{ ...validRow, padding: "x".repeat(maximumRatesResponseBytes + 64 * 1024) }]
    const response = jsonResponse(oversized)
    expect(response.body).not.toBeNull()
    const outcome = await fetchBaseRates({
      base: "USD",
      nowMs,
      fetchImpl: fetchReturning(response),
    })
    expect(outcome).toEqual({ status: "malformed" })
  })

  it("rejects a declared Content-Length above the cap", async () => {
    const response = new Response("[]", {
      headers: { "content-length": String(maximumRatesResponseBytes + 1) },
    })
    const outcome = await fetchBaseRates({
      base: "USD",
      nowMs,
      fetchImpl: fetchReturning(response),
    })
    expect(outcome).toEqual({ status: "malformed" })
  })

  it("keeps supporting minimal fetch doubles with only json()", async () => {
    const fake = {
      status: 200,
      ok: true,
      json: () => Promise.resolve([validRow]),
    } as unknown as Response
    const outcome = await fetchBaseRates({
      base: "USD",
      nowMs,
      fetchImpl: () => Promise.resolve(fake),
    })
    expect(outcome.status).toBe("ok")
  })

  it("maps an aborted outer signal to cancellation", async () => {
    const controller = new AbortController()
    controller.abort()
    const outcome = await fetchBaseRates({
      base: "USD",
      nowMs,
      signal: controller.signal,
      fetchImpl: () => Promise.reject(new DOMException("aborted", "AbortError")),
    })
    expect(outcome).toEqual({ status: "cancelled" })
  })
})
