import { describe, expect, it } from "vitest"
import { caesarDecode, caesarShift, clampCaesarShift } from "./caesar"

describe("caesarShift", () => {
  it("matches published Caesar vectors", () => {
    expect(caesarShift("HELLO", 3)).toBe("KHOOR")
    expect(caesarShift("Defend the east wall", 1)).toBe("Efgfoe uif fbtu xbmm")
    expect(caesarShift("The Quick Brown Fox", 13)).toBe("Gur Dhvpx Oebja Sbk")
    expect(caesarShift("Z", 1)).toBe("A")
    expect(caesarShift("z", 1)).toBe("a")
  })

  it("is self-inverse at ROT13", () => {
    const text = "Attack at Dawn!"
    expect(caesarShift(caesarShift(text, 13), 13)).toBe(text)
  })

  it("leaves non-letters unchanged", () => {
    expect(caesarShift("abc XYZ 1234 !? .,", 5)).toBe("fgh CDE 1234 !? .,")
  })

  it("wraps shifts modulo 26", () => {
    expect(caesarShift("A", 26)).toBe("A")
    expect(caesarShift("A", 27)).toBe("B")
  })
})

describe("caesarDecode", () => {
  it("inverts the encode shift", () => {
    expect(caesarDecode("KHOOR", 3)).toBe("HELLO")
    expect(caesarDecode(caesarShift("Round trip", 7), 7)).toBe("Round trip")
  })
})

describe("clampCaesarShift", () => {
  it("clamps into the 1-25 range", () => {
    expect(clampCaesarShift(0)).toBe(1)
    expect(clampCaesarShift(13)).toBe(13)
    expect(clampCaesarShift(26)).toBe(25)
    expect(clampCaesarShift(Number.NaN)).toBe(13)
  })
})
