import { describe, expect, it } from "vitest"
import { GifEncoder, paletteIndexFor } from "./gif-encoder"

/**
 * Independent oracle: these tests parse the produced bytes back with a
 * hand-written GIF89a structural parser and a reference LZW decoder that share
 * no code with the encoder. The encoder's own quantization is never trusted.
 */

interface ParsedFrame {
  delayCentiseconds: number
  /** Decoded palette indices for every pixel, top-left first. */
  indices: Uint8Array
  width: number
  height: number
}

interface ParsedGif {
  header: string
  width: number
  height: number
  globalColorTableEntries: number
  backgroundIndex: number
  loopsForever: boolean
  netscapeExtensionPresent: boolean
  frames: ParsedFrame[]
  trailerPresent: boolean
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function readShort(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8)
}

/** Reference GIF LZW decoder (minimum code size is a parameter). */
function lzwDecode(minCodeSize: number, data: Uint8Array): Uint8Array {
  const clearCode = 1 << minCodeSize
  const eoiCode = clearCode + 1
  const maximumTableSize = 4096
  let codeSize = minCodeSize + 1
  let dictionary: number[][] = []
  const resetDictionary = () => {
    dictionary = []
    for (let code = 0; code < clearCode; code += 1) dictionary.push([code])
    dictionary.push([]) // clear code placeholder
    dictionary.push([]) // end-of-information placeholder
  }
  resetDictionary()

  let bitPosition = 0
  const readCode = (): number => {
    let code = 0
    for (let bit = 0; bit < codeSize; bit += 1) {
      const byteIndex = bitPosition >> 3
      if (byteIndex >= data.length) throw new Error("LZW data ended before EOI")
      code |= (((data[byteIndex] ?? 0) >> (bitPosition & 7)) & 1) << bit
      bitPosition += 1
    }
    return code
  }

  const output: number[] = []
  let previous: number[] | null = null
  for (;;) {
    const code = readCode()
    if (code === clearCode) {
      resetDictionary()
      codeSize = minCodeSize + 1
      previous = null
      continue
    }
    if (code === eoiCode) break
    let entry: number[]
    if (code < dictionary.length) {
      entry = dictionary[code] ?? []
    } else if (previous) {
      // KwKwK: the code refers to the entry being defined.
      entry = [...previous, previous[0] ?? 0]
    } else {
      throw new Error(`Invalid LZW code ${code} at the start of a stream`)
    }
    for (const value of entry) output.push(value)
    if (previous && dictionary.length < maximumTableSize) {
      dictionary.push([...previous, entry[0] ?? 0])
      if (dictionary.length >= 1 << codeSize && codeSize < 12) codeSize += 1
    }
    previous = entry
  }
  return new Uint8Array(output)
}

