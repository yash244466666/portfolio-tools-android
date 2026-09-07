import { describe, expect, it } from "vitest"
import { httpStatusCodes } from "./http-status-data"
import { filterStatusCodes, getStatusCode } from "./http-status"

describe("HTTP status dataset integrity", () => {
  it("contains unique, ascending codes inside 100–599", () => {
    const codes = httpStatusCodes.map((entry) => entry.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect([...codes].sort((a, b) => a - b)).toEqual(codes)
    for (const code of codes) {
      expect(code).toBeGreaterThanOrEqual(100)
      expect(code).toBeLessThanOrEqual(599)
    }
  })

  it("derives each category from the code's leading digit", () => {
    for (const entry of httpStatusCodes) {
      expect(entry.category).toBe(`${String(entry.code)[0]}xx`)
    }
  })

  it("matches independent RFC reason phrases", () => {
    expect(getStatusCode(200)?.name).toBe("OK")
    expect(getStatusCode(301)?.name).toBe("Moved Permanently")
    expect(getStatusCode(404)?.name).toBe("Not Found")
    expect(getStatusCode(418)?.name).toBe("I'm a Teapot")
    expect(getStatusCode(429)?.name).toBe("Too Many Requests")
    expect(getStatusCode(503)?.name).toBe("Service Unavailable")
    expect(getStatusCode(600)).toBeUndefined()
  })
})

describe("filterStatusCodes", () => {
  it("returns the full dataset for an empty query and the all tab", () => {
    expect(filterStatusCodes("", "all")).toEqual(httpStatusCodes)
  })

  it("matches by code fragment, name, and description", () => {
    expect(filterStatusCodes("404", "all").map((entry) => entry.code)).toEqual([404])
    expect(filterStatusCodes("not found", "all").map((entry) => entry.code)).toContain(404)
    expect(filterStatusCodes("gateway", "5xx").map((entry) => entry.code)).toEqual([502, 504])
  })

  it("restricts by class tab", () => {
    const success = filterStatusCodes("", "2xx")
    expect(success.length).toBeGreaterThan(0)
    for (const entry of success) {
      expect(entry.category).toBe("2xx")
    }
  })

  it("trims surrounding whitespace", () => {
    expect(filterStatusCodes("  200  ", "all").map((entry) => entry.code)).toEqual([200])
  })
})
