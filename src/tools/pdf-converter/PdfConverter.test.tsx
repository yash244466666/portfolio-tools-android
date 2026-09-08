import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type {
  BoundedContent,
  GeneratedFile,
  PickedFile,
  PlatformServices,
} from "@/platform/contracts"
import type * as platformModule from "@/platform/services"
import { PdfToolError } from "./pdf"
import PdfConverter from "./PdfConverter"

const pickMock = vi.hoisted(() => vi.fn(() => Promise.resolve([] as PickedFile[])))
const readContentMock = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({ size: 8, data: "AAAAAAAAAA==", encoding: "base64" } satisfies BoundedContent),
  ),
)
const saveAsMock = vi.hoisted(() =>
  vi.fn<(file: GeneratedFile) => Promise<void>>(() => Promise.resolve()),
)

const imagesToPdfBytesMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ bytes: new Uint8Array([1, 2, 3]), pageCount: 2 })),
)
const mergePdfsMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ bytes: new Uint8Array([9]), pageCount: 5 })),
)
const loadPdfDocumentMock = vi.hoisted(() => vi.fn())
const renderPageToPngMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ bytes: new Uint8Array([7, 7]), width: 640, height: 880 })),
)
const extractPageTextMock = vi.hoisted(() => vi.fn(() => Promise.resolve("Extracted words")))
const zipPagesMock = vi.hoisted(() => vi.fn(() => Promise.resolve(new Uint8Array([4, 5]))))
const destroyMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock("./pdf-io", () => ({
  imagesToPdfBytes: imagesToPdfBytesMock,
  mergePdfs: mergePdfsMock,
  loadPdfDocument: loadPdfDocumentMock,
  renderPageToPng: renderPageToPngMock,
  extractPageText: extractPageTextMock,
  zipPages: zipPagesMock,
  destroyPdfDocument: destroyMock,
}))

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    files: { ...base.files, pick: pickMock, readContent: readContentMock, saveAs: saveAsMock },
  }
  return { ...actual, platformServices: services }
})

const pdfFile: PickedFile = { name: "book.pdf", mimeType: "application/pdf", size: 1234 }
const pngFile: PickedFile = { name: "shot.png", mimeType: "image/png", size: 4567 }

function fakeDocument(numPages: number) {
  return {
    numPages,
    getPage: vi.fn(),
    destroy: destroyMock,
  }
}

