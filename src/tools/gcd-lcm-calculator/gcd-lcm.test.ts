import { gcdList, gcdSteps, lcmList, parseIntegerList } from "./gcd-lcm"

describe("parseIntegerList", () => {
  it("accepts comma-separated signed integers", () => {
    expect(parseIntegerList("48, 18, 12")).toEqual({
      ok: true,
      values: [48n, 18n, 12n],
    })
    expect(parseIntegerList("-5,10")).toEqual({ ok: true, values: [-5n, 10n] })
  })

  it("rejects entries the upstream silently dropped", () => {
    const outcome = parseIntegerList("48, abc, 18")
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toMatch(/Entry 2/)
    expect(parseIntegerList("48").ok).toBe(false)
    expect(parseIntegerList("").ok).toBe(false)
    expect(parseIntegerList("1.5, 2").ok).toBe(false)
  })

  it("rejects oversized lists and digits", () => {
    expect(parseIntegerList("1,2,3,4,5,6,7,8,9,10,11,12,13").ok).toBe(false)
    expect(parseIntegerList(`1,${"9".repeat(16)}`).ok).toBe(false)
    expect(parseIntegerList("a".repeat(401)).ok).toBe(false)
  })
})

describe("gcdList", () => {
  it("matches known GCD vectors", () => {
    expect(gcdList([48n, 18n])).toBe(6n)
    expect(gcdList([48n, 18n, 12n])).toBe(6n)
    expect(gcdList([17n, 5n])).toBe(1n)
    expect(gcdList([-12n, 18n])).toBe(6n)
    expect(gcdList([0n, 0n])).toBe(0n)
    expect(gcdList([0n, 7n])).toBe(7n)
  })

  it("stays exact beyond the 2^53 Number range", () => {
    const big = 9007199254740993n // 2^53 + 1, silently wrong as a Number
    expect(gcdList([big * 3n, big * 5n])).toBe(big)
  })
})

describe("lcmList", () => {
  it("matches known LCM vectors", () => {
    expect(lcmList([4n, 6n])).toBe(12n)
    expect(lcmList([48n, 18n, 12n])).toBe(144n)
    expect(lcmList([-4n, 6n])).toBe(12n)
    expect(lcmList([0n, 5n])).toBe(0n)
  })

  it("avoids the upstream a*b overflow with exact BigInt arithmetic", () => {
    const large = 3037000499n // sqrt(2^63), product overflows a Number
    expect(lcmList([large, large + 2n])).toBe(large * (large + 2n))
  })
})

describe("gcdSteps", () => {
  it("records each Euclidean reduction and the final result", () => {
    expect(gcdSteps(48n, 18n)).toEqual([
      "gcd(48, 18) = gcd(18, 48 mod 18) = gcd(18, 12)",
      "gcd(18, 12) = gcd(12, 18 mod 12) = gcd(12, 6)",
      "gcd(12, 6) = gcd(6, 12 mod 6) = gcd(6, 0)",
      "gcd = 6",
    ])
  })

  it("handles a zero second value", () => {
    expect(gcdSteps(7n, 0n)).toEqual(["gcd = 7"])
  })
})
