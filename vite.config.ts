import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import type { Plugin } from "vite"
import { defineConfig } from "vitest/config"

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

/*
 * The bundled pdf.js worker uses `Promise.try`, `Uint8Array` hex/base64
 * methods, and the `Map.getOrInsert` upsert methods (all Chromium ~2025 and
 * later), which the Android system WebView may lack; without them the worker
 * dies before its handshake or the render path fails. Prepend the same
 * polyfills that the application entry installs on the main thread to the
 * emitted worker asset.
 */
const workerPolyfillSource = `if (typeof Map.prototype.getOrInsert !== "function") {
  Object.defineProperty(Map.prototype, "getOrInsert", {
    value: function (key, defaultValue) {
      if (this.has(key)) return this.get(key)
      this.set(key, defaultValue)
      return defaultValue
    },
    writable: true,
    configurable: true,
  })
}
if (typeof Map.prototype.getOrInsertComputed !== "function") {
  Object.defineProperty(Map.prototype, "getOrInsertComputed", {
    value: function (key, callbackfn) {
      if (this.has(key)) return this.get(key)
      var value = callbackfn(key)
      this.set(key, value)
      return value
    },
    writable: true,
    configurable: true,
  })
}
if (typeof WeakMap.prototype.getOrInsert !== "function") {
  Object.defineProperty(WeakMap.prototype, "getOrInsert", {
    value: function (key, defaultValue) {
      if (this.has(key)) return this.get(key)
      this.set(key, defaultValue)
      return defaultValue
    },
    writable: true,
    configurable: true,
  })
}
if (typeof WeakMap.prototype.getOrInsertComputed !== "function") {
  Object.defineProperty(WeakMap.prototype, "getOrInsertComputed", {
    value: function (key, callbackfn) {
      if (this.has(key)) return this.get(key)
      var value = callbackfn(key)
      this.set(key, value)
      return value
    },
    writable: true,
    configurable: true,
  })
}
if (typeof Promise.try !== "function") {
  Object.defineProperty(Promise, "try", {
    value: function (callback) {
      var rest = Array.prototype.slice.call(arguments, 1)
      return new Promise(function (resolve) {
        resolve(callback.apply(undefined, rest))
      })
    },
    writable: true,
    configurable: true,
  })
}
if (typeof Uint8Array.prototype.toHex !== "function") {
  Object.defineProperty(Uint8Array.prototype, "toHex", {
    value: function () {
      var alphabet = "0123456789abcdef"
      var out = ""
      for (var i = 0; i < this.length; i += 1) {
        out += alphabet[this[i] >> 4] + alphabet[this[i] & 15]
      }
      return out
    },
    writable: true,
    configurable: true,
  })
}
if (typeof Uint8Array.prototype.toBase64 !== "function") {
  Object.defineProperty(Uint8Array.prototype, "toBase64", {
    value: function () {
      var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
      var out = ""
      var i = 0
      for (; i + 2 < this.length; i += 3) {
        var value = (this[i] << 16) | (this[i + 1] << 8) | this[i + 2]
        out += alphabet[value >> 18] + alphabet[(value >> 12) & 63] + alphabet[(value >> 6) & 63] + alphabet[value & 63]
      }
      if (this.length - i === 1) {
        out += alphabet[this[i] >> 2] + alphabet[(this[i] & 3) << 4] + "=="
      } else if (this.length - i === 2) {
        var value2 = (this[i] << 16) | (this[i + 1] << 8)
        out += alphabet[value2 >> 18] + alphabet[(value2 >> 12) & 63] + alphabet[(value2 >> 6) & 63] + "="
      }
      return out
    },
    writable: true,
    configurable: true,
  })
}
if (typeof Uint8Array.fromBase64 !== "function") {
  Uint8Array.fromBase64 = function (input) {
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    var urlAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    var whitespace = " \\t\\n\\r\\f"
    var values = []
    var buffer = 0
    var bits = 0
    for (var i = 0; i < input.length; i += 1) {
      var character = input[i]
      if (whitespace.indexOf(character) >= 0) continue
      if (character === "=") {
        if (bits < 12) throw new SyntaxError("Unexpected padding in base64 input")
        break
      }
      var value = alphabet.indexOf(character)
      if (value < 0) value = urlAlphabet.indexOf(character)
      if (value < 0) throw new SyntaxError("Invalid base64 character")
      buffer = (buffer << 6) | value
      bits += 6
      if (bits >= 8) {
        bits -= 8
        values.push((buffer >> bits) & 255)
      }
    }
    return Uint8Array.from(values)
  }
}
`

function pdfWorkerPolyfill(): Plugin {
  return {
    name: "prepend-pdf-worker-webview-polyfills",
    generateBundle(_options, bundle) {
      for (const value of Object.values(bundle)) {
        if (value.type !== "asset") continue
        if (typeof value.fileName !== "string" || !value.fileName.includes("pdf.worker")) continue
        if (
          Buffer.from(value.source.slice(0, 40) ?? "")
            .toString("utf8")
            .includes("getOrInsert")
        )
          continue
        if (typeof value.source === "string") {
          value.source = workerPolyfillSource + value.source
        } else {
          value.source = Buffer.concat([
            Buffer.from(workerPolyfillSource, "utf8"),
            Buffer.from(value.source),
          ])
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), pdfWorkerPolyfill()],
  resolve: {
    alias: {
      "@": path.resolve(rootDirectory, "src"),
    },
  },
  build: {
    target: "es2022",
    /*
     * Sourcemaps were emitted unconditionally, so the release AAB shipped 123
     * `.map` files — 7.02 of 10.44 MiB of the bundled web payload, and the
     * original source of every tool to every device. Nothing consumes them:
     * the app has no crash reporter or symbolication step, and a dependency
     * change or an unreviewed default should not silently decide this.
     *
     * The shipped artifact must stay lean, so maps are off by default. Set
     * VITE_SOURCEMAP=1 to build with them when debugging the *packaged*
     * WebView over chrome://inspect; `pnpm dev` is unaffected either way.
     */
    sourcemap: process.env.VITE_SOURCEMAP === "1",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: true,
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/test/**"],
    },
  },
})
