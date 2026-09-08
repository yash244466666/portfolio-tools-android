import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { toSafeErrorMessage } from "@/platform/errors"
import { bytesToBase64 } from "@/platform/shared/files"
import type { PickedFile } from "@/platform/contracts"
import {
  destroyPdfDocument,
  extractPageText,
  imagesToPdfBytes,
  loadPdfDocument,
  mergePdfs,
  renderPageToPng,
  zipPages,
} from "./pdf-io"
import {
  assembleDocumentText,
  formatBytes,
  maximumDecodedPixels,
  maximumPdfBytes,
  maximumPdfPages,
  maximumRenderedPages,
  maximumTextBytes,
  pageEntryName,
  PdfToolError,
  safeOutputName,
  supportedImageMimeTypes,
  validateImageFiles,
  validateMergePdfs,
  validatePageCount,
  validateSinglePdf,
} from "./pdf"

type Mode = "image-to-pdf" | "pdf-to-image" | "merge-pdfs" | "pdf-to-text"

const modes: Array<{ id: Mode; label: string }> = [
  { id: "image-to-pdf", label: "Images to PDF" },
  { id: "pdf-to-image", label: "PDF to Images" },
  { id: "merge-pdfs", label: "Merge PDFs" },
  { id: "pdf-to-text", label: "PDF to Text" },
]

interface RenderedPage {
  url: string
  bytes: Uint8Array
  width: number
  height: number
}

const pdfAccept = ["application/pdf"]
const imageAccept = [...supportedImageMimeTypes]

