/**
 * Pure JSON validation, formatting, and inspection logic for the JSON Editor tool.
 *
 * All operations are bounded: input size, tree rendering, and expansion are capped, and
 * every failure mode is a typed result so hostile input can never crash or freeze the
 * editor. `JSON.parse` never executes code, so untrusted documents are data only.
 */

/** Input bound, matching the other large-text tools. */
export const maximumJsonBytes = 256 * 1024

/** Expand-all is refused beyond this many tree nodes; the tree stays user-driven. */
export const maximumExpandAllNodes = 2000

/** The inspector stops rendering below this rendered-node count and reports the cap. */
export const maximumRenderedTreeNodes = 1000

/** Tree rendering stops at this nesting depth; deeper data stays valid JSON. */
export const maximumTreeDepth = 64

/** Preview text for primitive values is bounded so long strings cannot flood the tree. */
const maximumPreviewLength = 80

export type JsonType = "string" | "number" | "boolean" | "null" | "object" | "array"

export type JsonParseResult =
  | { status: "ok"; value: unknown }
  | { status: "invalid"; message: string }
  | { status: "over-limit"; message: string }

export function isValidJsonSize(text: string): boolean {
  return new TextEncoder().encode(text).byteLength <= maximumJsonBytes
}

/**
 * Parses untrusted JSON as a typed result. V8 raises a RangeError (not a SyntaxError)
 * when nesting overflows the stack; that is reported as a distinct recoverable message
 * instead of surfacing as a crash.
 */
export function parseJson(text: string): JsonParseResult {
  // The size bound is checked first so oversized whitespace-only input reports the
  // over-limit state rather than falling into the empty-input branch.
  if (!isValidJsonSize(text)) {
    return {
      status: "over-limit",
      message: `JSON input is limited to ${Math.round(maximumJsonBytes / 1024)} KiB. Shorten the document.`,
    }
  }
  if (!text.trim()) return { status: "invalid", message: "Enter JSON to validate." }
  try {
    return { status: "ok", value: JSON.parse(text) }
  } catch (error) {
    if (error instanceof RangeError) {
      return {
        status: "invalid",
        message: "The JSON is nested too deeply to parse safely. Reduce the nesting.",
      }
    }
    // The engine message quotes a small input snippet; it is displayed to the same user
    // and never logged.
    const message = error instanceof Error ? error.message : "The JSON could not be parsed."
    return { status: "invalid", message: message.slice(0, 200) }
  }
}

export type JsonFormatResult =
  | { status: "ok"; text: string }
  | { status: "invalid"; message: string }
  | { status: "over-limit"; message: string }

function transform(text: string, indent: number | undefined): JsonFormatResult {
  const parsed = parseJson(text)
  if (parsed.status !== "ok") return parsed
  try {
    return { status: "ok", text: JSON.stringify(parsed.value, null, indent) }
  } catch {
    return { status: "invalid", message: "The JSON could not be re-serialized." }
  }
}

/** Pretty-prints with two-space indentation; invalid input is returned unchanged as typed. */
export function formatJson(text: string): JsonFormatResult {
  return transform(text, 2)
}

/** Minifies to a single line; invalid input is returned unchanged as typed. */
export function minifyJson(text: string): JsonFormatResult {
  return transform(text, undefined)
}

export function getJsonType(value: unknown): JsonType {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value as JsonType
}

export function isExpandableJson(value: unknown): boolean {
  return value !== null && typeof value === "object"
}

function previewOf(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`
  if (typeof value === "object") {
    const count = Object.keys(value).length
    return `${count} key${count === 1 ? "" : "s"}`
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = JSON.stringify(value)
    if (text === null) return typeof value
    return text.length > maximumPreviewLength ? `${text.slice(0, maximumPreviewLength)}…` : text
  }
  // Unreachable for JSON.parse output; report the engine type instead of stringifying.
  return typeof value
}

export interface JsonTreeEntry {
  /** Display label: object key, numeric array index, or "root". */
  label: string
  /** Path key unique within the document (root is the empty string). */
  path: string
  type: JsonType
  depth: number
  expandable: boolean
  expanded: boolean
  /** Bounded description shown beside the label. */
  preview: string
}

export interface JsonTree {
  entries: JsonTreeEntry[]
  /** True when rendering stopped at `maximumRenderedTreeNodes`. */
  capped: boolean
  /** Total expandable nodes reachable from the root. */
  totalExpandable: number
}

function countExpandable(value: unknown): number {
  if (!isExpandableJson(value)) return 0
  let count = 1
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>)
  for (const child of children) count += countExpandable(child)
  return count
}

/**
 * Builds the flat, indented tree entries for the currently expanded paths. Rendering is
 * bounded by `maximumRenderedTreeNodes` and `maximumTreeDepth`, so a large document can
 * only ever produce a bounded list.
 */
export function buildJsonTree(value: unknown, expandedPaths: ReadonlySet<string>): JsonTree {
  const entries: JsonTreeEntry[] = []
  let capped = false

  function walk(current: unknown, path: string, label: string, depth: number): void {
    if (entries.length >= maximumRenderedTreeNodes || depth > maximumTreeDepth) {
      capped = true
      return
    }
    const type = getJsonType(current)
    const expandable = isExpandableJson(current)
    const expanded = expandable && expandedPaths.has(path)
    entries.push({
      label,
      path,
      type,
      depth,
      expandable,
      expanded,
      preview: previewOf(current),
    })
    if (!expanded || !expandable) return
    if (Array.isArray(current)) {
      current.forEach((item, index) => walk(item, `${path}/${index}`, String(index), depth + 1))
    } else {
      for (const [key, item] of Object.entries(current as Record<string, unknown>)) {
        walk(item, `${path}/${key}`, key, depth + 1)
      }
    }
  }

  walk(value, "", "root", 0)
  return { entries, capped, totalExpandable: countExpandable(value) }
}

/** Paths of every expandable node, for the expand-all action. */
export function allExpandablePaths(value: unknown): { paths: string[]; tooLarge: boolean } {
  const paths: string[] = []
  let tooLarge = false

  function walk(current: unknown, path: string): void {
    if (!isExpandableJson(current)) return
    if (paths.length >= maximumExpandAllNodes) {
      tooLarge = true
      return
    }
    paths.push(path)
    if (Array.isArray(current)) {
      current.forEach((item, index) => walk(item, `${path}/${index}`))
    } else {
      for (const [key, item] of Object.entries(current as Record<string, unknown>)) {
        walk(item, `${path}/${key}`)
      }
    }
  }

  walk(value, "")
  return { paths, tooLarge }
}
