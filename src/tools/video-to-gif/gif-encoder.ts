/**
 * Pure GIF89a encoder with a fixed 6x6x6 palette and hand-rolled LZW.
 *
 * Ported from the upstream portfolio's Video to GIF tool (portfolio-v2 commit
 * `61e54c64edbeffc9487239b6dae399e255c6a71d`,
 * `components/tools/media/video-to-gif.tsx`) and restructured for the Android
 * product's memory rules:
 *
 * - Bytes accumulate into one growable `Uint8Array` instead of upstream's
 *   per-element boxed `number[]`.
 * - Frames are quantized and LZW-encoded incrementally as they arrive, so raw
 *   RGBA pixel buffers are never retained between frames (upstream held every
 *   frame in memory until `encode()`).
 * - The per-frame delay honours the GIF minimum of 2 centiseconds (20 ms).
 * - Encoding zero frames is rejected: a frameless GIF is invalid.
 *
 * The GIF89a structure, the `r * 36 + g * 6 + b` palette indexing, the
 * Netscape looping extension, and the 4096-entry LZW dictionary reset keep
 * upstream's behavior and are covered against an independent parser/decoder.
 */

/** The GIF minimum frame delay in centiseconds; smaller delays clamp here. */
export const minimumDelayCentiseconds = 2

const codeLimit = 4096

/**
 * Maps an 8-bit RGB triple onto the fixed 6x6x6 color cube used for every
 * frame. Pure so tests can verify exact cube indices against the palette.
 */
export function paletteIndexFor(red: number, green: number, blue: number): number {
  return (
    Math.round((red * 5) / 255) * 36 +
    Math.round((green * 5) / 255) * 6 +
    Math.round((blue * 5) / 255)
  )
}

/** Growable byte sink backed by a single `Uint8Array` (never a boxed array). */
class ByteSink {
  private buffer: Uint8Array
  private written = 0

  constructor(initialCapacity = 1024) {
    this.buffer = new Uint8Array(initialCapacity)
  }

  get length(): number {
    return this.written
  }

  private ensureCapacity(additional: number): void {
    const required = this.written + additional
    if (required <= this.buffer.byteLength) return
    let capacity = this.buffer.byteLength
    while (capacity < required) capacity *= 2
    const grown = new Uint8Array(capacity)
    grown.set(this.buffer.subarray(0, this.written))
    this.buffer = grown
  }

  writeByte(value: number): void {
    this.ensureCapacity(1)
    this.buffer[this.written] = value & 0xff
    this.written += 1
  }

  writeBytes(bytes: Uint8Array): void {
    this.ensureCapacity(bytes.byteLength)
    this.buffer.set(bytes, this.written)
    this.written += bytes.byteLength
  }

  writeShort(value: number): void {
    this.writeByte(value & 0xff)
    this.writeByte((value >> 8) & 0xff)
  }

  writeString(value: string): void {
    this.ensureCapacity(value.length)
    for (let index = 0; index < value.length; index += 1) {
      this.buffer[this.written + index] = value.charCodeAt(index) & 0xff
    }
    this.written += value.length
  }

  toUint8Array(): Uint8Array<ArrayBuffer> {
    return this.buffer.slice(0, this.written)
  }
}

/** LSB-first bit writer over a `ByteSink`; the GIF bit-packing order. */
class BitWriter {
  private sink: ByteSink
  private bitBuffer = 0
  private bitCount = 0

  constructor(sink: ByteSink) {
    this.sink = sink
  }

  writeBits(value: number, size: number): void {
    this.bitBuffer |= value << this.bitCount
    this.bitCount += size
    while (this.bitCount >= 8) {
      this.sink.writeByte(this.bitBuffer & 0xff)
      this.bitBuffer >>= 8
      this.bitCount -= 8
    }
  }

  flushPartialByte(): void {
    if (this.bitCount > 0) {
      this.sink.writeByte(this.bitBuffer & 0xff)
      this.bitBuffer = 0
      this.bitCount = 0
    }
  }
}

