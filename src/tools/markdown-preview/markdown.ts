import DOMPurify from "dompurify"
import type { Config } from "dompurify"
import { Marked } from "marked"

/** Markdown input is bounded so per-keystroke parsing stays within the interaction budget. */
export const maximumMarkdownBytes = 256 * 1024

const markdownParser = new Marked({ gfm: true, breaks: false })

/**
 * Narrow, reviewed sanitizer allowlist for untrusted Markdown output. The preview only ever
 * needs document text, links, images, and tables; everything else is dropped. URI handling and
 * attribute values remain under DOMPurify's default policies (javascript:, data:, and event
 * handlers are removed), and CSP on the bundled origin is defense in depth, not the sanitizer.
 */
const sanitizeConfig: Config = {
  ALLOWED_TAGS: [
    "a",
    "abbr",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "dd",
    "details",
    "dl",
    "dt",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "input",
    "ins",
    "kbd",
    "li",
    "mark",
    "ol",
    "p",
    "pre",
    "q",
    "s",
    "samp",
    "small",
    "span",
    "strong",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
  ],
  ALLOWED_ATTR: [
    "alt",
    "checked",
    "colspan",
    "disabled",
    "height",
    "href",
    "rowspan",
    "src",
    "start",
    "title",
    "type",
    "width",
  ],
  ALLOW_DATA_ATTR: false,
  ALLOW_SELF_CLOSE_IN_ATTR: false,
  KEEP_CONTENT: true,
}

export function isValidMarkdownSize(markdown: string): boolean {
  return new TextEncoder().encode(markdown).byteLength <= maximumMarkdownBytes
}

/**
 * Renders untrusted Markdown to sanitized HTML. Parsing errors surface as exceptions so the
 * component can show its error state; the output is always sanitized, including on partial or
 * malformed input.
 */
export function renderMarkdown(markdown: string): string {
  const parsed = markdownParser.parse(markdown, { async: false })
  if (typeof parsed !== "string") {
    throw new TypeError("Markdown rendering produced no document.")
  }
  return DOMPurify.sanitize(parsed, sanitizeConfig)
}
