import { describe, expect, it } from "vitest"
import { decodeBase64, encodeBase64, maximumBase64Chars } from "./base64"

describe("encodeBase64", () => {
  it("produces standard RFC 4648 vectors", () => {
    expect(encodeBase64("")).toEqual({ status: "ok", value: "" })
    expect(encodeBase64("f")).toEqual({ status: "ok", value: "Zg==" })
    expect(encodeBase64("fo")).toEqual({ status: "ok", value: "Zm8=" })
    expect(encodeBase64("foo")).toEqual({ status: "ok", value: "Zm9v" })
    expect(encodeBase64("foobar")).toEqual({ status: "ok", value: "Zm9vYmFy" })
  })

  it("encodes multi-byte UTF-8 characters correctly", () => {
    // Regression: upstream relied on deprecated escape/unescape round-trips.
    expect(encodeBase64("👍")).toEqual({ status: "ok", value: "8J+RjQ==" })
    expect(encodeBase64("héllo")).toEqual({ status: "ok", value: "aMOpbGxv" })
  })

  it("rejects input beyond the limit", () => {
    expect(encodeBase64("a".repeat(maximumBase64Chars + 1))).toEqual({ status: "too-long" })
    expect(maximumBase64Chars).toBe(100_000)
  })
})

describe("decodeBase64", () => {
  it("decodes standard vectors", () => {
    expect(decodeBase64("Zm9v")).toEqual({ status: "ok", value: "foo" })
    expect(decodeBase64("Zm9vYmFy")).toEqual({ status: "ok", value: "foobar" })
    expect(decodeBase64("")).toEqual({ status: "ok", value: "" })
  })

  it("tolerates whitespace and missing padding", () => {
    expect(decodeBase64("Zm9v\nYmFy")).toEqual({ status: "ok", value: "foobar" })
    expect(decodeBase64("Zg")).toEqual({ status: "ok", value: "f" })
    expect(decodeBase64("  Zm8=  ")).toEqual({ status: "ok", value: "fo" })
  })

  it("rejects invalid characters and broken lengths", () => {
    expect(decodeBase64("Zm9v!")).toEqual({ status: "invalid-base64" })
    expect(decodeBase64("Z")).toEqual({ status: "invalid-base64" })
    expect(decodeBase64("A===")).toEqual({ status: "invalid-base64" })
    expect(decodeBase64("a=bc")).toEqual({ status: "invalid-base64" })
  })

  it("distinguishes invalid UTF-8 bytes from invalid Base64", () => {
    // 0xFF 0xFE alone are valid Base64 bytes but not valid UTF-8.
    expect(decodeBase64("//4=")).toEqual({ status: "invalid-utf8" })
  })

  it("round-trips unicode text", () => {
    const text = "Grüße from বাংলাদেশ 🇧🇩"
    const encoded = encodeBase64(text)
    expect(encoded.status).toBe("ok")
    if (encoded.status === "ok") {
      expect(decodeBase64(encoded.value)).toEqual({ status: "ok", value: text })
    }
  })
})