function parseGif(bytes: Uint8Array): ParsedGif {
  const header = String.fromCharCode(...bytes.subarray(0, 6))
  if (header !== "GIF89a") throw new Error(`Unexpected header ${header}`)
  const parsed: ParsedGif = {
    header,
    width: readShort(bytes, 6),
    height: readShort(bytes, 8),
    globalColorTableEntries: 0,
    backgroundIndex: bytes[11] ?? 0,
    loopsForever: false,
    netscapeExtensionPresent: false,
    frames: [],
    trailerPresent: false,
  }
  const packed = bytes[10] ?? 0
  if ((packed & 0x80) !== 0) {
    parsed.globalColorTableEntries = 2 ** ((packed & 0x07) + 1)
  }
  let offset = 13
  offset += parsed.globalColorTableEntries * 3
  let pendingDelay = 0

  while (offset < bytes.length) {
    const intro = bytes[offset]
    if (intro === 0x3b) {
      parsed.trailerPresent = true
      offset += 1
      break
    }
    if (intro === 0x21) {
      const label = bytes[offset + 1]
      offset += 2
      if (label === 0xf9) {
        const blockSize = bytes[offset] ?? 0
        const blockBytes = bytes.subarray(offset + 1, offset + 1 + blockSize)
        pendingDelay = readShort(blockBytes, 1)
        offset += 1 + blockSize
        if (bytes[offset] !== 0) throw new Error("Missing GCE block terminator")
        offset += 1
        continue
      }
      // Application extension: read the identifier and sub-blocks.
      const identifierSize = bytes[offset] ?? 0
      const identifier = String.fromCharCode(
        ...bytes.subarray(offset + 1, offset + 1 + identifierSize),
      )
      offset += 1 + identifierSize
      if (identifier === "NETSCAPE2.0") {
        parsed.netscapeExtensionPresent = true
        const subBlockSize = bytes[offset] ?? 0
        const subBlock = bytes.subarray(offset + 1, offset + 1 + subBlockSize)
        if (subBlock[0] === 1) parsed.loopsForever = readShort(subBlock, 1) === 0
        offset += 1 + subBlockSize
      } else {
        while ((bytes[offset] ?? 0) !== 0) offset += (bytes[offset] ?? 0) + 1
      }
      if (bytes[offset] !== 0) throw new Error("Missing extension block terminator")
      offset += 1
      continue
    }
    if (intro === 0x2c) {
      const frameOffset = offset
      const framePacked = bytes[frameOffset + 9] ?? 0
      let cursor = frameOffset + 10
      if ((framePacked & 0x80) !== 0) {
        cursor += 2 ** ((framePacked & 0x07) + 1) * 3
      }
      const minCodeSize = bytes[cursor] ?? 0
      cursor += 1
      const compressed: number[] = []
      while ((bytes[cursor] ?? 0) !== 0) {
        const blockSize = bytes[cursor] ?? 0
        for (let index = 0; index < blockSize; index += 1) {
          compressed.push(bytes[cursor + 1 + index] ?? 0)
        }
        cursor += 1 + blockSize
      }
      cursor += 1
      parsed.frames.push({
        delayCentiseconds: pendingDelay,
        width: readShort(bytes, frameOffset + 5),
        height: readShort(bytes, frameOffset + 7),
        indices: lzwDecode(minCodeSize, new Uint8Array(compressed)),
      })
      pendingDelay = 0
      offset = cursor
      continue
    }
    throw new Error(`Unknown block introducer 0x${(intro ?? 0).toString(16)} at ${offset}`)
  }
  if (!parsed.trailerPresent) throw new Error("Missing GIF trailer")
  if (offset !== bytes.length) throw new Error("Trailing bytes after the GIF trailer")
  return parsed
}

function rgbaFrame(
  width: number,
  height: number,
  pixel: (index: number) => [number, number, number, number],
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (let index = 0; index < width * height; index += 1) {
    const [red, green, blue, alpha] = pixel(index)
    rgba[index * 4] = red
    rgba[index * 4 + 1] = green
    rgba[index * 4 + 2] = blue
    rgba[index * 4 + 3] = alpha
  }
  return rgba
}

describe("GifEncoder structure", () => {
  it("emits a GIF89a header, screen size, 256-entry color table, and looping extension", () => {
    const encoder = new GifEncoder(4, 3)
    encoder.addFrame(
      rgbaFrame(4, 3, () => [255, 0, 0, 255]),
      100,
    )
    const bytes = encoder.finish()

    const parsed = parseGif(bytes)
    expect(parsed.header).toBe("GIF89a")
    expect(parsed.width).toBe(4)
    expect(parsed.height).toBe(3)
    expect(parsed.globalColorTableEntries).toBe(256)
    expect(parsed.netscapeExtensionPresent).toBe(true)
    expect(parsed.loopsForever).toBe(true)
    expect(parsed.frames).toHaveLength(1)
    expect(parsed.trailerPresent).toBe(true)
  })

  it("encodes solid colors to the exact 6x6x6 cube index", () => {
    const cases: Array<[number, number, number, number]> = [
      [255, 0, 0, 180],
      [0, 255, 0, 30],
      [0, 0, 255, 5],
      [0, 0, 0, 0],
      [255, 255, 255, 215],
      [51, 102, 153, 51],
      [60, 60, 60, 43],
    ]
    for (const [red, green, blue, expectedIndex] of cases) {
      expect(paletteIndexFor(red, green, blue)).toBe(expectedIndex)
      const encoder = new GifEncoder(2, 2)
      encoder.addFrame(
        rgbaFrame(2, 2, () => [red, green, blue, 255]),
        100,
      )
      const bytes = encoder.finish()
      const parsed = parseGif(bytes)
      expect(parsed.frames[0]?.indices).toEqual(
        new Uint8Array([expectedIndex, expectedIndex, expectedIndex, expectedIndex]),
      )
    }
  })

  it("clamps the frame delay to the GIF minimum of 2 centiseconds", () => {
    const encoder = new GifEncoder(2, 2)
    encoder.addFrame(
      rgbaFrame(2, 2, () => [0, 0, 0, 255]),
      5,
    )
    encoder.addFrame(
      rgbaFrame(2, 2, () => [0, 0, 0, 255]),
      100,
    )
    encoder.addFrame(
      rgbaFrame(2, 2, () => [0, 0, 0, 255]),
      250,
    )
    const bytes = encoder.finish()
    const parsed = parseGif(bytes)
    expect(parsed.frames.map((frame) => frame.delayCentiseconds)).toEqual([2, 10, 25])
  })

  it("rejects finishing with zero frames and wrong-sized pixel buffers", () => {
    const encoder = new GifEncoder(2, 2)
    expect(() => encoder.finish()).toThrow(/at least one frame/i)
    encoder.addFrame(
      rgbaFrame(2, 2, () => [0, 0, 0, 255]),
      100,
    )
    expect(() => encoder.addFrame(new Uint8Array(3), 100)).toThrow(/RGBA bytes/)
  })
})