beforeEach(() => {
  destroyMock.mockClear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("PdfConverter", () => {
  it("converts picked images into a saved PDF through the Save As bridge", async () => {
    pickMock.mockResolvedValue([pngFile, { ...pngFile, name: "other.png" }])
    render(
      <PlatformProvider>
        <PdfConverter />
      </PlatformProvider>,
    )
    fireEvent.click(await screen.findByRole("button", { name: "Choose images" }))
    await waitFor(() => expect(screen.getByText("Selected 2 images.")).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: "Convert to PDF" }))
    await waitFor(() => expect(screen.getByText("Saved shot.pdf with 2 pages.")).toBeTruthy())
    expect(imagesToPdfBytesMock).toHaveBeenCalledTimes(1)
    expect(saveAsMock.mock.calls[0]?.[0]?.name).toBe("shot.pdf")
    expect(saveAsMock.mock.calls[0]?.[0]?.mimeType).toBe("application/pdf")
  })

  it("rejects unsupported image formats without discarding the source", async () => {
    pickMock.mockResolvedValue([{ ...pngFile, mimeType: "image/webp" }])
    render(
      <PlatformProvider>
        <PdfConverter />
      </PlatformProvider>,
    )
    fireEvent.click(await screen.findByRole("button", { name: "Choose images" }))
    await waitFor(() =>
      expect(screen.getByText("Only PNG and JPEG images can be placed in a PDF.")).toBeTruthy(),
    )
    expect(imagesToPdfBytesMock).not.toHaveBeenCalled()
  })

  it("renders bounded pages and saves the ZIP through Save As", async () => {
    pickMock.mockResolvedValue([pdfFile])
    loadPdfDocumentMock.mockResolvedValue(fakeDocument(3))
    render(
      <PlatformProvider>
        <PdfConverter />
      </PlatformProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "PDF to Images" }))
    fireEvent.click(await screen.findByRole("button", { name: "Choose PDF" }))
    await waitFor(() => expect(screen.getByText("Selected 1.2 kB PDF.")).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: "Convert to images" }))
    await waitFor(() => expect(screen.getByText("Rendered 3 pages as PNG.")).toBeTruthy())
    expect(screen.getAllByAltText(/Page \d+ preview/)).toHaveLength(3)
    expect(destroyMock).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Save all as ZIP" }))
    await waitFor(() => expect(screen.getByText("ZIP archive saved.")).toBeTruthy())
    expect(saveAsMock.mock.calls[0]?.[0]?.name).toBe("book.zip")
    expect(zipPagesMock).toHaveBeenCalledTimes(1)
  })

  it("reports encrypted PDFs distinctly", async () => {
    pickMock.mockResolvedValue([pdfFile])
    loadPdfDocumentMock.mockRejectedValue(
      new PdfToolError("encrypted", "Encrypted PDFs are not supported."),
    )
    render(
      <PlatformProvider>
        <PdfConverter />
      </PlatformProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "PDF to Images" }))
    fireEvent.click(await screen.findByRole("button", { name: "Choose PDF" }))
    await waitFor(() => expect(screen.getByText("Selected 1.2 kB PDF.")).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: "Convert to images" }))
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Encrypted PDFs are not supported."),
    )
    expect(destroyMock).not.toHaveBeenCalled()
  })

  it("rejects PDFs above the page limit before rendering", async () => {
    pickMock.mockResolvedValue([pdfFile])
    loadPdfDocumentMock.mockResolvedValue(fakeDocument(201))
    render(
      <PlatformProvider>
        <PdfConverter />
      </PlatformProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "PDF to Images" }))
    fireEvent.click(await screen.findByRole("button", { name: "Choose PDF" }))
    await waitFor(() => expect(screen.getByText("Selected 1.2 kB PDF.")).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: "Convert to images" }))
    await waitFor(() =>
      expect(screen.getByText("This PDF has 201 pages, above the 200-page limit.")).toBeTruthy(),
    )
    expect(renderPageToPngMock).not.toHaveBeenCalled()
    expect(destroyMock).toHaveBeenCalled()
  })

  it("merges at least two PDFs and saves the result", async () => {
    pickMock.mockResolvedValue([pdfFile, { ...pdfFile, name: "second.pdf" }])
    render(
      <PlatformProvider>
        <PdfConverter />
      </PlatformProvider>,
    )
    // Two controls share the "Merge PDFs" name: the pressed mode tab and the
    // action button. The action button is the one without aria-pressed.
    const actionButton = () =>
      screen
        .getAllByRole("button", { name: "Merge PDFs" })
        .find((button) => button.getAttribute("aria-pressed") === null)
    fireEvent.click(screen.getByRole("button", { name: "Merge PDFs" }))
    fireEvent.click(await screen.findByRole("button", { name: "Choose PDFs" }))
    await waitFor(() => expect(screen.getByText("Selected 2 PDFs.")).toBeTruthy())
    expect(actionButton()).toBeTruthy()
    fireEvent.click(actionButton() as HTMLElement)
    await waitFor(() => expect(screen.getByText("Saved merged.pdf with 5 pages.")).toBeTruthy())
    expect(mergePdfsMock).toHaveBeenCalledTimes(1)
    expect(saveAsMock.mock.calls[0]?.[0]?.name).toBe("merged.pdf")
  })

  it("extracts text into a labelled editor and reports image-only PDFs", async () => {
    pickMock.mockResolvedValue([pdfFile])
    loadPdfDocumentMock.mockResolvedValue(fakeDocument(2))
    extractPageTextMock.mockResolvedValue("")
    render(
      <PlatformProvider>
        <PdfConverter />
      </PlatformProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "PDF to Text" }))
    fireEvent.click(await screen.findByRole("button", { name: "Choose PDF" }))
    await waitFor(() => expect(screen.getByText("Selected 1.2 kB PDF.")).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: "Extract text" }))
    await waitFor(() =>
      expect(
        screen.getByText("This PDF contains no extractable text; it may be image-only."),
      ).toBeTruthy(),
    )
    extractPageTextMock.mockResolvedValue("Words from page")
    fireEvent.click(screen.getByRole("button", { name: "Extract text" }))
    await waitFor(() => expect(screen.getByText("Extracted text from 2 pages.")).toBeTruthy())
    const editor = screen.getByLabelText("Extracted text")
    expect((editor as HTMLTextAreaElement).value).toContain("Words from page")
    expect((editor as HTMLTextAreaElement).readOnly).toBe(true)
  })
})
