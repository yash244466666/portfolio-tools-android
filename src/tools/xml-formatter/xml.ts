/**
 * Pure XML formatting helpers built on the standard DOMParser.
 *
 * Upstream echoed the browser's raw `parsererror` text into the UI; here
 * validation failures produce a fixed message because parser diagnostics can
 * echo user input. Upstream's minify also collapsed whitespace inside text
 * nodes, silently changing document content; this minify only collapses
 * whitespace between tags.
 */

export const maximumXmlLength = 50_000

export interface XmlResult {
  output: string
  message: string
}

interface Validation {
  ok: boolean
  message: string
}

export function validateXml(input: string): Validation {
  if (input.length > maximumXmlLength) {
    return {
      ok: false,
      message: `The XML is limited to ${maximumXmlLength.toLocaleString("en-US")} characters.`,
    }
  }
  if (input.trim() === "") {
    return { ok: false, message: "Enter some XML first." }
  }
  let document: Document
  try {
    document = new DOMParser().parseFromString(input, "text/xml")
  } catch {
    return { ok: false, message: "The XML is not well-formed." }
  }
  if (document.querySelector("parsererror") !== null) {
    return { ok: false, message: "The XML is not well-formed." }
  }
  return { ok: true, message: "Valid XML." }
}

function validate(input: string): XmlResult | null {
  const validation = validateXml(input)
  if (!validation.ok) return { output: "", message: validation.message }
  return null
}

const indentUnit = "  "

/**
 * Re-indents well-formed XML with two spaces per level. Declaration, comment,
 * doctype, and processing-instruction lines are laid out like elements; the
 * heuristic only ever adds or removes indentation, never content.
 */
export function formatXmlDocument(input: string): string {
  let formatted = ""
  let indent = 0
  const lines = input.replace(/></g, ">\n<").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === "") continue
    if (trimmed.startsWith("</")) {
      indent = Math.max(0, indent - 1)
    }
    formatted += indentUnit.repeat(indent) + trimmed + "\n"
    if (
      trimmed.startsWith("<") &&
      !trimmed.startsWith("</") &&
      !trimmed.startsWith("<?") &&
      !trimmed.startsWith("<!") &&
      !trimmed.endsWith("/>") &&
      !trimmed.includes("</")
    ) {
      indent += 1
    }
  }
  return formatted.trim()
}

export function formatXml(input: string): XmlResult {
  const rejected = validate(input)
  if (rejected !== null) return rejected
  return { output: formatXmlDocument(input), message: "" }
}

/**
 * Removes whitespace between tags and trims the document edges. Whitespace
 * inside text nodes is preserved exactly, so re-parsing the minified result
 * yields the same text content.
 */
export function minifyXml(input: string): XmlResult {
  const rejected = validate(input)
  if (rejected !== null) return rejected
  return { output: input.replace(/>\s+</g, "><").trim(), message: "" }
}
