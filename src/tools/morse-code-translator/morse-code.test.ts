import { describe, expect, it } from "vitest"
import {
  getMorseDirection,
  letterToMorse,
  morseToLetter,
  morseToText,
  textToMorse,
  unsupportedMorseCharacters,
  unsupportedMorseGroups,
} from "./morse-code"

describe("morse dataset integrity", () => {
  it("is a bijective letter/code mapping", () => {
    expect(Object.keys(letterToMorse).length).toBe(54)
    const codes = new Set(Object.values(letterToMorse))
    expect(codes.size).toBe(Object.keys(letterToMorse).length)
    for (const [letter, code] of Object.entries(letterToMorse)) {
      expect(morseToLetter[code]).toBe(letter)
    }
  })

  it("matches published ITU vectors", () => {
    expect(letterToMorse.S).toBe("...")
    expect(letterToMorse.O).toBe("---")
    expect(letterToMorse.A).toBe(".-")
    expect(morseToLetter["-..."]).toBe("B")
    expect(morseToLetter["-----"]).toBe("0")
    expect(morseToLetter[".--.-."]).toBe("@")
  })

  it("keeps only ., -, and space-free codes", () => {
    for (const code of Object.values(letterToMorse)) {
      expect(code).toMatch(/^[.-]+$/)
    }
  })
})

describe("textToMorse", () => {
  it("matches published word vectors", () => {
    expect(textToMorse("SOS")).toBe("... --- ...")
    expect(textToMorse("Hello World")).toBe(".... . .-.. .-.. --- / .-- --- .-. .-.. -..")
    expect(textToMorse("2026")).toBe("..--- ----- ..--- -....")
  })

  it("discloses unsupported characters instead of dropping silently", () => {
    expect(unsupportedMorseCharacters("Hi #")).toEqual(["#"])
    expect(textToMorse("Hi #")).toBe(".... .. /")
    expect(unsupportedMorseCharacters("ok")).toEqual([])
  })
})

describe("morseToText", () => {
  it("round-trips the encode direction", () => {
    for (const sample of ["Hello World", "SOS", "2026", "A B C"]) {
      // Encoding uppercases the text (Morse has no case).
      expect(morseToText(textToMorse(sample))).toBe(sample.toUpperCase())
    }
  })

  it("discloses unsupported code groups", () => {
    expect(unsupportedMorseGroups(".- .....-...")).toEqual([".....-..."])
    expect(morseToText(".- .....-...")).toBe("A")
  })
})

describe("getMorseDirection", () => {
  it("falls back to text-to-morse", () => {
    expect(getMorseDirection("morse-text")).toBe("morse-text")
    expect(getMorseDirection("other")).toBe("text-morse")
  })
})
