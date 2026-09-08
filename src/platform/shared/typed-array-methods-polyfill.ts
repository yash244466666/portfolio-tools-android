/*
 * Polyfills for the ES2025 typed-array encoding methods that pdf.js 6 uses:
 * `Uint8Array.prototype.toHex` (document fingerprints in the worker),
 * `Uint8Array.prototype.toBase64` (font data URIs on the main thread), and
 * `Uint8Array.fromBase64`. These ship in Chromium ~128+; the Android system
 * WebView on older tracks (for example Chromium 124) lacks them, so a pdf.js
 * document load rejects with `toHex is not a function`. Install at
 * application entry and prepend to the bundled pdf.js worker asset in
 * `vite.config.ts`.
 *
 * Only the exact forms pdf.js uses are implemented: `toBase64()` and
 * `fromBase64(string)` without options, standard/base64url alphabets.
 */
declare global {
  interface Uint8Array {
    toHex(): string
    toBase64(): string
  }
  interface Uint8ArrayConstructor {
    fromBase64(input: string): Uint8Array
  }
}

const HEX_ALPHABET = "0123456789abcdef"
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
const BASE64_WHITESPACE = " \t\n\r\f"

if (typeof Uint8Array.prototype.toHex !== "function") {
  Object.defineProperty(Uint8Array.prototype, "toHex", {
    value: function toHex(this: Uint8Array): string {
      let out = ""
      for (let index = 0; index < this.length; index += 1) {
        const byte = this[index]!
        out += HEX_ALPHABET[byte >> 4]! + HEX_ALPHABET[byte & 0xf]!
      }
      return out
    },
    writable: true,
    configurable: true,
  })
}

if (typeof Uint8Array.prototype.toBase64 !== "function") {
  Object.defineProperty(Uint8Array.prototype, "toBase64", {
    value: function toBase64(this: Uint8Array): string {
      let out = ""
      let index = 0
      for (; index + 2 < this.length; index += 3) {
        const value = (this[index]! << 16) | (this[index + 1]! << 8) | this[index + 2]!
        out +=
          BASE64_ALPHABET[value >> 18]! +
          BASE64_ALPHABET[(value >> 12) & 63]! +
          BASE64_ALPHABET[(value >> 6) & 63]! +
          BASE64_ALPHABET[value & 63]!
      }
      const remaining = this.length - index
      if (remaining === 1) {
        const value = this[index]! << 16
        out += BASE64_ALPHABET[value >> 18]! + BASE64_ALPHABET[(value >> 12) & 63]! + "=="
      } else if (remaining === 2) {
        const value = (this[index]! << 16) | (this[index + 1]! << 8)
        out +=
          BASE64_ALPHABET[value >> 18]! +
          BASE64_ALPHABET[(value >> 12) & 63]! +
          BASE64_ALPHABET[(value >> 6) & 63]! +
          "="
      }
      return out
    },
    writable: true,
    configurable: true,
  })
}

if (typeof Uint8Array.fromBase64 !== "function") {
  // Accepts the standard and base64url alphabets, ASCII whitespace between
  // characters, and a final chunk with omitted padding. Invalid characters
  // or insufficient bits before padding reject, matching the native
  // method's behavior for the inputs pdf.js feeds it.
  Uint8Array.fromBase64 = function fromBase64(input: string): Uint8Array {
    const values: number[] = []
    let buffer = 0
    let bits = 0
    for (let index = 0; index < input.length; index += 1) {
      const character = input[index] as string
      if (BASE64_WHITESPACE.includes(character)) continue
      if (character === "=") {
        // A final chunk of 2 characters pads with "==" (4 bits pending) and
        // a final chunk of 3 characters pads with "=" (2 bits pending).
        if (bits !== 4 && bits !== 2) throw new SyntaxError("Unexpected padding in base64 input")
        break
      }
      let value = BASE64_ALPHABET.indexOf(character)
      if (value < 0) value = BASE64URL_ALPHABET.indexOf(character)
      if (value < 0) throw new SyntaxError("Invalid base64 character")
      buffer = (buffer << 6) | value
      bits += 6
      if (bits >= 8) {
        bits -= 8
        values.push((buffer >> bits) & 0xff)
      }
    }
    return Uint8Array.from(values)
  }
}

export {}
