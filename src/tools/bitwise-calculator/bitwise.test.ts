import { describe, expect, it } from "vitest"
import {
  bitwiseOperations,
  computeBitwiseResult,
  getBitwiseOperation,
  maximumBitwiseValue,
  minimumBitwiseValue,
  parseBitwiseValue,
  toBinaryBits,
  toHex32,
} from "./bitwise"

describe("parseBitwiseValue", () => {
  it("accepts signed decimal integers within the 32-bit range", () => {
    expect(parseBitwiseValue("255")).toBe(255)
    expect(parseBitwiseValue(" 7 ")).toBe(7)
    expect(parseBitwiseValue("+5")).toBe(5)
    expect(parseBitwiseValue("-1")).toBe(-1)
    expect(parseBitwiseValue("-2147483648")).toBe(minimumBitwiseValue)
    expect(parseBitwiseValue("2147483647")).toBe(maximumBitwiseValue)
  })

  it("rejects malformed text instead of silently coercing to zero", () => {
    expect(parseBitwiseValue("")).toBeNull()
    expect(parseBitwiseValue("12.5")).toBeNull()
    expect(parseBitwiseValue("abc")).toBeNull()
    expect(parseBitwiseValue("12abc")).toBeNull()
    expect(parseBitwiseValue("0x0f")).toBeNull()
  })

  it("rejects values outside the signed 32-bit range", () => {
    expect(parseBitwiseValue("2147483648")).toBeNull()
    expect(parseBitwiseValue("-2147483649")).toBeNull()
    expect(parseBitwiseValue("99999999999")).toBeNull()
  })
})

describe("computeBitwiseResult", () => {
  it("computes the binary operations", () => {
    expect(computeBitwiseResult("AND", 255, 15)).toBe(15)
    expect(computeBitwiseResult("OR", 240, 15)).toBe(255)
    expect(computeBitwiseResult("XOR", 240, 15)).toBe(255)
  })

  it("computes NOT as signed two's complement negation", () => {
    expect(computeBitwiseResult("NOT", 5, 0)).toBe(-6)
    expect(computeBitwiseResult("NOT", 0, 0)).toBe(-1)
  })

  it("computes shifts with JavaScript masking and sign-preserving right shift", () => {
    expect(computeBitwiseResult("LSHIFT", 1, 31)).toBe(-2147483648)
    expect(computeBitwiseResult("LSHIFT", 1, 33)).toBe(2)
    expect(computeBitwiseResult("RSHIFT", -8, 1)).toBe(-4)
    expect(computeBitwiseResult("RSHIFT", 16, 2)).toBe(4)
  })
})

describe("toBinaryBits", () => {
  it("pads to the requested width", () => {
    expect(toBinaryBits(5, 8)).toBe("00000101")
    expect(toBinaryBits(255, 16)).toBe("0000000011111111")
  })

  it("shows the two's complement pattern for negative values", () => {
    expect(toBinaryBits(-1, 8)).toBe("11111111")
    expect(toBinaryBits(-1, 32)).toBe("11111111111111111111111111111111")
  })

  it("truncates from the left when the pattern is longer than the width", () => {
    expect(toBinaryBits(300, 8)).toBe("00101100")
  })
})

describe("toHex32", () => {
  it("formats uppercase two's complement hexadecimal", () => {
    expect(toHex32(255)).toBe("0xFF")
    expect(toHex32(-1)).toBe("0xFFFFFFFF")
    expect(toHex32(0)).toBe("0x0")
    expect(toHex32(305419896)).toBe("0x12345678")
  })
})

describe("operation catalog", () => {
  it("contains the six upstream operations with NOT flagged unary", () => {
    expect(bitwiseOperations.map((operation) => operation.id)).toEqual([
      "AND",
      "OR",
      "XOR",
      "NOT",
      "LSHIFT",
      "RSHIFT",
    ])
    expect(bitwiseOperations.filter((operation) => operation.unary)).toEqual([
      expect.objectContaining({ id: "NOT" }),
    ])
  })

  it("throws on an unknown operation id", () => {
    expect(() => getBitwiseOperation("NOOP")).toThrow(RangeError)
  })
})