export default function PdfConverter() {
  const { files } = usePlatform()
  const [mode, setMode] = useState<Mode>("image-to-pdf")
  const [images, setImages] = useState<PickedFile[]>([])
  const [imagePdfs, setImagePdfs] = useState<PickedFile[]>([])
  const [pdfForImages, setPdfForImages] = useState<PickedFile | null>(null)
  const [pdfForText, setPdfForText] = useState<PickedFile | null>(null)
  const [pages, setPages] = useState<RenderedPage[]>([])
  const [extractedText, setExtractedText] = useState("")
  const [pageCountNote, setPageCountNote] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)

  // Rendered page previews are disposable; every replacement and the unmount
  // revoke them so page bitmaps do not outlive the screen.
  useEffect(() => {
    return () => {
      for (const page of pages) URL.revokeObjectURL(page.url)
    }
  }, [pages])

  const clearOutputs = useCallback(() => {
    setPages((current) => {
      for (const page of current) URL.revokeObjectURL(page.url)
      return []
    })
    setExtractedText("")
    setPageCountNote("")
  }, [])

  const pickFiles = useCallback(
    async (options: { accept: string[]; multiple: boolean }, apply: (picked: PickedFile[]) => void) => {
      setError("")
      setStatus("")
      try {
        const selected = await files.pick(options)
        if (selected.length === 0) {
          setStatus("Selection cancelled.")
          return
        }
        apply(selected)
      } catch (pickError) {
        setStatus(toSafeErrorMessage(pickError))
      }
    },
    [files],
  )

  async function convertImagesToPdf() {
    if (busy || images.length === 0) return
    setBusy(true)
    setError("")
    try {
      const payloads: Array<{ bytes: Uint8Array; mimeType: string }> = []
      for (const image of images) {
        const content = await files.readContent(image, { maximumBytes: maximumPdfBytes })
        payloads.push({ bytes: new Uint8Array(await toBytes(content.data)), mimeType: image.mimeType })
      }
      const output = await imagesToPdfBytes(payloads)
      const name = safeOutputName(images[0]?.name ?? "images", "images", "pdf")
      await files.saveAs({
        name,
        mimeType: "application/pdf",
        data: bytesToBase64(output.bytes),
        encoding: "base64",
      })
      setStatus(`Saved ${name} with ${output.pageCount} page${output.pageCount === 1 ? "" : "s"}.`)
    } catch (convertError) {
      reportPdfError(convertError, "The images could not be converted.")
    } finally {
      setBusy(false)
    }
  }

  async function convertPdfToImages() {
    if (busy || !pdfForImages) return
    setBusy(true)
    setError("")
    try {
      const content = await files.readContent(pdfForImages, { maximumBytes: maximumPdfBytes })
      const bytes = await toBytes(content.data)
      const doc = await loadPdfDocument(bytes)
      try {
        const pageLimit = validatePageCount(doc.numPages)
        if (pageLimit) {
          setError(pageLimit)
          return
        }
        const rendered: RenderedPage[] = []
        const total = Math.min(doc.numPages, maximumRenderedPages)
        for (let pageNumber = 1; pageNumber <= total; pageNumber++) {
          const page = await renderPageToPng(doc, pageNumber, maximumDecodedPixels)
          rendered.push({
            bytes: page.bytes,
            width: page.width,
            height: page.height,
            url: URL.createObjectURL(
              new Blob([page.bytes.buffer as ArrayBuffer], { type: "image/png" }),
            ),
          })
        }
        clearOutputs()
        setPages(rendered)
        setPageCountNote(
          doc.numPages > maximumRenderedPages
            ? `Rendered the first ${maximumRenderedPages} of ${doc.numPages} pages to stay within the memory budget.`
            : "",
        )
        setStatus(`Rendered ${rendered.length} page${rendered.length === 1 ? "" : "s"} as PNG.`)
      } finally {
        await destroyPdfDocument(doc)
      }
    } catch (convertError) {
      reportPdfError(convertError, "The PDF could not be converted to images.")
    } finally {
      setBusy(false)
    }
  }

  async function savePagesAsZip() {
    if (busy || pages.length === 0 || !pdfForImages) return
    setBusy(true)
    try {
      const zipBytes = await zipPages(
        pages.map((page) => page.bytes),
        pageEntryName,
      )
      await files.saveAs({
        name: safeOutputName(pdfForImages.name, "pdf", "zip"),
        mimeType: "application/zip",
        data: bytesToBase64(zipBytes),
        encoding: "base64",
      })
      setStatus("ZIP archive saved.")
    } catch (zipError) {
      reportPdfError(zipError, "The ZIP archive could not be created.")
    } finally {
      setBusy(false)
    }
  }

  async function savePagePng(pageIndex: number) {
    const page = pages[pageIndex]
    if (!page || busy) return
    setBusy(true)
    try {
      await files.saveAs({
        name: pageEntryName(pageIndex),
        mimeType: "image/png",
        data: bytesToBase64(page.bytes),
        encoding: "base64",
      })
      setStatus(`${pageEntryName(pageIndex)} saved.`)
    } catch (saveError) {
      setStatus(toSafeErrorMessage(saveError))
    } finally {
      setBusy(false)
    }
  }

  async function mergeSelectedPdfs() {
    if (busy || imagePdfs.length < 2) return
    setBusy(true)
    setError("")
    try {
      const inputs: Uint8Array[] = []
      for (const pdf of imagePdfs) {
        const content = await files.readContent(pdf, { maximumBytes: maximumPdfBytes })
        inputs.push(await toBytes(content.data))
      }
      const output = await mergePdfs(inputs)
      await files.saveAs({
        name: "merged.pdf",
        mimeType: "application/pdf",
        data: bytesToBase64(output.bytes),
        encoding: "base64",
      })
      setStatus(`Saved merged.pdf with ${output.pageCount} pages.`)
    } catch (mergeError) {
      reportPdfError(mergeError, "The PDFs could not be merged.")
    } finally {
      setBusy(false)
    }
  }

  async function extractPdfText() {
    if (busy || !pdfForText) return
    setBusy(true)
    setError("")
    try {
      const content = await files.readContent(pdfForText, { maximumBytes: maximumPdfBytes })
      const bytes = await toBytes(content.data)
      const doc = await loadPdfDocument(bytes)
      try {
        const pageLimit = validatePageCount(doc.numPages)
        if (pageLimit) {
          setError(pageLimit)
          return
        }
        const blocks: string[] = []
        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
          blocks.push(await extractPageText(doc, pageNumber))
        }
        const text = assembleDocumentText(blocks)
        const encoded = new TextEncoder().encode(text)
        if (encoded.length > maximumTextBytes) {
          setError(
            `The extracted text is ${formatBytes(encoded.length)}, above the ${formatBytes(maximumTextBytes)} limit.`,
          )
          return
        }
        clearOutputs()
        setExtractedText(text)
        setStatus(
          text.length > 0
            ? `Extracted text from ${doc.numPages} page${doc.numPages === 1 ? "" : "s"}.`
            : "This PDF contains no extractable text; it may be image-only.",
        )
      } finally {
        await destroyPdfDocument(doc)
      }
    } catch (extractError) {
      reportPdfError(extractError, "The text could not be extracted.")
    } finally {
      setBusy(false)
    }
  }

  function reportPdfError(failure: unknown, fallback: string) {
    if (failure instanceof PdfToolError) {
      setError(failure.message)
      return
    }
    setError(fallback)
  }

  function reset() {
    setImages([])
    setImagePdfs([])
    setPdfForImages(null)
    setPdfForText(null)
    clearOutputs()
    setError("")
    setStatus("PDF tool reset.")
  }

  async function toBytes(base64: string): Promise<Uint8Array> {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Conversion mode">
        <div
          aria-label="Conversion mode"
          className="grid grid-cols-2 gap-2"
          role="group"
        >
          {modes.map((entry) => (
            <Button
              aria-pressed={mode === entry.id}
              key={entry.id}
              onClick={() => {
                setMode(entry.id)
                setError("")
                setStatus("")
              }}
              variant={mode === entry.id ? "primary" : "secondary"}
            >
              {entry.label}
            </Button>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel title={modes.find((entry) => entry.id === mode)?.label ?? ""}>
        <div className="grid gap-3">
          {mode === "image-to-pdf" ? (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                Place PNG or JPEG images, each up to {formatBytes(maximumPdfBytes)}, into one PDF on
                this device. At most 50 images per PDF.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void pickFiles({ accept: imageAccept, multiple: true }, (selected) => {
                      const problem = validateImageFiles(selected)
                      if (problem) {
                        setError(problem)
                        return
                      }
                      setImages(selected)
                      setStatus(`Selected ${selected.length} image${selected.length === 1 ? "" : "s"}.`)
                    })
                  }
                >
                  {images.length > 0 ? "Choose other images" : "Choose images"}
                </Button>
                <Button disabled={busy} onClick={reset} variant="secondary">
                  Reset
                </Button>
              </div>
              <Button disabled={busy || images.length === 0} onClick={() => void convertImagesToPdf()}>
                {busy ? "Working…" : "Convert to PDF"}
              </Button>
            </>
          ) : null}

          {mode === "pdf-to-image" ? (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                Render pages of one PDF (up to {formatBytes(maximumPdfBytes)}, {maximumPdfPages}{" "}
                pages) as PNG images on this device. The first {maximumRenderedPages} pages are held
                at once; large pages are scaled down to fit the pixel budget.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void pickFiles({ accept: pdfAccept, multiple: false }, (selected) => {
                      const first = selected[0] ?? null
                      const problem = validateSinglePdf(first)
                      if (problem) {
                        setError(problem)
                        return
                      }
                      setPdfForImages(first)
                      clearOutputs()
                      setStatus(first ? `Selected ${formatBytes(first.size)} PDF.` : "")
                    })
                  }
                >
                  {pdfForImages ? "Choose another PDF" : "Choose PDF"}
                </Button>
                <Button disabled={busy} onClick={reset} variant="secondary">
                  Reset
                </Button>
              </div>
              <Button
                disabled={busy || !pdfForImages}
                onClick={() => void convertPdfToImages()}
              >
                {busy ? "Rendering…" : "Convert to images"}
              </Button>
              {pages.length > 0 ? (
                <Button disabled={busy} onClick={() => void savePagesAsZip()}>
                  Save all as ZIP
                </Button>
              ) : null}
              {pageCountNote ? (
                <p className="text-sm" role="note">
                  {pageCountNote}
                </p>
              ) : null}
              {pages.length > 0 ? (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Rendered pages">
                  {pages.map((page, index) => (
                    <li className="grid gap-2 rounded-xl border border-[var(--border)] p-2" key={page.url}>
                      <img
                        alt={`Page ${index + 1} preview, ${page.width} by ${page.height} pixels`}
                        className="max-h-64 w-full rounded-lg object-contain"
                        src={page.url}
                      />
                      <p className="text-xs text-[var(--text-secondary)]">
                        Page {index + 1} · {page.width} × {page.height} px
                      </p>
                      <Button
                        aria-label={`Save page ${index + 1} as PNG`}
                        disabled={busy}
                        onClick={() => void savePagePng(index)}
                        variant="secondary"
                      >
                        Save PNG
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}

          {mode === "merge-pdfs" ? (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                Combine 2 to 20 PDFs, each up to {formatBytes(maximumPdfBytes)}, into one file on
                this device.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void pickFiles({ accept: pdfAccept, multiple: true }, (selected) => {
                      const problem = validateMergePdfs(selected)
                      if (problem) {
                        setError(problem)
                        return
                      }
                      setImagePdfs(selected)
                      setStatus(`Selected ${selected.length} PDFs.`)
                    })
                  }
                >
                  {imagePdfs.length > 0 ? "Choose other PDFs" : "Choose PDFs"}
                </Button>
                <Button disabled={busy} onClick={reset} variant="secondary">
                  Reset
                </Button>
              </div>
              <Button
                disabled={busy || imagePdfs.length < 2}
                onClick={() => void mergeSelectedPdfs()}
              >
                {busy ? "Merging…" : "Merge PDFs"}
              </Button>
            </>
          ) : null}

          {mode === "pdf-to-text" ? (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                Extract the text of one PDF (up to {formatBytes(maximumPdfBytes)}, {maximumPdfPages}{" "}
                pages) on this device. Scanned image-only PDFs contain no extractable text.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void pickFiles({ accept: pdfAccept, multiple: false }, (selected) => {
                      const first = selected[0] ?? null
                      const problem = validateSinglePdf(first)
                      if (problem) {
                        setError(problem)
                        return
                      }
                      setPdfForText(first)
                      setExtractedText("")
                      setStatus(first ? `Selected ${formatBytes(first.size)} PDF.` : "")
                    })
                  }
                >
                  {pdfForText ? "Choose another PDF" : "Choose PDF"}
                </Button>
                <Button disabled={busy} onClick={reset} variant="secondary">
                  Reset
                </Button>
              </div>
              <Button disabled={busy || !pdfForText} onClick={() => void extractPdfText()}>
                {busy ? "Extracting…" : "Extract text"}
              </Button>
              {extractedText ? (
                <div className="grid gap-2">
                  <label className="text-sm font-semibold" htmlFor="pdf-extracted-text">
                    Extracted text
                  </label>
                  <textarea
                    className="app-input min-h-40"
                    id="pdf-extracted-text"
                    readOnly
                    value={extractedText}
                  />
                  <div>
                    <CopyButton label="Copy text" value={extractedText} />
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {error ? (
            <p className="text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {status ? (
            <p aria-live="polite" className="text-sm text-[var(--text-secondary)]" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </ToolPanel>
    </div>
  )
}

