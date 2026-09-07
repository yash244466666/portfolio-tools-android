import { describe, expect, it } from "vitest"
import { analyzePassword } from "@/tools/password-strength-checker/password-strength"
import {
  buildCharacterSet,
  clampPasswordLength,
  generatePassword,
  maximumPasswordLength,
  minimumPasswordLength,
  passwordCharacterSets,
} from "./password-generator"

/** Deterministic byte source cycling through a fixed sequence. */
function sequenceBytes(values: number[]): (length: number) => Uint8Array {
  let index = 0
  return (length) => {
    const bytes = new Uint8Array(length)
    for (let offset = 0; offset < length; offset += 1) {
      bytes[offset] = values[index % values.length] ?? 0
      index += 1
    }
    return bytes
  }
}

describe("buildCharacterSet", () => {
  it("joins selected sets in definition order", () => {
    expect(buildCharacterSet(["numbers", "lowercase"])).toBe("abcdefghijklmnopqrstuvwxyz0123456789")
    expect(buildCharacterSet([])).toBe("")
    expect(buildCharacterSet(["symbols"])).toBe(passwordCharacterSets[3].characters)
  })
})

describe("clampPasswordLength", () => {
  it("clamps into the supported range", () => {
    expect(clampPasswordLength(0)).toBe(minimumPasswordLength)
    expect(clampPasswordLength(4)).toBe(4)
    expect(clampPasswordLength(128)).toBe(128)
    expect(clampPasswordLength(999)).toBe(maximumPasswordLength)
    expect(clampPasswordLength(Number.NaN)).toBe(minimumPasswordLength)
    expect(clampPasswordLength(17.9)).toBe(17)
  })
})

describe("generatePassword", () => {
  it("throws an explicit error when no set is selected", () => {
    expect(() => generatePassword({ length: 16, sets: [] }, sequenceBytes([0]))).toThrow(
      "Select at least one character set.",
    )
  })

  it("produces the requested length using only selected characters", () => {
    const password = generatePassword(
      { length: 64, sets: ["lowercase", "uppercase", "numbers"] },
      () => globalThis.crypto.getRandomValues(new Uint8Array(1)),
    )
    expect(password).toHaveLength(64)
    expect(password).toMatch(/^[A-Za-z0-9]+$/)
  })

  it("rejection-samples so the first character is uniform over the pool", () => {
    // Byte 250 >= threshold(248) for a 26-char pool, so it must be discarded;
    // the next byte 5 maps to index 5 instead of the biased 250 % 26 = 16.
    // Lengths below 4 clamp to the minimum, so this yields "ffff".
    const password = generatePassword({ length: 1, sets: ["lowercase"] }, sequenceBytes([250, 5]))
    expect(password).toBe("ffff")
  })

  it("handles the smallest pool (numbers) with uniform mapping", () => {
    const password = generatePassword({ length: 2, sets: ["numbers"] }, sequenceBytes([3]))
    expect(password).toBe("3333")
  })

  it("generates distinct passwords across a large sample", () => {
    const seen = new Set<string>()
    for (let index = 0; index < 100; index += 1) {
      seen.add(
        generatePassword(
          { length: 24, sets: ["lowercase", "uppercase", "numbers", "symbols"] },
          () => globalThis.crypto.getRandomValues(new Uint8Array(1)),
        ),
      )
    }
    expect(seen.size).toBeGreaterThan(90)
  })
})

describe("strength reuse", () => {
  it("analyzes generated passwords with the shared strength model", () => {
    const analysis = analyzePassword("Xy9!Xy9!Xy9!Xy9!")
    expect(analysis.bandLabel).toBe("Very Strong")
    expect(analysis.entropy).toBeGreaterThan(100)
  })
})
