import { describe, expect, it } from "vitest"
import {
  bytesToBase64,
  createQrMatrix,
  isValidQrInputSize,
  maximumQrInputBytes,
  planQrRender,
  qrInputBytes,
  qrQuietZoneModules,
} from "./qr"

/** Byte-mode capacity per error-correction level at the largest symbol (version 40). */
const version40ByteCapacity = { L: 2953, M: 2331, Q: 1663, H: 1273 } as const

describe("QR matrix generation vectors", () => {
  it("encodes short text into a version 1 symbol with spec structure", () => {
    const result = createQrMatrix("HELLO WORLD", "M")
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    const { matrix } = result
    expect(matrix.version).toBe(1)
    expect(matrix.size).toBe(21) // 21 + 4 x (version - 1)
    expect(matrix.dark).toHaveLength(21 * 21)

    const isDark = (row: number, column: number) => matrix.dark[row * matrix.size + column] === 1
    // Top-left finder pattern: dark border, light ring, dark 3x3 center.
    expect(isDark(0, 0)).toBe(true)
    expect(isDark(0, 3)).toBe(true)
    expect(isDark(1, 1)).toBe(false)
    expect(isDark(1, 3)).toBe(false)
    expect(isDark(2, 3)).toBe(true)
    expect(isDark(3, 3)).toBe(true)
    // Separators are light on all sides of the finder.
    expect(isDark(7, 0)).toBe(false)
    expect(isDark(0, 7)).toBe(false)
    // The same finder pattern repeats at the other two corners.
    expect(isDark(0, 20)).toBe(true)
    expect(isDark(20, 20)).toBe(true)
    expect(isDark(20, 0)).toBe(true)
    // Timing pattern: row 6 alternates, dark on even columns from 8.
    expect(isDark(6, 8)).toBe(true)
    expect(isDark(6, 9)).toBe(false)
    expect(isDark(6, 10)).toBe(true)
  })

  it("grows the symbol with input length and reports the version", () => {
    const short = createQrMatrix("hi", "L")
    const long = createQrMatrix("a".repeat(1000), "L")
    expect(short.status).toBe("ok")
    expect(long.status).toBe("ok")
    if (short.status !== "ok" || long.status !== "ok") return
    expect(long.matrix.version).toBeGreaterThan(short.matrix.version)
    expect(long.matrix.size).toBe(21 + 4 * (long.matrix.version - 1))
  })

  it("accepts inputs up to the per-level capacity and rejects beyond it", () => {
    // Within level H capacity.
    expect(createQrMatrix("a".repeat(version40ByteCapacity.H), "H").status).toBe("ok")
    // One byte over level H capacity, still fine at L.
    const overHigh = createQrMatrix("a".repeat(version40ByteCapacity.H + 1), "H")
    expect(overHigh.status).toBe("invalid")
    expect(createQrMatrix("a".repeat(version40ByteCapacity.H + 1), "L").status).toBe("ok")
    // One byte over level M capacity.
    expect(createQrMatrix("a".repeat(version40ByteCapacity.M + 1), "M").status).toBe("invalid")
    // Exactly at the full byte-mode maximum at level L.
    expect(createQrMatrix("a".repeat(version40ByteCapacity.L), "L").status).toBe("ok")
  })

  it("counts multi-byte input correctly against the hard byte cap", () => {
    expect(maximumQrInputBytes).toBe(4000)
    expect(qrInputBytes("héllo")).toBe(6)
    expect(isValidQrInputSize("a".repeat(maximumQrInputBytes))).toBe(true)
    expect(isValidQrInputSize("a".repeat(maximumQrInputBytes + 1))).toBe(false)
    // Four-byte code points reach the cap four times faster than the character count.
    expect(isValidQrInputSize("😀".repeat(maximumQrInputBytes / 4 + 1))).toBe(false)
  })

  it("rejects oversized input before consulting the library", () => {
    const result = createQrMatrix("a".repeat(maximumQrInputBytes + 1), "L")
    expect(result.status).toBe("over-limit")
  })

  it("rejects empty input as invalid", () => {
    const result = createQrMatrix("", "M")
    expect(result.status).toBe("invalid")
  })
})

describe("QR render planning", () => {
  it("uses whole-pixel modules and a spec quiet zone", () => {
    const small = createQrMatrix("HELLO WORLD", "M")
    if (small.status !== "ok") throw new Error("expected ok")
    const plan128 = planQrRender(small.matrix, 128)
    expect(plan128.quietZoneModules).toBe(qrQuietZoneModules)
    expect(plan128.totalModules).toBe(21 + 2 * qrQuietZoneModules)
    expect(plan128.modulePixels).toBe(Math.floor(128 / plan128.totalModules))
    expect(plan128.canvasPixels).toBe(plan128.modulePixels * plan128.totalModules)

    const plan512 = planQrRender(small.matrix, 512)
    expect(plan512.modulePixels).toBeGreaterThan(plan128.modulePixels)
    expect(plan512.canvasPixels).toBeLessThanOrEqual(512)
  })

  it("never scales below one pixel per module", () => {
    const result = createQrMatrix("a".repeat(2000), "L")
    if (result.status !== "ok") throw new Error("expected ok")
    // A large symbol at the smallest size still gets one whole pixel per module.
    const plan = planQrRender(result.matrix, 128)
    expect(plan.modulePixels).toBe(1)
    expect(plan.canvasPixels).toBe(plan.totalModules)
  })
})

describe("generated PNG bytes", () => {
  it("base64 encodes known vectors and round-trips binary data", () => {
    const encoder = new TextEncoder()
    expect(bytesToBase64(encoder.encode("hello"))).toBe("aGVsbG8=")
    expect(bytesToBase64(new Uint8Array([0, 1, 2, 250, 255]))).toBe("AAEC+v8=")

    const bytes = new Uint8Array(0x8000 + 17)
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = index % 256
    }
    const encoded = bytesToBase64(bytes)
    const decoded = atob(encoded)
    expect(decoded).toHaveLength(bytes.length)
    expect(decoded.charCodeAt(0)).toBe(0)
    expect(decoded.charCodeAt(0x8000 + 16)).toBe((0x8000 + 16) % 256)
  })
})