/**
 * Incremental GIF encoder. Construct with the output dimensions, feed RGBA
 * frames in display order, then call `finish()` once to append the trailer.
 */
export class GifEncoder {
  private readonly sink: ByteSink
  private readonly width: number
  private readonly height: number
  private framesAdded = 0
  private finished = false

  constructor(width: number, height: number) {
    if (!Number.isSafeInteger(width) || width <= 0 || width > 0xffff) {
      throw new Error("GIF width must be a positive integer of at most 65535.")
    }
    if (!Number.isSafeInteger(height) || height <= 0 || height > 0xffff) {
      throw new Error("GIF height must be a positive integer of at most 65535.")
    }
    this.width = width
    this.height = height
    this.sink = new ByteSink(width * height + 1024)

    // Header and Logical Screen Descriptor: global color table present,
    // color resolution bits 0, table size 256 entries (2^7).
    this.sink.writeString("GIF89a")
    this.sink.writeShort(width)
    this.sink.writeShort(height)
    this.sink.writeByte(0x80 | 0x00 | 0x07)
    this.sink.writeByte(0) // background color index
    this.sink.writeByte(0) // pixel aspect ratio

    // Global color table: the fixed 6x6x6 cube in r-outer/g/b order, padded to
    // 256 entries with black.
    for (let red = 0; red < 6; red += 1) {
      for (let green = 0; green < 6; green += 1) {
        for (let blue = 0; blue < 6; blue += 1) {
          this.sink.writeByte(Math.round((red * 255) / 5))
          this.sink.writeByte(Math.round((green * 255) / 5))
          this.sink.writeByte(Math.round((blue * 255) / 5))
        }
      }
    }
    // Pad the table to the declared 256 entries. Upstream padded by only 20
    // entries (236 total), which shifted every later block by 60 bytes and
    // produced structurally invalid GIFs; the port writes the full 40.
    for (let index = 0; index < 40; index += 1) {
      this.sink.writeByte(0)
      this.sink.writeByte(0)
      this.sink.writeByte(0)
    }

    // Netscape looping extension: loop forever.
    this.sink.writeByte(0x21)
    this.sink.writeByte(0xff)
    this.sink.writeByte(0x0b)
    this.sink.writeString("NETSCAPE2.0")
    this.sink.writeByte(3)
    this.sink.writeByte(1)
    this.sink.writeShort(0)
    this.sink.writeByte(0)
  }

  /** Number of frames encoded so far. */
  get frameCount(): number {
    return this.framesAdded
  }

  /** Bytes written so far, including any finished trailer. */
  get byteLength(): number {
    return this.sink.length
  }

  /**
   * Quantizes and LZW-encodes one RGBA frame immediately. The pixel buffer is
   * not retained: only compressed bytes are appended.
   */
  addFrame(rgba: Uint8Array | Uint8ClampedArray, delayMs: number): void {
    if (this.finished) {
      throw new Error("The GIF has already been finished.")
    }
    const pixelCount = this.width * this.height
    if (rgba.byteLength !== pixelCount * 4) {
      throw new Error(
        `Frame pixel data must be exactly ${pixelCount * 4} RGBA bytes for a ${this.width}x${this.height} frame.`,
      )
    }

    const indices = new Uint8Array(pixelCount)
    for (let index = 0; index < pixelCount; index += 1) {
      indices[index] = paletteIndexFor(
        rgba[index * 4] ?? 0,
        rgba[index * 4 + 1] ?? 0,
        rgba[index * 4 + 2] ?? 0,
      )
    }

    // Graphic Control Extension: disposal "do not dispose", delay clamped to
    // the GIF minimum of 2 centiseconds, no transparency.
    const delayCentiseconds = Math.max(minimumDelayCentiseconds, Math.round(delayMs / 10))
    this.sink.writeByte(0x21)
    this.sink.writeByte(0xf9)
    this.sink.writeByte(4)
    this.sink.writeByte(0x08)
    this.sink.writeShort(delayCentiseconds)
    this.sink.writeByte(0)
    this.sink.writeByte(0)

    // Image descriptor: full frame, no local color table.
    this.sink.writeByte(0x2c)
    this.sink.writeShort(0)
    this.sink.writeShort(0)
    this.sink.writeShort(this.width)
    this.sink.writeShort(this.height)
    this.sink.writeByte(0)

    this.sink.writeByte(8)
    this.lzwEncode(indices)
    this.sink.writeByte(0) // block terminator for the image data
    this.framesAdded += 1
  }

