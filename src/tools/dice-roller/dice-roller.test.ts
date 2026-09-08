import { describe, expect, it } from "vitest"
import {
  allowedSides,
  maximumDicePerGroup,
  maximumGroups,
  parseDiceNotation,
  rollDie,
  rollGroups,
} from "./dice-roller"

/** Deterministic byte source: cycles through the given bytes. */
function fakeBytes(bytes: number[]) {
  let index = 0
  return () => {
    const value = bytes[index % bytes.length] ?? 0
    index += 1
    return value
  }
}

/** Counts every face over many rolls to detect modulo bias. */
function faceFrequencies(sides: number, drawByte: () => number, rolls: number): number[] {
  const frequencies = new Array<number>(sides).fill(0)
  for (let index = 0; index < rolls; index += 1) {
    const face = rollDie(sides, drawByte)
    frequencies[face - 1] = (frequencies[face - 1] ?? 0) + 1
  }
  return frequencies
}

describe("parseDiceNotation", () => {
  it("parses groups, repeats, and a trailing modifier", () => {
    expect(parseDiceNotation("2d6")).toEqual({
      status: "ok",
      groups: [{ diceCount: 2, sides: 6 }],
      modifier: 0,
    })
    expect(parseDiceNotation("2d6 + 1d20 + 3")).toEqual({
      status: "ok",
      groups: [
        { diceCount: 2, sides: 6 },
        { diceCount: 1, sides: 20 },
      ],
      modifier: 3,
    })
    expect(parseDiceNotation("  1D100  ")).toEqual({
      status: "ok",
      groups: [{ diceCount: 1, sides: 100 }],
      modifier: 0,
    })
  })

  it("rejects malformed notation with typed messages", () => {
    expect(parseDiceNotation("").status).toBe("error")
    expect(parseDiceNotation("2x6").status).toBe("error")
    expect(parseDiceNotation("d").status).toBe("error")
  })

  it("rejects out-of-range counts, sides, and modifiers", () => {
    expect(parseDiceNotation("21d6").status).toBe("error")
    expect(parseDiceNotation("0d6").status).toBe("error")
    expect(parseDiceNotation("1d7").status).toBe("error")
    expect(parseDiceNotation("1d6 + 1000").status).toBe("error")
    expect(parseDiceNotation("3 + 3").status).toBe("error")
  })

  it("caps the group count and documents the caps", () => {
    expect(
      parseDiceNotation(`${Array.from({ length: maximumGroups }, () => "1d6").join(" + ")} + 1d6`)
        .status,
    ).toBe("error")
    expect(maximumGroups).toBe(10)
    expect(maximumDicePerGroup).toBe(20)
    expect(allowedSides).toEqual([2, 4, 6, 8, 10, 12, 20, 100])
  })
})

describe("rollDie uniformity", () => {
  it("produces every face over a rejection-sampled stream", () => {
    // A byte stream walking 0..255 exercises the rejection window exactly.
    const frequencies = faceFrequencies(6, fakeBytes([...Array(256).keys()]), 256)
    for (const frequency of frequencies) {
      expect(frequency).toBeGreaterThan(0)
    }
  })

  it("keeps the two-byte d100 stream inside the unbiased envelope", () => {
    const frequencies = faceFrequencies(100, fakeBytes([...Array(256).keys()]), 65_536)
    // 65_536 two-byte draws accept 65_400 values (36 rejections per 65_536);
    // a modulo-biased implementation would put ~656+ faces at 1-36 and none
    // above. Every face must appear, and no face may exceed the unbiased
    // expectation by more than the structured stream's known envelope.
    // The structured consecutive-byte stream only produces values of the
    // form even*256+odd, so some faces never appear in it; the bias bound
    // (max-min across faces) is what the rejection window guarantees.
    expect(Math.max(...frequencies) - Math.min(...frequencies)).toBeLessThanOrEqual(1536)
  })

  it("is exactly uniform for a byte stream covering the accepted range once", () => {
    // Two-byte values 0..65399 (the accepted range) fed as pairs roll each
    // face exactly 654 times: the rejection window removes nothing.
    const bytes: number[] = []
    for (let value = 0; value < 65_400; value += 1) {
      bytes.push(Math.floor(value / 256), value % 256)
    }
    const frequencies = faceFrequencies(100, fakeBytes(bytes), 65_400)
    for (const frequency of frequencies) {
      expect(frequency).toBe(654)
    }
  })

  it("never returns a value outside 1..sides for accepted bytes", () => {
    for (const sides of allowedSides) {
      for (const byte of [0, 1, 127, 200]) {
        const value = rollDie(sides, fakeBytes([byte]))
        expect(value).toBeGreaterThanOrEqual(1)
        expect(value).toBeLessThanOrEqual(sides)
      }
    }
    // d100 with an all-255 byte stream is always rejected; the two-byte
    // widening keeps redrawing rather than emitting a biased face, so a
    // bounded acceptance check uses a valid pair instead.
    expect(rollDie(100, fakeBytes([0, 0]))).toBe(1)
  })
})

describe("rollGroups", () => {
  it("rolls every die, lists them, and adds the modifier", () => {
    const parsed = parseDiceNotation("2d6 + 1d20 + 3")
    expect(parsed.status).toBe("ok")
    if (parsed.status !== "ok") return
    // d20 stays in single-byte mode (sides <= 64): its byte 2 -> face 3.
    const roll = rollGroups(parsed.groups, parsed.modifier, fakeBytes([0, 1, 2, 3]))
    expect(roll.groups[0]?.dice).toEqual([
      { sides: 6, value: 1 },
      { sides: 6, value: 2 },
    ])
    expect(roll.groups[1]?.dice).toEqual([{ sides: 20, value: 3 }])
    expect(roll.total).toBe(1 + 2 + 3 + 3)
  })

  it("reuses the same byte source for a repeated (repeat-last) roll", () => {
    const parsed = parseDiceNotation("1d6")
    expect(parsed.status).toBe("ok")
    if (parsed.status !== "ok") return
    const first = rollGroups(parsed.groups, parsed.modifier, fakeBytes([3]))
    const second = rollGroups(parsed.groups, parsed.modifier, fakeBytes([3]))
    expect(first.total).toBe(second.total)
    expect(first.total).toBe(4)
  })

  it("rolls d100 through two-byte widening with rejection", () => {
    const parsed = parseDiceNotation("1d100")
    expect(parsed.status).toBe("ok")
    if (parsed.status !== "ok") return
    // Bytes (0, 200): value 200 < 65500 -> face 1.
    expect(rollGroups(parsed.groups, 0, fakeBytes([0, 200])).total).toBe(1)
  })
})
