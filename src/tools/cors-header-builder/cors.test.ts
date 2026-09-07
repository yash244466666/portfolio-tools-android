import { describe, expect, it } from "vitest"
import { buildCorsHeaders, fullHeaderText, maximumMaxAgeSeconds, parseMaxAge } from "./cors"

function build(overrides: Partial<Parameters<typeof buildCorsHeaders>[0]> = {}) {
  return buildCorsHeaders({
    allowOrigin: "*",
    selectedMethods: ["GET", "POST"],
    customMethods: "",
    selectedHeaders: ["Content-Type"],
    customHeaders: "",
    maxAge: "86400",
    allowCredentials: false,
    ...overrides,
  })
}

describe("buildCorsHeaders", () => {
  it("always emits the origin header", () => {
    const { headers } = build()
    expect(headers[0]).toEqual({ key: "Access-Control-Allow-Origin", value: "*" })
  })

  it("falls back to * for a blank origin", () => {
    const { headers } = build({ allowOrigin: "  " })
    expect(headers[0]!.value).toBe("*")
  })

  it("emits methods and headers lists", () => {
    const { headers } = build()
    expect(headers).toContainEqual({
      key: "Access-Control-Allow-Methods",
      value: "GET, POST",
    })
    expect(headers).toContainEqual({
      key: "Access-Control-Allow-Headers",
      value: "Content-Type",
    })
  })

  it("appends custom comma-separated tokens", () => {
    const { headers } = build({
      customMethods: " TRACE, CUSTOM ,",
      customHeaders: "X-Custom",
    })
    expect(headers).toContainEqual({
      key: "Access-Control-Allow-Methods",
      value: "GET, POST, TRACE, CUSTOM",
    })
    expect(headers).toContainEqual({
      key: "Access-Control-Allow-Headers",
      value: "Content-Type, X-Custom",
    })
  })

  it("omits the methods header when nothing is selected", () => {
    const { headers } = build({ selectedMethods: [], customMethods: "" })
    expect(headers.find((header) => header.key === "Access-Control-Allow-Methods")).toBeUndefined()
  })

  it("omits Max-Age when the field is blank instead of emitting 0", () => {
    const { headers } = build({ maxAge: "" })
    expect(headers.find((header) => header.key === "Access-Control-Max-Age")).toBeUndefined()
  })

  it("emits Max-Age as a plain number", () => {
    const { headers } = build({ maxAge: "600" })
    expect(headers).toContainEqual({ key: "Access-Control-Max-Age", value: "600" })
  })

  it("emits the credentials header when enabled", () => {
    const { headers } = build({ allowCredentials: true })
    expect(headers).toContainEqual({ key: "Access-Control-Allow-Credentials", value: "true" })
  })

  it("warns about a wildcard origin with credentials", () => {
    const { warnings } = build({ allowOrigin: "*", allowCredentials: true })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("wildcard origin")
  })

  it("does not warn for an explicit origin with credentials", () => {
    const { warnings } = build({ allowOrigin: "https://example.com", allowCredentials: true })
    expect(warnings).toHaveLength(0)
  })
})

describe("parseMaxAge", () => {
  it("parses whole seconds", () => {
    expect(parseMaxAge("0")).toBe(0)
    expect(parseMaxAge(" 86400 ")).toBe(86_400)
  })

  it("returns null for blank input", () => {
    expect(parseMaxAge("")).toBeNull()
    expect(parseMaxAge("   ")).toBeNull()
  })

  it("rejects negative, fractional, and non-numeric values", () => {
    expect(parseMaxAge("-1")).toBeNull()
    expect(parseMaxAge("1.5")).toBeNull()
    expect(parseMaxAge("abc")).toBeNull()
  })

  it("rejects values above the documented cap", () => {
    expect(parseMaxAge(String(maximumMaxAgeSeconds + 1))).toBeNull()
    expect(parseMaxAge(String(maximumMaxAgeSeconds))).toBe(maximumMaxAgeSeconds)
  })
})

describe("fullHeaderText", () => {
  it("joins entries as key: value lines", () => {
    const text = fullHeaderText([
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Max-Age", value: "600" },
    ])
    expect(text).toBe("Access-Control-Allow-Origin: *\nAccess-Control-Max-Age: 600")
  })
})
