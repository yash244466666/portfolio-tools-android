/**
 * Pure SVG minification built on conservative, content-preserving rules.
 *
 * Two deliberate departures from upstream: input is validated with the
 * standard XML parser first (upstream accepted anything and produced garbage
 * output), and minification only ever removes comments and whitespace between
 * tags. Upstream collapsed every whitespace run and stripped spaces around
 * `=` and `;`, which silently rewrites text nodes such as <text>a = b</text>.
 * Pretty-printing reuses the shared XML indentation heuristic, which also
 * only ever adds or removes indentation.
 */

import { formatXmlDocument } from "@/tools/xml-formatter/xml"

export const maximumSvgLength = 50_000

export interface SvgResult {
  output: string
  message: string
}

interface Validation {
  ok: boolean
  message: string
}

export function validateSvg(input: string): Validation {
  if (input.length > maximumSvgLength) {
    return {
      ok: false,
      message: `The SVG is limited to ${maximumSvgLength.toLocaleString("en-US")} characters.`,
    }
  }
  if (input.trim() === "") {
    return { ok: false, message: "Paste an SVG first." }
  }
  let document: Document
  try {
    document = new DOMParser().parseFromString(input, "image/svg+xml")
  } catch {
    return { ok: false, message: "The SVG is not well-formed XML." }
  }
  if (document.querySelector("parsererror") !== null) {
    return { ok: false, message: "The SVG is not well-formed XML." }
  }
  if (document.documentElement === null || document.querySelector("svg") === null) {
    return { ok: false, message: "The pasted markup does not contain an <svg> element." }
  }
  return { ok: true, message: "Valid SVG." }
}

/**
 * Removes comments and collapses whitespace between tags, trimming the
 * document edges. Whitespace inside text nodes and attribute values is
 * preserved exactly.
 */
export function minifySvgDocument(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .trim()
}

function rejected(input: string): SvgResult | null {
  const validation = validateSvg(input)
  if (!validation.ok) return { output: "", message: validation.message }
  return null
}

export function minifySvg(input: string): SvgResult {
  const rejectedResult = rejected(input)
  if (rejectedResult !== null) return rejectedResult
  return { output: minifySvgDocument(input), message: "" }
}

export function prettyPrintSvg(input: string): SvgResult {
  const rejectedResult = rejected(input)
  if (rejectedResult !== null) return rejectedResult
  return { output: formatXmlDocument(minifySvgDocument(input)), message: "" }
}

/** Byte size measured over UTF-8, formatted in bytes or kilobytes. */
export function formatSvgBytes(text: string): string {
  const bytes = new TextEncoder().encode(text).length
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** Whole-percent size reduction of the minified output, floored at zero. */
export function svgSavingsPercent(original: string, minified: string): number {
  const before = new TextEncoder().encode(original).length
  const after = new TextEncoder().encode(minified).length
  if (before === 0) return 0
  return Math.max(0, Math.round((1 - after / before) * 100))
}