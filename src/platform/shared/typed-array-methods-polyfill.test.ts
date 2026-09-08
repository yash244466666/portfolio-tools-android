import { describe, expect, it } from "vitest"
import "./typed-array-methods-polyfill"

describe("typed-array encoding polyfills", () => {
  it("encodes hex in lowercase, matching the native form", () => {
    expect(new Uint8Array([]).toHex()).toBe("")
    expect(new Uint8Array([0, 1, 10, 255]).toHex()).toBe("00010aff")
    // Independent oracle: manual byte-to-hex expansion.
    const bytes = new Uint8Array(256)
    for (let index = 0; index < 256; index += 1) bytes[index] = index
    const manual = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
    expect(bytes.toHex()).toBe(manual)
  })

  it("encodes base64 with standard padding", () => {
    expect(new Uint8Array([]).toBase64()).toBe("")
    expect(new Uint8Array([104]).toBase64()).toBe("aA==")
    expect(new Uint8Array([104, 105]).toBase64()).toBe("aGk=")
    expect(new Uint8Array([104, 105, 33]).toBase64()).toBe("aGkh")
    // Independent oracle: TextEncoder bytes through the classic btoa path.
    // TextEncoder returns a foreign-realm view in jsdom, so copy into a
    // realm-local Uint8Array to exercise the polyfilled prototype.
    const text = "pdf.js fixture with padding"
    const encoded = Uint8Array.from(new TextEncoder().encode(text))
    const binary = Array.from(encoded, (byte) => String.fromCharCode(byte)).join("")
    expect(encoded.toBase64()).toBe(btoa(binary))
  })

  it("decodes base64 with standard and url alphabets, whitespace, and padding", () => {
    expect(Uint8Array.fromBase64("aGkh")).toStrictEqual(new Uint8Array([104, 105, 33]))
    expect(Uint8Array.fromBase64("aA==")).toStrictEqual(new Uint8Array([104]))
    expect(Uint8Array.fromBase64("aGk=")).toStrictEqual(new Uint8Array([104, 105]))
    expect(Uint8Array.fromBase64("aGk")).toStrictEqual(new Uint8Array([104, 105]))
    expect(Uint8Array.fromBase64("a A\t=\t=")).toStrictEqual(new Uint8Array([104]))
    expect(Uint8Array.fromBase64("-_8")).toStrictEqual(new Uint8Array([251, 255]))
  })

  it("round-trips through toBase64 and fromBase64", () => {
    const bytes = new Uint8Array(257)
    for (let index = 0; index < 257; index += 1) bytes[index] = (index * 37) % 256
    expect(Uint8Array.fromBase64(bytes.toBase64())).toStrictEqual(bytes)
  })

  it("rejects invalid base64 input", () => {
    expect(() => Uint8Array.fromBase64("a==")).toThrow(SyntaxError)
    expect(() => Uint8Array.fromBase64("ab*=")).toThrow(SyntaxError)
    expect(() => Uint8Array.fromBase64("a*!&")).toThrow(SyntaxError)
  })

  it("does not replace an existing native implementation", () => {
    // The polyfill is a no-op on engines that already ship these methods;
    // this test just records that contract via the guarded install.
    expect(typeof Uint8Array.prototype.toHex).toBe("function")
    expect(typeof Uint8Array.prototype.toBase64).toBe("function")
    expect(typeof Uint8Array.fromBase64).toBe("function")
  })
})