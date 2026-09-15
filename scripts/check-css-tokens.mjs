// Undefined-token gate. Tailwind compiles `var(--missing)` literally, and an
// undefined custom property is invalid at computed-value time: the declaration
// falls back (inherited colour, transparent background, initial border), which
// silently drops the intended styling. That class of defect shipped twice
// already (the undefined `--accent` fixed in #204, and the four tokens fixed
// alongside this gate), and check-token-contrast.mjs cannot see it because it
// only reads tokens that are already declared.
//
// This gate resolves every custom-property reference under src/ against the
// declarations in the stylesheets. A reference with an explicit fallback is
// safe and is reported as INFO; a bare reference to an undeclared property is
// an ERROR and exits non-zero.
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const STYLE_SOURCES = ["src/styles.css"]
const SCAN_ROOT = "src"
const SCAN_EXTENSIONS = [".ts", ".tsx", ".css"]

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const files = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else files.push(path)
  }
  return files
}

// Declared custom properties. `@theme` and the `:root[...]` token blocks both
// use plain `--name:` declarations, so one pass covers the design system.
/** @type {Set<string>} */
const declared = new Set()
for (const file of STYLE_SOURCES) {
  for (const match of readFileSync(file, "utf8").matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) {
    if (match[1]) declared.add(match[1])
  }
}

/**
 * @typedef {{ file: string, line: number, name: string, fallback: boolean }} Reference
 */

/** @type {Reference[]} */
const references = []
for (const file of walk(SCAN_ROOT)) {
  if (!SCAN_EXTENSIONS.some((extension) => file.endsWith(extension))) continue
  const lines = readFileSync(file, "utf8").split("\n")
  lines.forEach((text, index) => {
    // var(--token) / var(--token, fallback)
    for (const match of text.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*(,)?/g)) {
      if (match[1]) {
        references.push({ file, line: index + 1, name: match[1], fallback: Boolean(match[2]) })
      }
    }
    // getPropertyValue("--token") reads used by canvas renderers.
    for (const match of text.matchAll(/getPropertyValue\(\s*["'`](--[a-zA-Z0-9-]+)["'`]/g)) {
      if (match[1]) {
        references.push({ file, line: index + 1, name: match[1], fallback: false })
      }
    }
  })
}

/** @type {Reference[]} */
const errors = []
/** @type {Reference[]} */
const safe = []
for (const reference of references) {
  if (declared.has(reference.name)) continue
  if (reference.fallback) safe.push(reference)
  else errors.push(reference)
}

/** @param {Reference} reference */
function describe(reference) {
  return `  ${reference.file}:${reference.line}  var(${reference.name})`
}

if (safe.length > 0) {
  console.log(`INFO: ${safe.length} reference(s) to undeclared tokens with a fallback:`)
  for (const reference of safe) console.log(describe(reference))
}

if (errors.length > 0) {
  console.error(`\nFAIL: ${errors.length} reference(s) to undeclared tokens without a fallback:`)
  for (const reference of errors) console.error(describe(reference))
  console.error(
    "\nDeclare each token in src/styles.css (both theme blocks) or give the reference a fallback.",
  )
  process.exit(1)
}

console.log(
  `\nAll ${references.length} custom-property reference(s) resolve (${declared.size} declared tokens).`,
)
