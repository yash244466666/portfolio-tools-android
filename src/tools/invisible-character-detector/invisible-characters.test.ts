import { describe, expect, it } from "vitest"
import {
  detectInvisibleCharacters,
  invisibleCharacterDefinitions,
  removeInvisibleCharacters,
} from "./invisible-characters"

describe("invisibleCharacterDefinitions", () => {
  it("keeps each definition distinct and code-point accurate", () => {
    expect(invisibleCharacterDefinitions).toHaveLength(20)
    const seen = new Set<string>()
    for (const definition of invisibleCharacterDefinitions) {
      expect(definition.pattern.test(definition.char)).toBe(true)
      expect(definition.code.startsWith("U+")).toBe(true)
      seen.add(definition.code)
      expect(definition.pattern.global).toBe(true)
    }
    expect(seen.size).toBe(invisibleCharacterDefinitions.length)
  })
})

describe("detectInvisibleCharacters", () => {
  it("counts zero-width characters in mixed text", () => {
    const detection = detectInvisibleCharacters("a​b‍c")
    expect(detection.found).toEqual([
      { name: "Zero-Width Space", char: "​", code: "U+200B", count: 1 },
      { name: "Zero-Width Joiner", char: "‍", code: "U+200D", count: 1 },
    ])
    expect(detection.totalInvisible).toBe(2)
    expect(detection.totalChars).toBe(5)
  })

  it("counts unusual spaces and replacement characters", () => {
    const detection = detectInvisibleCharacters("a\u00A0b\uFFFDb\u202Fc")
    const codes = detection.found.map((found) => found.code)
    expect(codes).toContain("U+00A0")
    expect(codes).toContain("U+FFFD")
    expect(codes).toContain("U+202F")
    expect(detection.totalInvisible).toBe(3)
  })

  it("reports nothing for clean text", () => {
    const detection = detectInvisibleCharacters("plain text")
    expect(detection.found).toEqual([])
    expect(detection.totalInvisible).toBe(0)
  })
})

describe("removeInvisibleCharacters", () => {
  it("strips exactly the detected characters", () => {
    expect(removeInvisibleCharacters("a​b c")).toBe("ab c")
    expect(removeInvisibleCharacters("x﻿y­z")).toBe("xyz")
  })

  it("leaves ordinary whitespace and letters untouched", () => {
    expect(removeInvisibleCharacters("keep  normal text\nintact")).toBe("keep  normal text\nintact")
  })

  it("round-trips: removal always empties the detection", () => {
    const input = "a​b‍c﻿d­e f g"
    const cleaned = removeInvisibleCharacters(input)
    expect(detectInvisibleCharacters(cleaned).totalInvisible).toBe(0)
  })
})
