import { describe, expect, it } from "vitest"
import { analyzePassword, maximumPasswordChars } from "./password-strength"

describe("analyzePassword", () => {
  it("returns an empty analysis for an empty password", () => {
    const analysis = analyzePassword("")
    expect(analysis.length).toBe(0)
    expect(analysis.entropy).toBe(0)
    expect(analysis.band).toBe("very-weak")
    expect(analysis.crackTime).toBe("Instant")
    expect(analysis.checks.every((check) => !check.pass)).toBe(true)
  })

  it("scores a single lowercase character as very weak", () => {
    const analysis = analyzePassword("a")
    expect(analysis.band).toBe("very-weak")
    expect(analysis.entropy).toBe(Math.round(Math.log2(26)))
  })

  it("combines class pools additively", () => {
    // Lowercase (26) + uppercase (26) + digits (10) = 62.
    const analysis = analyzePassword("Ab12")
    expect(analysis.poolSize).toBe(62)
  })

  it("counts the symbol pool as 33 characters", () => {
    const analysis = analyzePassword("aaaaaaaaaa!")
    expect(analysis.poolSize).toBe(26 + 33)
    expect(analysis.checks.find((check) => check.id === "symbol")?.pass).toBe(true)
  })

  it("reaches the strong band only with high entropy", () => {
    // 22 lowercase characters: 22 * log2(26) ≈ 103.6 bits → very strong.
    expect(analyzePassword("abcdefghijklmnopqrstuv").band).toBe("very-strong")
    // 20 lowercase characters: ≈ 94.2 bits → strong.
    expect(analyzePassword("abcdefghijklmnopqrst").band).toBe("strong")
    // 14 lowercase characters: ≈ 65.9 bits → fair.
    expect(analyzePassword("abcdefghijklmn").band).toBe("fair")
    // 8 lowercase characters: ≈ 37.6 bits → weak.
    expect(analyzePassword("abcdefgh").band).toBe("weak")
  })

  it("adds the entropy bonus above 60 bits", () => {
    // 13 lowercase characters: 13 * log2(26) ≈ 61.1 bits → bonus applies.
    const withBonus = analyzePassword("abcdefghijklm")
    // 12 lowercase characters: ≈ 56.4 bits → no bonus.
    const withoutBonus = analyzePassword("abcdefghijkl")
    expect(withBonus.entropy).toBeGreaterThan(60)
    expect(withoutBonus.entropy).toBeLessThan(60)
  })

  it("saturates the score at 1", () => {
    const analysis = analyzePassword("Ab1!aaaaaaaaaaaaaaaaaaaa")
    expect(analysis.score).toBeLessThanOrEqual(1)
    expect(analysis.score).toBeCloseTo(1, 10)
  })

  it("reports length thresholds in the checks", () => {
    expect(analyzePassword("abc").checks.find((check) => check.id === "length8")?.pass).toBe(false)
    expect(analyzePassword("abcdefgh").checks.find((check) => check.id === "length8")?.pass).toBe(
      true,
    )
    expect(
      analyzePassword("abcdefghijkl").checks.find((check) => check.id === "length12")?.pass,
    ).toBe(true)
    expect(
      analyzePassword("abcdefghijklmnop").checks.find((check) => check.id === "length16")?.pass,
    ).toBe(true)
  })

  it("labels known crack-time bands", () => {
    expect(analyzePassword("short").crackTime).toBe("Less than a second")
    expect(analyzePassword("abcdefg").crackTime).toBe("A few seconds")
    expect(analyzePassword("abcdefgh").crackTime).toBe("Minutes to hours")
    expect(analyzePassword("abcdefghijklmn").crackTime).toBe("Days to months")
    expect(analyzePassword("abcdefghijklmnopqrst").crackTime).toBe("Years")
    expect(analyzePassword("a".repeat(22)).crackTime).toBe("Centuries+")
  })

  it("treats a 256-character password as within the documented bound", () => {
    expect(analyzePassword("a".repeat(maximumPasswordChars)).length).toBe(maximumPasswordChars)
    expect(analyzePassword("a".repeat(maximumPasswordChars + 1)).length).toBe(
      maximumPasswordChars + 1,
    )
  })
})
