import { describe, expect, it, vi } from "vitest"
import { fetchDnsRecords, type FetchLike } from "./dns-client"

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/dns-json" },
  })
}

function statusResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? "" : JSON.stringify(body), { status })
}

const capturedBody = {
  Status: 0,
  Question: [{ name: "example.com", type: 1 }],
  Answer: [
    { name: "example.com", type: 1, TTL: 116, data: "172.66.147.243" },
    { name: "example.com", type: 1, TTL: 116, data: "104.20.23.154" },
  ],
}

function makeFetch(
  response: Response | Promise<Response> | ((input: URL, init: RequestInit) => Promise<Response>),
): FetchLike {
  return vi.fn((input: URL, init: RequestInit) =>
    typeof response === "function" ? response(input, init) : Promise.resolve(response),
  )
}

describe("fetchDnsRecords", () => {
  it("sends the DoH query with the JSON accept header", async () => {
    const fetchImpl = makeFetch(okResponse(capturedBody))
    const outcome = await fetchDnsRecords({ name: "example.com", type: "A", fetchImpl })
    expect(outcome.status).toBe("ok")
    const [input, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [
      URL,
      RequestInit,
    ]
    expect(String(input)).toBe("https://cloudflare-dns.com/dns-query?name=example.com&type=A")
    expect(init.headers).toEqual({ accept: "application/dns-json" })
    expect(outcome.status === "ok" ? outcome.records.length : 0).toBe(2)
  })

  it("maps a non-existent domain to a typed DNS error", async () => {
    const outcome = await fetchDnsRecords({
      name: "nonexistent-xyz.com",
      type: "A",
      fetchImpl: makeFetch(
        okResponse({ Status: 3, Question: [{ name: "nonexistent-xyz.com", type: 1 }] }),
      ),
    })
    expect(outcome).toEqual({ status: "dns-error", rcode: 3 })
  })

  it("maps a NOERROR answer without rows to no-record", async () => {
    const outcome = await fetchDnsRecords({
      name: "example.com",
      type: "TXT",
      fetchImpl: makeFetch(okResponse({ Status: 0 })),
    })
    expect(outcome).toEqual({ status: "no-record" })
  })

  it("maps the provider's HTTP 400 rejection to invalid-query", async () => {
    const outcome = await fetchDnsRecords({
      name: "bad..name",
      type: "A",
      fetchImpl: makeFetch(statusResponse(400, { error: "Invalid query name `bad..name`." })),
    })
    expect(outcome).toEqual({ status: "invalid-query" })
  })

  it("maps HTTP 429 to rate-limited and other errors to provider-failure", async () => {
    expect(
      (
        await fetchDnsRecords({
          name: "example.com",
          type: "A",
          fetchImpl: makeFetch(statusResponse(429)),
        })
      ).status,
    ).toBe("rate-limited")
    expect(
      (
        await fetchDnsRecords({
          name: "example.com",
          type: "A",
          fetchImpl: makeFetch(statusResponse(500)),
        })
      ).status,
    ).toBe("provider-failure")
  })

  it("maps unparseable and oversized bodies to malformed", async () => {
    const badJson = makeFetch(Promise.resolve(new Response("not json", { status: 200 })))
    expect(
      (await fetchDnsRecords({ name: "example.com", type: "A", fetchImpl: badJson })).status,
    ).toBe("malformed")

    const oversized = makeFetch(Promise.resolve(new Response("x".repeat(131_073), { status: 200 })))
    expect(
      (await fetchDnsRecords({ name: "example.com", type: "A", fetchImpl: oversized })).status,
    ).toBe("malformed")
  })

  it("accepts a body exactly at the response bound", async () => {
    // A body at the cap parses; padding inside a valid shell keeps it under JSON validity.
    const padding = " ".repeat(131_072 - JSON.stringify(capturedBody).length)
    const atCap = makeFetch(
      Promise.resolve(new Response(JSON.stringify(capturedBody) + padding, { status: 200 })),
    )
    expect(
      (await fetchDnsRecords({ name: "example.com", type: "A", fetchImpl: atCap })).status,
    ).toBe("ok")
  })

  it("maps a network failure to offline", async () => {
    const failing = makeFetch(() => Promise.reject(new TypeError("Failed to fetch")))
    const outcome = await fetchDnsRecords({ name: "example.com", type: "A", fetchImpl: failing })
    expect(outcome).toEqual({ status: "offline" })
  })

  it("reports cancellation when the outer signal aborts", async () => {
    const controller = new AbortController()
    // A real fetch rejects with AbortError when its signal aborts; the fake does too.
    const neverSettling = makeFetch(
      (_input: URL, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          )
        }),
    )
    const pending = fetchDnsRecords({
      name: "example.com",
      type: "A",
      fetchImpl: neverSettling,
      signal: controller.signal,
    })
    controller.abort()
    expect(await pending).toEqual({ status: "cancelled" })
  })

  it("times out a hanging request and reports timeout", async () => {
    vi.useFakeTimers()
    try {
      const hanging = makeFetch(
        (_input: URL, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            )
          }),
      )
      const pending = fetchDnsRecords({ name: "example.com", type: "A", fetchImpl: hanging })
      const assertion = expect(pending).resolves.toEqual({ status: "timeout" })
      await vi.advanceTimersByTimeAsync(16_000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })
})
