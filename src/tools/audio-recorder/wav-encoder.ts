/**
 * Pure 16-bit mono PCM WAV encoder (RFC 3362-style RIFF/WAVE layout).
 *
 * Independent-oracle vectors in the test suite parse the produced bytes back
 * with a hand-rolled header parser and fixed PCM expectations, so the encoder
 * is verified against the file-format standard rather than against itself.
 */

function writeAscii(bytes: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    bytes[offset + i] = text.charCodeAt(i)
  }
}

function writeUint32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
  bytes[offset + 2] = (value >>> 16) & 0xff
  bytes[offset + 3] = (value >>> 24) & 0xff
}

function writeUint16(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
}

/** Encodes mono Float32 PCM (−1..1) into a complete 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const payloadBytes = samples.length * 2
  const bytes = new Uint8Array(44 + payloadBytes)

  writeAscii(bytes, 0, "RIFF")
  writeUint32(bytes, 4, 36 + payloadBytes)
  writeAscii(bytes, 8, "WAVE")
  writeAscii(bytes, 12, "fmt ")
  writeUint32(bytes, 16, 16) // PCM fmt chunk size
  writeUint16(bytes, 20, 1) // PCM format
  writeUint16(bytes, 22, 1) // mono
  writeUint32(bytes, 24, sampleRate)
  writeUint32(bytes, 28, sampleRate * 2) // byte rate: rate * channels * 2
  writeUint16(bytes, 32, 2) // block align
  writeUint16(bytes, 34, 16) // bits per sample
  writeAscii(bytes, 36, "data")
  writeUint32(bytes, 40, payloadBytes)

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0))
    const value = Math.round(clamped * 32767)
    bytes[44 + i * 2] = value & 0xff
    bytes[45 + i * 2] = (value >>> 8) & 0xff
  }
  return bytes
}

/** Downmixes a decoded AudioBuffer to mono Float32 for WAV encoding. */
export function downmixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0).slice()
  }
  const mono = new Float32Array(length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / buffer.numberOfChannels
    }
  }
  return mono
}
