/*
 * Verifies that every built pdf.js worker asset in `dist/` begins with the
 * WebView compatibility polyfills. pdf.js 6 uses `Promise.try` and
 * `Uint8Array.prototype.toHex` (both Chromium ~128+); the Vite plugin in
 * `vite.config.ts` prepends those polyfills to the emitted worker asset so
 * the Android system WebView cannot fail the worker handshake or the
 * document-load phase. This check keeps a regression in that plugin from
 * reaching a packaged artifact silently, because desktop-browser E2E runs on
 * a Chromium that already has these methods and would not notice their
 * absence.
 */
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const distAssets = path.resolve("dist", "assets")
const prefix = "if (typeof Map.prototype.getOrInsert"
const requiredMarkers = [
  "Uint8Array.prototype.toHex",
  "Uint8Array.prototype.toBase64",
  "Uint8Array.fromBase64",
  "Map.prototype.getOrInsert",
  "Map.prototype.getOrInsertComputed",
]

let workerCount = 0
let failures = 0

for (const entry of readdirSync(distAssets)) {
  if (!entry.includes("pdf.worker")) continue
  workerCount += 1
  const source = readFileSync(path.join(distAssets, entry))
  const firstBytes = source.subarray(0, prefix.length)
  if (firstBytes.toString("utf8") !== prefix) {
    failures += 1
    console.error(`FAIL: dist/assets/${entry} does not start with the WebView polyfill block.`)
    continue
  }
  const head = source.subarray(0, 8192).toString("utf8")
  const missing = requiredMarkers.filter((marker) => !head.includes(marker))
  if (missing.length > 0) {
    failures += 1
    console.error(`FAIL: dist/assets/${entry} polyfill block is missing: ${missing.join(", ")}.`)
  } else {
    console.log(`OK: dist/assets/${entry} starts with the WebView polyfill block.`)
  }
}

if (workerCount === 0) {
  console.error("FAIL: no pdf.worker asset found under dist/assets — run pnpm build first.")
  process.exit(1)
}

if (failures > 0) {
  process.exit(1)
}
