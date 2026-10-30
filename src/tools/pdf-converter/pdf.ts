/**
 * Pure helpers and limits for the PDF Converter.
 *
 * The JavaScript pipeline must read whole files across the platform bridge as
 * bounded Base64 (the FileService read limit is 16 MiB on both adapters), so
 * the effective per-file input budget is that bound — the plan's 50 MiB/20 MiB
 * PDF and image selection budgets cannot be honored by a bridge-based tool in
 * version 1. The page, count, and simultaneous-render limits follow the plan.
 */
export const maximumPdfBytes = 16 * 1024 * 1024
export const maximumPdfPages = 200
export const maximumImageBytes = 16 * 1024 * 1024
export const maximumImagesPerPdf = 50
export const maximumPdfsPerMerge = 20
/** Pages held as PNG blobs at the same time; the gallery stays bounded. */
export const maximumRenderedPages = 20
/** Bound on the extracted text held in memory and shown in the editor. */
export const maximumTextBytes = 2 * 1024 * 1024
/** Scale requested for page rendering before the pixel budget clamps it. */
export const requestedRenderScale = 2
/** Decoded-page pixel budget shared with the image tools (25 megapixels). */
export const maximumDecodedPixels = 25_000_000

export const supportedImageMimeTypes = ["image/png", "image/jpeg"] as const

export type PdfToolErrorCode = "limit" | "unsupported" | "encrypted" | "corrupt"

export class PdfToolError extends Error {
  readonly code: PdfToolErrorCode

  constructor(code: PdfToolErrorCode, message: string) {
    super(message)
    this.name = "PdfToolError"
    this.code = code
  }
}

export function isSupportedImageMimeType(mimeType: string): boolean {
  return (supportedImageMimeTypes as readonly string[]).includes(mimeType.toLowerCase())
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Validates a set of image files for the Image to PDF mode. Returns the first
 * problem found so the source files are never discarded on failure.
 */
export function validateImageFiles(
  files: ReadonlyArray<{ mimeType: string; size: number }>,
): string | null {
  if (files.length === 0) return "No image selected."
  if (files.length > maximumImagesPerPdf) {
    return `Choose at most ${maximumImagesPerPdf} images per PDF.`
  }
  const oversized = files.find((file) => file.size > maximumImageBytes)
  if (oversized) {
    return `Every image must be at most ${formatBytes(maximumImageBytes)}.`
  }
  const unsupported = files.find((file) => !isSupportedImageMimeType(file.mimeType))
  if (unsupported) {
    return "Only PNG and JPEG images can be placed in a PDF."
  }
  return null
}

/** Validates one PDF for the PDF to Images and PDF to Text modes. */
export function validateSinglePdf(
  file: { mimeType: string; name: string; size: number } | null,
): string | null {
  if (!file) return "No PDF selected."
  if (file.size > maximumPdfBytes) {
    return `The PDF is larger than the ${formatBytes(maximumPdfBytes)} limit.`
  }
  const mime = file.mimeType.toLowerCase()
  const nameLooksPdf = /\.pdf$/i.test(file.name)
  if (mime !== "application/pdf" && !nameLooksPdf) {
    return "Only PDF files are supported."
  }
  return null
}

/** Validates the set of PDFs for the Merge mode. */
export function validateMergePdfs(
  files: ReadonlyArray<{ mimeType: string; size: number }>,
): string | null {
  if (files.length < 2) return "Choose at least 2 PDF files to merge."
  if (files.length > maximumPdfsPerMerge) {
    return `Choose at most ${maximumPdfsPerMerge} PDFs per merge.`
  }
  const oversized = files.find((file) => file.size > maximumPdfBytes)
  if (oversized) {
    return `Every PDF must be at most ${formatBytes(maximumPdfBytes)}.`
  }
  return null
}

/** Guards the page count reported by a loaded PDF against the plan limit. */
export function validatePageCount(pageCount: number): string | null {
  if (pageCount > maximumPdfPages) {
    return `This PDF has ${pageCount} pages, above the ${maximumPdfPages}-page limit.`
  }
  return null
}

/**
 * Returns the render scale that keeps one decoded page within the pixel
 * budget. The requested high-resolution scale is used whenever it fits.
 *
 * There is deliberately no minimum scale: a page whose MediaBox is large
 * enough needs a scale below 0.1 to stay inside the budget, and clamping the
 * result up would silently breach the limit (a crafted PDF is otherwise a
 * memory-exhaustion vector). A return of 0 means the dimensions cannot be
 * rendered safely at all; the caller rejects that page.
 */
export function renderScaleFor(
  pageWidth: number,
  pageHeight: number,
  requestedScale: number,
  maximumPixels: number,
): number {
  if (!Number.isFinite(pageWidth) || !Number.isFinite(pageHeight)) return 0
  if (pageWidth <= 0 || pageHeight <= 0) return 1
  const area = pageWidth * pageHeight
  const pixels = area * requestedScale * requestedScale
  if (!Number.isFinite(area) || !Number.isFinite(pixels)) return 0
  if (pixels <= maximumPixels) return requestedScale
  const shrunk = Math.sqrt(maximumPixels / area)
  return Number.isFinite(shrunk) && shrunk > 0 ? shrunk : 0
}

/**
 * Assembles text content items of one page into a single line block. Items
 * without text are skipped so annotations-only payloads leave no gaps.
 */
export function assemblePageText(items: ReadonlyArray<{ str?: string }>): string {
  return items
    .map((item) => (typeof item.str === "string" ? item.str : ""))
    .filter((text) => text.length > 0)
    .join(" ")
}

/** Joins page blocks with the upstream blank-line separation. */
export function assembleDocumentText(pages: ReadonlyArray<string>): string {
  return pages
    .map((page) => page.trim())
    .filter((page) => page.length > 0)
    .join("\n\n")
}

/**
 * Builds a display-safe output name from a source file name. Slashes,
 * separators, whitespace, and control characters are stripped; the extension is
 * appended. A character loop keeps the control-character policy explicit.
 */
export function safeOutputName(
  sourceName: string,
  fallbackBase: string,
  extension: string,
): string {
  const stripped = sourceName.replace(/\.[^.]+$/, "")
  let base = ""
  for (const character of stripped) {
    const code = character.codePointAt(0) ?? 0
    if (code < 32 || code === 127) continue
    if ('\\/:*?"<>| '.includes(character)) continue
    base += character
  }
  base = base.trim()
  const chosen = base.length > 0 ? base : fallbackBase
  return `${chosen}.${extension}`
}

/** ZIP entry name for a rendered page; page numbers stay one-based and ordered. */
export function pageEntryName(pageIndex: number): string {
  return `page-${pageIndex + 1}.png`
}
