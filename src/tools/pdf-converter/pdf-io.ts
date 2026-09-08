/**
 * Adapter for the PDF Converter that keeps the pdf-lib and pdf.js calls in one
 * reviewable place. The pdf.js worker is a bundled Vite asset — never a remote
 * URL — so no executable code is ever downloaded at runtime.
 */
import { PDFDocument } from "pdf-lib"
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist"
// Deterministic module-worker URL emitted by Vite; the CSP worker-src 'self'
// already allows it. Do not replace this with a CDN worker source.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import JSZip from "jszip"
import { assemblePageText, PdfToolError, requestedRenderScale, renderScaleFor } from "./pdf"

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface PdfConversionOutput {
  bytes: Uint8Array
  pageCount: number
}

interface PdfJsTextItem {
  str?: string
}

interface PdfJsPage {
  getViewport(options: { scale: number }): { width: number; height: number }
  getTextContent(): Promise<{ items: PdfJsTextItem[] }>
  render(options: {
    canvasContext: CanvasRenderingContext2D
    viewport: { width: number; height: number }
  }): { promise: Promise<void> }
}

interface PdfJsDocument {
  numPages: number
  getPage(pageNumber: number): Promise<PdfJsPage>
  destroy(): Promise<void>
}

/** Maps low-level library failures onto the stable tool error codes. */
function mapLibraryError(error: unknown, fallback: string): PdfToolError {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : ""
  if (error instanceof PdfToolError) return error
  if (message.includes("PasswordException") || message.includes("encrypted")) {
    return new PdfToolError(
      "encrypted",
      "This PDF is password-protected or encrypted. Encrypted files are not supported.",
    )
  }
  return new PdfToolError("corrupt", fallback)
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!blob) {
    throw new PdfToolError("corrupt", "The page could not be rendered to an image.")
  }
  return new Uint8Array(await blob.arrayBuffer())
}

/** Embeds PNG/JPEG images, one per page sized to the image, into a new PDF. */
export async function imagesToPdfBytes(
  images: ReadonlyArray<{ bytes: Uint8Array; mimeType: string }>,
): Promise<PdfConversionOutput> {
  try {
    const doc = await PDFDocument.create()
    for (const image of images) {
      const embedded =
        image.mimeType.toLowerCase() === "image/png"
          ? await doc.embedPng(image.bytes)
          : await doc.embedJpg(image.bytes)
      const page = doc.addPage([embedded.width, embedded.height])
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: embedded.width,
        height: embedded.height,
      })
    }
    const bytes = await doc.save()
    return { bytes: new Uint8Array(bytes), pageCount: images.length }
  } catch (error) {
    throw mapLibraryError(error, "The images could not be combined into a PDF.")
  }
}

/** Copies every page of each input, in order, into one merged PDF. */
export async function mergePdfs(
  inputs: ReadonlyArray<Uint8Array>,
): Promise<PdfConversionOutput> {
  try {
    const merged = await PDFDocument.create()
    let pageCount = 0
    for (const input of inputs) {
      const doc = await PDFDocument.load(input)
      const copied = await merged.copyPages(doc, doc.getPageIndices())
      for (const page of copied) merged.addPage(page)
      pageCount += doc.getPageCount()
    }
    const bytes = await merged.save()
    return { bytes: new Uint8Array(bytes), pageCount }
  } catch (error) {
    throw mapLibraryError(error, "The PDFs could not be merged. One may be damaged or encrypted.")
  }
}

/** Opens a PDF with pdf.js, enforcing the page limit and encryption mapping. */
export async function loadPdfDocument(bytes: Uint8Array): Promise<PdfJsDocument> {
  try {
    const doc = await getDocument({ data: bytes.slice() }).promise
    return doc as unknown as PdfJsDocument
  } catch (error) {
    throw mapLibraryError(error, "This PDF could not be opened. It may be damaged or unsupported.")
  }
}

/** Extracts the text of every page, bounded by the caller's page loop. */
export async function extractPageText(doc: PdfJsDocument, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber)
  const content = await page.getTextContent()
  return assemblePageText(content.items)
}

/**
 * Renders one page to PNG bytes within the decoded-pixel budget and hands the
 * canvas back cleaned up so page bitmaps never accumulate.
 */
export async function renderPageToPng(
  doc: PdfJsDocument,
  pageNumber: number,
  maximumPixels: number,
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const page = await doc.getPage(pageNumber)
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = renderScaleFor(
    baseViewport.width,
    baseViewport.height,
    requestedRenderScale,
    maximumPixels,
  )
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement("canvas")
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const context = canvas.getContext("2d")
  if (!context) {
    throw new PdfToolError("corrupt", "Page rendering is unavailable in this environment.")
  }
  try {
    await page.render({ canvasContext: context, viewport }).promise
    const bytes = await canvasToPngBytes(canvas)
    return { bytes, width: canvas.width, height: canvas.height }
  } catch (error) {
    throw mapLibraryError(error, "This page could not be rendered.")
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

/** Bundles rendered PNG pages into a ZIP archive for a single Save As. */
export async function zipPages(
  pages: ReadonlyArray<Uint8Array>,
  entryName: (pageIndex: number) => string,
): Promise<Uint8Array> {
  const zip = new JSZip()
  pages.forEach((bytes, index) => {
    zip.file(entryName(index), bytes, { binary: true })
  })
  const blob = await zip.generateAsync({ type: "uint8array" })
  return new Uint8Array(blob)
}

/** Releases the pdf.js document resources; safe to call more than once. */
export async function destroyPdfDocument(doc: PdfJsDocument): Promise<void> {
  try {
    await doc.destroy()
  } catch {
    // Destruction is best-effort; the garbage collector reclaims the rest.
  }
}