  /**
   * Appends the trailer and returns the finished GIF bytes. Throws when no
   * frame was added, because a frameless GIF is not a valid image.
   */
  finish(): Uint8Array<ArrayBuffer> {
    if (this.framesAdded === 0) {
      throw new Error("A GIF requires at least one frame.")
    }
    if (this.finished) {
      throw new Error("The GIF has already been finished.")
    }
    this.finished = true
    this.sink.writeByte(0x3b)
    return this.sink.toUint8Array()
  }

  /**
   * LZW encoder (minimum code size 8). Emits the clear code, builds the
   * dictionary up to the 4096 code limit, resets it when full, and writes the
   * compressed bytes as GIF data sub-blocks of at most 255 bytes.
   *
   * The dictionary is the classic integer-keyed scheme (omggif-style): the
   * key is `(prefixCode << 8) | pixelIndex` in a fixed `Int32Array` with open
   * addressing, replacing upstream's string-concatenation keys for a large
   * speedup. The emitted bitstream is identical to the ported reference
   * algorithm, which the parser/decoder oracle tests pin.
   */
  private lzwEncode(indices: Uint8Array): void {
    const minCodeSize = 8
    const clearCode = 1 << minCodeSize
    const eoiCode = clearCode + 1
    let codeSize = minCodeSize + 1
    let nextCode = eoiCode + 1

    // Open-addressing table sized so the 4096-entry dictionary stays under
    // 25% load; -1 marks an empty slot.
    const tableCapacity = 1 << 14
    const tableMask = tableCapacity - 1
    const tableKeys = new Int32Array(tableCapacity).fill(-1)
    const tableValues = new Int32Array(tableCapacity)
    const clearTable = () => {
      tableKeys.fill(-1)
    }
    const findSlot = (key: number): number => {
      let slot = Math.imul(key, 0x9e3779b1) >>> (32 - 14)
      while (tableKeys[slot] !== -1 && tableKeys[slot] !== key) {
        slot = (slot + 1) & tableMask
      }
      return slot
    }

    // One frame's compressed bytes; released as soon as the sub-blocks land.
    const compressed = new ByteSink(Math.max(64, indices.byteLength))
    const writer = new BitWriter(compressed)
    writer.writeBits(clearCode, codeSize)

    // The pending string is tracked as the code it was assigned; root
    // pixels are their own codes (0..255).
    let current = indices[0] ?? 0
    for (let index = 1; index < indices.length; index += 1) {
      const character = indices[index] ?? 0
      const key = (current << 8) | character
      const slot = findSlot(key)
      if (tableKeys[slot] === key) {
        current = tableValues[slot] ?? 0
      } else {
        writer.writeBits(current, codeSize)
        if (nextCode < codeLimit) {
          tableKeys[slot] = key
          tableValues[slot] = nextCode
          nextCode += 1
          if (nextCode > 1 << codeSize && codeSize < 12) {
            codeSize += 1
          }
        } else {
          // Dictionary full: emit a clear code and start over.
          writer.writeBits(clearCode, codeSize)
          clearTable()
          nextCode = eoiCode + 1
          codeSize = minCodeSize + 1
        }
        current = character
      }
    }

    writer.writeBits(current, codeSize)
    writer.writeBits(eoiCode, codeSize)
    writer.flushPartialByte()

    // Sub-block the compressed bytes at 255 bytes each.
    const bytes = compressed.toUint8Array()
    let offset = 0
    while (offset < bytes.byteLength) {
      const blockSize = Math.min(255, bytes.byteLength - offset)
      this.sink.writeByte(blockSize)
      this.sink.writeBytes(bytes.subarray(offset, offset + blockSize))
      offset += blockSize
    }
  }
}
