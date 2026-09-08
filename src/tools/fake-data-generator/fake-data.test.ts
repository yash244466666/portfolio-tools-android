import { describe, expect, it } from "vitest"
import {
  clampFakeDataCount,
  fakeDataCountBounds,
  fakeEmail,
  fakeFullName,
  generateFakeData,
  type FakeDataEnvironment,
} from "./fake-data"

/** Steps through 0..255 cyclically so every pick index is reproducible. */
function steppingBytes(seed: number): FakeDataEnvironment {
  let counter = seed
  return {
    randomBytes: (length: number) =>
      Uint8Array.from({ length }, () => {
        counter = (counter + 37) % 256
        return counter
      }),
  }
}

describe("generators", () => {
  it("produces a first-last name from the datasets", () => {
    expect(fakeFullName(steppingBytes(0))).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
  })

  it("produces an email from one of the five formats", () => {
    const email = fakeEmail(steppingBytes(5))
    expect(email).toMatch(/^[a-z._0-9]+@[a-z.]+$/)
    expect(email.split("@")[1]).toBeTruthy()
  })

  it("produces a US-style phone number", () => {
    expect(generateFakeData("phone", 1, steppingBytes(9))[0]).toMatch(
      /^\([1-9]\d{2}\) \d{3}-\d{4}$/,
    )
  })

  it("produces a street address with state and five-digit zip", () => {
    expect(generateFakeData("address", 1, steppingBytes(3))[0]).toMatch(
      /^\d+ [A-Z][a-z]+ [A-Za-z]+, [A-Za-z ]+, [A-Z]{2} \d{5}$/,
    )
  })
})

describe("generateFakeData", () => {
  it("is deterministic for the same byte source", () => {
    expect(generateFakeData("company", 5, steppingBytes(1))).toEqual(
      generateFakeData("company", 5, steppingBytes(1)),
    )
  })

  it("returns one entry per requested item across every type", () => {
    for (const type of ["name", "email", "phone", "address", "company", "country"] as const) {
      const rows = generateFakeData(type, 4, steppingBytes(2))
      expect(rows).toHaveLength(4)
      for (const row of rows) expect(row).not.toBe("")
    }
  })

  it("clamps the count to the documented bounds", () => {
    expect(fakeDataCountBounds).toEqual({ minimum: 1, maximum: 50 })
    expect(generateFakeData("country", 0, steppingBytes(1))).toHaveLength(1)
    expect(generateFakeData("country", 999, steppingBytes(1))).toHaveLength(50)
  })
})

describe("clampFakeDataCount", () => {
  it("keeps integers inside the bounds", () => {
    expect(clampFakeDataCount("12")).toBe(12)
  })

  it("rejects non-integer and out-of-range input", () => {
    expect(clampFakeDataCount("")).toBe(1)
    expect(clampFakeDataCount("abc")).toBe(1)
    expect(clampFakeDataCount("2.5")).toBe(1)
    expect(clampFakeDataCount("-3")).toBe(1)
    expect(clampFakeDataCount("51")).toBe(50)
  })
})
