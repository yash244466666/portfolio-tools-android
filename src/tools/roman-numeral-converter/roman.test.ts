import { convertRoman, fromRoman, parseArabic, romanInputError, toRoman } from "./roman"

describe("parseArabic", () => {
  it("accepts whole integers only, unlike the upstream parseInt", () => {
    expect(parseArabic("42")).toBe(42)
    expect(parseArabic(" 7 ")).toBe(7)
    expect(parseArabic("-3")).toBe(-3)
    expect(parseArabic("42abc")).toBeNull()
    expect(parseArabic("4.5")).toBeNull()
    expect(parseArabic("")).toBeNull()
    expect(parseArabic("9007199254740993")).toBeNull()
  })
})

describe("toRoman", () => {
  it("matches standard vectors", () => {
    expect(toRoman(1)).toBe("I")
    expect(toRoman(4)).toBe("IV")
    expect(toRoman(9)).toBe("IX")
    expect(toRoman(14)).toBe("XIV")
    expect(toRoman(42)).toBe("XLII")
    expect(toRoman(1994)).toBe("MCMXCIV")
    expect(toRoman(3999)).toBe("MMMCMXCIX")
  })

  it("rejects out-of-range and non-integer values", () => {
    expect(toRoman(0)).toBeNull()
    expect(toRoman(-1)).toBeNull()
    expect(toRoman(4000)).toBeNull()
    expect(toRoman(3.5)).toBeNull()
  })
})

describe("fromRoman", () => {
  it("matches standard vectors case-insensitively", () => {
    expect(fromRoman("XLII")).toBe(42)
    expect(fromRoman("mcmxciv")).toBe(1994)
    expect(fromRoman(" MMMCMXCIX ")).toBe(3999)
  })

  it("rejects malformed numerals including non-canonical forms", () => {
    expect(fromRoman("IIII")).toBeNull()
    expect(fromRoman("IC")).toBeNull()
    expect(fromRoman("VX")).toBeNull()
    expect(fromRoman("ABC")).toBeNull()
    expect(fromRoman("")).toBeNull()
  })
})

describe("convertRoman", () => {
  it("round-trips through both directions", () => {
    const forward = convertRoman("1994", "to-roman")
    expect(forward?.roman).toBe("MCMXCIV")
    expect(forward?.direction).toBe("Arabic to Roman")
    const backward = convertRoman("MCMXCIV", "to-arabic")
    expect(backward?.arabic).toBe(1994)
    expect(backward?.direction).toBe("Roman to Arabic")
  })

  it("returns null for invalid input in either direction", () => {
    expect(convertRoman("0", "to-roman")).toBeNull()
    expect(convertRoman("4000", "to-roman")).toBeNull()
    expect(convertRoman("IIII", "to-arabic")).toBeNull()
    expect(convertRoman("", "to-roman")).toBeNull()
  })
})

describe("romanInputError", () => {
  it("explains out-of-range and malformed input without echoing it", () => {
    expect(romanInputError("", "to-roman")).toBeNull()
    expect(romanInputError("42", "to-roman")).toBeNull()
    expect(romanInputError("4.5", "to-roman")).toMatch(/whole number/)
    expect(romanInputError("4000", "to-roman")).toMatch(/1 to 3999/)
    expect(romanInputError("XLII", "to-arabic")).toBeNull()
    expect(romanInputError("IIII", "to-arabic")).toMatch(/valid Roman numeral/)
  })
})
