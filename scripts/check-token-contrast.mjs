// WCAG 2.2 contrast gate for the semantic token pairs declared in
// src/styles.css. Parses the light/dark token blocks and asserts the pairs
// the design system promises: normal text >= 4.5:1, secondary text on
// interactive surfaces >= 4.5:1, tertiary microcopy >= 3:1 (tertiary text is
// used only for large-ish meta/chip roles), and the focus ring >= 3:1 against
// the surfaces it sits on. Exits non-zero when any pair regresses.
import { readFileSync } from "node:fs"

/** @typedef {Record<string, string>} TokenMap */
/** @typedef {[string, string, string, number]} ContrastPair */

const css = readFileSync("src/styles.css", "utf8")

/**
 * @param {string} selector
 * @returns {TokenMap}
 */
function block(selector) {
  const match = new RegExp(`${selector} \\{([^}]*)\\}`, "s").exec(css)
  const body = match?.[1]
  if (!body) throw new Error(`Token block not found: ${selector}`)
  /** @type {TokenMap} */
  const tokens = {}
  for (const entry of body.matchAll(/(--[a-z-]+):\s*(#[0-9a-fA-F]{3,8})/g)) {
    const name = entry[1]
    const value = entry[2]
    if (name && value) tokens[name] = value.toLowerCase()
  }
  return tokens
}

const light = block(':root,\n:root\\[data-theme="light"\\]')
const dark = block(':root\\[data-theme="dark"\\]')

/**
 * @param {string} hex
 * @returns {number}
 */
function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4),
  )
  const red = linear[0] ?? 0
  const green = linear[1] ?? 0
  const blue = linear[2] ?? 0
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/**
 * @param {string} foreground
 * @param {string} background
 * @returns {number}
 */
function contrast(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * @param {TokenMap} tokens
 * @param {string} name
 * @returns {string}
 */
function token(tokens, name) {
  const value = tokens[name]
  if (!value) throw new Error(`Token missing from styles.css: ${name}`)
  return value
}

/** @param {TokenMap} tokens @returns {ContrastPair[]} */
const pairsFor = (tokens) => [
  ["body text", token(tokens, "--text"), token(tokens, "--background"), 4.5],
  ["panel text", token(tokens, "--text"), token(tokens, "--surface-raised"), 4.5],
  ["muted-surface text", token(tokens, "--text"), token(tokens, "--surface-muted"), 4.5],
  [
    "secondary on background",
    token(tokens, "--text-secondary"),
    token(tokens, "--background"),
    4.5,
  ],
  [
    "secondary on raised surface",
    token(tokens, "--text-secondary"),
    token(tokens, "--surface-raised"),
    4.5,
  ],
  [
    "secondary on muted surface",
    token(tokens, "--text-secondary"),
    token(tokens, "--surface-muted"),
    4.5,
  ],
  ["tertiary on card surface", token(tokens, "--text-tertiary"), token(tokens, "--surface"), 3],
  ["primary action text", token(tokens, "--on-primary"), token(tokens, "--primary"), 4.5],
  ["primary on card surface", token(tokens, "--primary"), token(tokens, "--surface"), 3],
  ["focus ring on background", token(tokens, "--focus"), token(tokens, "--background"), 3],
  ["focus ring on raised surface", token(tokens, "--focus"), token(tokens, "--surface-raised"), 3],
  ["danger text on background", token(tokens, "--danger-text"), token(tokens, "--background"), 4.5],
  [
    "danger text on raised surface",
    token(tokens, "--danger-text"),
    token(tokens, "--surface-raised"),
    4.5,
  ],
  [
    "success text on background",
    token(tokens, "--success-text"),
    token(tokens, "--background"),
    4.5,
  ],
  [
    "success text on raised surface",
    token(tokens, "--success-text"),
    token(tokens, "--surface-raised"),
    4.5,
  ],
  ["on-danger text", "#ffffff", token(tokens, "--danger"), 4.5],
]

/** @type {[string, TokenMap][]} */
const themes = [
  ["light", light],
  ["dark", dark],
]

let failures = 0
for (const [theme, tokens] of themes) {
  for (const [name, foreground, background, minimum] of pairsFor(tokens)) {
    const ratio = contrast(foreground, background)
    const pass = ratio >= minimum
    if (!pass) failures += 1
    console.log(
      `${pass ? "PASS" : "FAIL"} ${theme} ${name}: ${ratio.toFixed(2)}:1 (needs ${minimum}:1)`,
    )
  }
}

if (failures > 0) {
  console.error(`\n${failures} token pair(s) below the WCAG threshold`)
  process.exit(1)
}
console.log("\nAll token pairs meet their WCAG 2.2 thresholds in both themes.")
