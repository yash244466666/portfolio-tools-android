import { describe, expect, it } from "vitest"
import { decodeUrlComponent, encodeUrlComponent, maximumUrlChars, parseUrlParts } from "./url"

describe("percent encoding", () => {
  it("encodes with encodeURIComponent semantics", () => {
    expect(encodeUrlComponent("")).toEqual({ status: "ok", value: "" })
    expect(encodeUrlComponent("a b")).toEqual({ status: "ok", value: "a%20b" })
    expect(encodeUrlComponent("a+b")).toEqual({ status: "ok", value: "a%2Bb" })
    expect(encodeUrlComponent("https://example.com/?q= x")).toEqual({
      status: "ok",
      value: "https%3A%2F%2Fexample.com%2F%3Fq%3D%20x",
    })
    // Unreserved characters stay readable.
    expect(encodeUrlComponent("aB1-_.~")).toEqual({ status: "ok", value: "aB1-_.~" })
  })

  it("decodes and reports malformed escapes as typed failures", () => {
    expect(decodeUrlComponent("a%20b")).toEqual({ status: "ok", value: "a b" })
    expect(decodeUrlComponent("100%")).toEqual({ status: "invalid-escape" })
    expect(decodeUrlComponent("%zz")).toEqual({ status: "invalid-escape" })
    expect(decodeUrlComponent("%C3%A9")).toEqual({ status: "ok", value: "é" })
  })

  it("rejects input beyond the limit", () => {
    expect(encodeUrlComponent("a".repeat(maximumUrlChars + 1))).toEqual({ status: "too-long" })
    expect(decodeUrlComponent("a".repeat(maximumUrlChars + 1))).toEqual({ status: "too-long" })
    expect(maximumUrlChars).toBe(100_000)
  })

  it("round-trips unicode", () => {
    const text = "Grüße/বাংলা 🇧🇩"
    const encoded = encodeUrlComponent(text)
    expect(encoded.status).toBe("ok")
    if (encoded.status === "ok") {
      expect(decodeUrlComponent(encoded.value)).toEqual({ status: "ok", value: text })
    }
  })
})

describe("parseUrlParts", () => {
  it("splits an absolute URL into its parts", () => {
    const outcome = parseUrlParts("https://example.com:8443/path/page?q=1#top")
    expect(outcome.status).toBe("ok")
    if (outcome.status === "ok") {
      expect(outcome.assumedHttps).toBe(false)
      expect(outcome.parts).toEqual({
        protocol: "https",
        hostname: "example.com",
        port: "8443",
        pathname: "/path/page",
        search: "?q=1",
        hash: "#top",
      })
    }
  })

  it("reports the assumed https scheme for scheme-less input", () => {
    const outcome = parseUrlParts("example.com/page")
    expect(outcome.status).toBe("ok")
    if (outcome.status === "ok") {
      expect(outcome.assumedHttps).toBe(true)
      expect(outcome.parts.protocol).toBe("https")
      expect(outcome.parts.hostname).toBe("example.com")
    }
  })

  it("rejects URLs that are invalid even with a scheme", () => {
    expect(parseUrlParts("https://").status).toBe("invalid-url")
    expect(parseUrlParts("not a url at all").status).toBe("invalid-url")
    expect(parseUrlParts("").status).toBe("invalid-url")
  })

  it("normalizes defaults for port, path, query, and fragment", () => {
    const outcome = parseUrlParts("https://example.com")
    expect(outcome.status).toBe("ok")
    if (outcome.status === "ok") {
      expect(outcome.parts).toEqual({
        protocol: "https",
        hostname: "example.com",
        port: "(default)",
        pathname: "/",
        search: "(none)",
        hash: "(none)",
      })
    }
  })
})
