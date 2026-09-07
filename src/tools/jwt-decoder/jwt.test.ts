import { describe, expect, it } from "vitest"
import {
  decodeBase64Url,
  expiryState,
  formatEpochClaim,
  maximumJwtLength,
  numericClaim,
  parseJwt,
} from "./jwt"

// RFC 7515 A.1 (HS256 header) and RFC 7519 A.1 (payload), re-encoded with the
// standard base64url alphabet; values here are the well-known published vectors.
const headerB64 = "eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9"
const payloadB64 =
  "eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290IjoidHJ1ZSJ9"

describe("decodeBase64Url", () => {
  it("decodes unpadded base64url to UTF-8 text", () => {
    // "héllo" has a two-byte é, exercising multi-byte UTF-8 decode.
    const encoded = "aMOpbGxv"
    expect(decodeBase64Url(encoded)).toBe("héllo")
    expect(decodeBase64Url("e30")).toBe("{}")
  })
})

describe("parseJwt", () => {
  it("decodes RFC 7515/7519 A.1 header and payload", () => {
    const result = parseJwt(`${headerB64}.${payloadB64}.dBjftJeZ4CJP-mB6Kxth`)
    expect(result.message).toBe("")
    expect(result.claims?.header).toEqual({ typ: "JWT", alg: "HS256" })
    const payload = result.claims?.payload as Record<string, unknown>
    expect(payload["iss"]).toBe("joe")
    expect(payload["exp"]).toBe(1300819380)
    expect(result.claims?.signatureBase64Url).toBe("dBjftJeZ4CJP-mB6Kxth")
  })

  it("reports every malformed shape without throwing", () => {
    expect(parseJwt("abc.def").message).toContain("three dot-separated parts")
    expect(parseJwt("abc.def.ghi.jkl").message).toContain("token has 4")
    expect(parseJwt("..sig").message).toContain("header part is empty")
    expect(parseJwt("h!.p.sig").message).toContain("header part is not valid base64url")
    // "AAAA" decodes to three zero bytes, not JSON.
    expect(parseJwt("AAAA.e30.sig").message).toContain("header is not a JSON object")
    // "[1,2]" is JSON but not an object.
    expect(parseJwt("WzEsMl0.e30.sig").message).toContain("header is not a JSON object")
    expect(parseJwt("a b.c.d").message).toContain("whitespace")
  })

  it("rejects over-long tokens", () => {
    const token = `${"a".repeat(maximumJwtLength + 1)}.${"b"}`
    expect(parseJwt(token).message).toContain("too long")
  })

  it("returns an empty message for empty input without claims", () => {
    expect(parseJwt("")).toEqual({ claims: null, message: "" })
  })
})

describe("numericClaim", () => {
  it("accepts finite numbers and rejects other types", () => {
    expect(numericClaim({ exp: 1300819380 }, "exp")).toEqual({
      epochSeconds: 1300819380,
      raw: 1300819380,
    })
    expect(numericClaim({ exp: "1300819380" }, "exp").epochSeconds).toBeNull()
    expect(numericClaim({ exp: Number.NaN }, "exp").epochSeconds).toBeNull()
    expect(numericClaim({}, "exp").epochSeconds).toBeNull()
    expect(numericClaim({ exp: true }, "exp").epochSeconds).toBeNull()
  })
})

describe("expiryState", () => {
  const nowMs = Date.UTC(2026, 0, 15, 12, 0, 0)

  it("verdicts against the provided clock", () => {
    const active = expiryState({ exp: Math.floor(nowMs / 1000) + 60 }, nowMs)
    expect(active).toEqual({ label: "Active", expired: false })
    const expired = expiryState({ exp: Math.floor(nowMs / 1000) - 60 }, nowMs)
    expect(expired).toEqual({ label: "Expired", expired: true })
  })

  it("stays neutral when the claim is absent or non-numeric", () => {
    expect(expiryState({}, nowMs)).toEqual({ label: "No numeric exp claim", expired: null })
    expect(expiryState({ exp: "soon" }, nowMs).expired).toBeNull()
  })
})

describe("formatEpochClaim", () => {
  it("formats with fixed UTC ISO output", () => {
    expect(formatEpochClaim(0)).toBe("1970-01-01 00:00:00 UTC (0)")
    expect(formatEpochClaim(1300819380)).toBe("2011-03-22 18:43:00 UTC (1300819380)")
  })
})
