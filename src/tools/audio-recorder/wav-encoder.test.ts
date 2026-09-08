import { describe, expect, it } from "vitest"
import { downmixToMono, encodeWav } from "./wav-encoder"

/** Independent oracle: parse the RIFF/WAVE header back field by field. */
function parseWav(bytes: Uint8Array) {
  const byte = (offset: number) => bytes[offset] ?? 0
  const text = (offset: number, length: number) =>
    Array.from(bytes.slice(offset, offset + length), (b) => String.fromCharCode(b)).join("")
  const u32 = (offset: number) =>
    byte(offset) + (byte(offset + 1) << 8) + (byte(offset + 2) << 16) + (byte(offset + 3) << 24)
  const u16 = (offset: number) => byte(offset) + (byte(offset + 1) << 8)
  return {
    riff: text(0, 4),
    fileSize: u32(4),
    wave: text(8, 4),
    fmtId: text(12, 4),
    fmtSize: u32(16),
    audioFormat: u16(20),
    channels: u16(22),
    sampleRate: u32(24),
    byteRate: u32(28),
    blockAlign: u16(32),
    bitsPerSample: u16(34),
    dataId: text(36, 4),
    dataBytes: u32(40),
    samples: bytes.length - 44,
  }
}

describe("WAV encoder", () => {
  it("emits a standards-compliant 16-bit mono PCM header", () => {
    const wav = encodeWav(new Float32Array(3), 44100)
    const parsed = parseWav(wav)
    expect(parsed.riff).toBe("RIFF")
    expect(parsed.wave).toBe("WAVE")
    expect(parsed.fmtId).toBe("fmt ")
    expect(parsed.fmtSize).toBe(16)
    expect(parsed.audioFormat).toBe(1) // PCM
    expect(parsed.channels).toBe(1)
    expect(parsed.sampleRate).toBe(44100)
    expect(parsed.byteRate).toBe(88200)
    expect(parsed.blockAlign).toBe(2)
    expect(parsed.bitsPerSample).toBe(16)
    expect(parsed.dataId).toBe("data")
    expect(parsed.dataBytes).toBe(6)
    expect(wav.byteLength).toBe(50)
    expect(parsed.fileSize).toBe(wav.byteLength - 8)
  })

  it("encodes known sample values with symmetric clamp behavior", () => {
    const wav = encodeWav(new Float32Array([0, 1, -1, 0.5, -0.5]), 44100)
    const asInt = (i: number) => {
      const low = wav[44 + i * 2] ?? 0
      const high = wav[45 + i * 2] ?? 0
      const value = low + high * 256
      return value >= 0x8000 ? value - 0x10000 : value
    }
    expect(asInt(0)).toBe(0)
    expect(asInt(1)).toBe(32767)
    expect(asInt(2)).toBe(-32767)
    expect(asInt(3)).toBeCloseTo(16384, -1)
    expect(asInt(4)).toBeCloseTo(-16384, -1)
    // Out-of-range input clamps instead of wrapping.
    const clamped = encodeWav(new Float32Array([2, -2]), 8000)
    const c0 = (clamped[44] ?? 0) + (clamped[45] ?? 0) * 256
    const c1 = (clamped[46] ?? 0) + (clamped[47] ?? 0) * 256
    expect(c0).toBe(32767)
    expect(c1 >= 0x8000 ? c1 - 0x10000 : c1).toBeLessThanOrEqual(-32767)
  })

  it("handles an empty take without corrupting the header", () => {
    const wav = encodeWav(new Float32Array(0), 44100)
    expect(wav.byteLength).toBe(44)
    expect(parseWav(wav).dataBytes).toBe(0)
  })

  it("downmixes stereo to mono by averaging", () => {
    const fakeBuffer = {
      numberOfChannels: 2,
      length: 2,
      getChannelData: (channel: number) =>
        channel === 0 ? Float32Array.from([1, -1]) : Float32Array.from([0, 1]),
    } as unknown as AudioBuffer
    const mono = downmixToMono(fakeBuffer)
    expect(mono.length).toBe(2)
    expect(mono[0]).toBeCloseTo(0.5)
    expect(mono[1]).toBeCloseTo(0)
  })
})