describe("GifEncoder known vector", () => {
  it("produces the exact documented byte sequence for a 2x2 solid red frame", () => {
    const encoder = new GifEncoder(2, 2)
    encoder.addFrame(
      rgbaFrame(2, 2, () => [255, 0, 0, 255]),
      100,
    )
    const bytes = encoder.finish()

    // The global color table is stated independently here: 256 entries in
    // r-outer, g, b order from the 6-level cube, padded with black.
    let colorTable = ""
    for (let red = 0; red < 6; red += 1) {
      for (let green = 0; green < 6; green += 1) {
        for (let blue = 0; blue < 6; blue += 1) {
          colorTable += toHex(
            new Uint8Array([
              Math.round((red * 255) / 5),
              Math.round((green * 255) / 5),
              Math.round((blue * 255) / 5),
            ]),
          )
        }
      }
    }
    colorTable += "00".repeat(120)

    const expected =
      "474946383961" + // "GIF89a"
      "0200" + // 2x2 screen
      "0200" +
      "87" + // GCT flag with 256 entries
      "00" + // background index
      "00" + // pixel aspect ratio
      colorTable +
      "21ff0b" + // application extension
      "4e4554534341504532" + // "NETSCAPE2"
      "2e30" + // ".0"
      "0301" + // sub-block size 3, loop id 1
      "000000" + // loop forever + terminator
      "21f904" + // graphic control extension
      "08" + // disposal
      "0a00" + // delay 10 centiseconds
      "0000" + // transparent index + terminator
      "2c" + // image descriptor
      "0000000002000200" + // full-frame descriptor, no local table
      "00" +
      "08" + // LZW minimum code size
      "06" + // one 6-byte sub-block
      "006909a41510" + // codes 256, 180, 258, 180, 257 (9-bit, LSB first)
      "00" + // data terminator
      "3b" // trailer
    expect(toHex(bytes)).toBe(expected)
  })
})

describe("GifEncoder LZW dictionary reset", () => {
  it("round-trips a high-entropy frame through the 4096-code reset", () => {
    // Deterministic pseudo-random pixels guarantee long, non-repeating code
    // sequences that drive the dictionary past the 4096 limit.
    const width = 200
    const height = 100
    let seed = 0x2b6d4f1
    const rgba = new Uint8Array(width * height * 4)
    const expectedIndices = new Uint8Array(width * height)
    for (let index = 0; index < width * height; index += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const red = (seed >>> 16) & 0xff
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const green = (seed >>> 16) & 0xff
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const blue = (seed >>> 16) & 0xff
      rgba[index * 4] = red
      rgba[index * 4 + 1] = green
      rgba[index * 4 + 2] = blue
      rgba[index * 4 + 3] = 255
      expectedIndices[index] = paletteIndexFor(red, green, blue)
    }

    const encoder = new GifEncoder(width, height)
    encoder.addFrame(rgba, 100)
    encoder.addFrame(rgba, 100)
    const bytes = encoder.finish()
    const parsed = parseGif(bytes)
    expect(parsed.frames).toHaveLength(2)
    for (const frame of parsed.frames) {
      expect(frame.width).toBe(width)
      expect(frame.height).toBe(height)
      expect(frame.indices).toEqual(expectedIndices)
    }
  })
})
