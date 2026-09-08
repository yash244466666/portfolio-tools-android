import { describe, expect, it } from "vitest"
import {
  assembleDocumentText,
  assemblePageText,
  formatBytes,
  isSupportedImageMimeType,
  maximumImageBytes,
  maximumImagesPerPdf,
  maximumPdfBytes,
  maximumPdfPages,
  maximumPdfsPerMerge,
  pageEntryName,
  PdfToolError,
  renderScaleFor,
  safeOutputName,
  validateImageFiles,
  validateMergePdfs,
  validatePageCount,
  validateSinglePdf,
} from "./pdf"

describe("pdf-converter limits", () => {
  it("keeps the plan's initial PDF and image budgets", () => {
    expect(maximumPdfBytes).toBe(16 * 1024 * 1024)
    expect(maximumImageBytes).toBe(16 * 1024 * 1024)
    expect(maximumPdfPages).toBe(200)
    expect(maximumImagesPerPdf).toBe(50)
    expect(maximumPdfsPerMerge).toBe(20)
  })
})

describe("formatBytes", () => {
  it("formats bytes, kilobytes, and megabytes", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(2048)).toBe("2.0 kB")
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB")
  })
})

describe("isSupportedImageMimeType", () => {
  it("accepts only PNG and JPEG regardless of case", () => {
    expect(isSupportedImageMimeType("image/png")).toBe(true)
    expect(isSupportedImageMimeType("IMAGE/JPEG")).toBe(true)
    expect(isSupportedImageMimeType("image/webp")).toBe(false)
    expect(isSupportedImageMimeType("application/pdf")).toBe(false)
  })
})

describe("validateImageFiles", () => {
  it("explains an empty selection", () => {
    expect(validateImageFiles([])).toBe("No image selected.")
  })

  it("rejects sets above the count limit", () => {
    const files = Array.from({ length: maximumImagesPerPdf + 1 }, () => ({
      mimeType: "image/png",
      size: 10,
    }))
    expect(validateImageFiles(files)).toBe("Choose at most 50 images per PDF.")
  })

  it("rejects an oversized image without discarding the source", () => {
    const problem = validateImageFiles([
      { mimeType: "image/png", size: 10 },
      { mimeType: "image/jpeg", size: maximumImageBytes + 1 },
    ])
    expect(problem).toBe("Every image must be at most 16.0 MB.")
  })

  it("rejects unsupported formats", () => {
    const problem = validateImageFiles([{ mimeType: "image/webp", size: 10 }])
    expect(problem).toBe("Only PNG and JPEG images can be placed in a PDF.")
  })

  it("accepts a valid set", () => {
    expect(validateImageFiles([{ mimeType: "image/png", size: 10 }])).toBeNull()
  })
})

describe("validateSinglePdf", () => {
  it("explains a missing file", () => {
    expect(validateSinglePdf(null)).toBe("No PDF selected.")
  })

  it("rejects files above the size limit", () => {
    const problem = validateSinglePdf({
      mimeType: "application/pdf",
      name: "book.pdf",
      size: maximumPdfBytes + 1,
    })
    expect(problem).toBe("The PDF is larger than the 16.0 MB limit.")
  })

  it("accepts the PDF MIME type or a .pdf name", () => {
    expect(
      validateSinglePdf({ mimeType: "application/pdf", name: "x.bin", size: 10 }),
    ).toBeNull()
    expect(validateSinglePdf({ mimeType: "", name: "report.PDF", size: 10 })).toBeNull()
  })

  it("rejects non-PDF content", () => {
    const problem = validateSinglePdf({ mimeType: "text/plain", name: "notes.txt", size: 10 })
    expect(problem).toBe("Only PDF files are supported.")
  })
})

describe("validateMergePdfs", () => {
  it("requires at least two PDFs", () => {
    expect(validateMergePdfs([])).toBe("Choose at least 2 PDF files to merge.")
    expect(
      validateMergePdfs([{ mimeType: "application/pdf", size: 10 }]),
    ).toBe("Choose at least 2 PDF files to merge.")
  })

  it("rejects sets above the merge count limit", () => {
    const files = Array.from({ length: maximumPdfsPerMerge + 1 }, () => ({
      mimeType: "application/pdf",
      size: 10,
    }))
    expect(validateMergePdfs(files)).toBe("Choose at most 20 PDFs per merge.")
  })

  it("rejects an oversized member", () => {
    const problem = validateMergePdfs([
      { mimeType: "application/pdf", size: 10 },
      { mimeType: "application/pdf", size: maximumPdfBytes + 1 },
      { mimeType: "application/pdf", size: 10 },
    ])
    expect(problem).toBe("Every PDF must be at most 16.0 MB.")
  })
})

describe("validatePageCount", () => {
  it("accepts within-limit counts and rejects above-limit counts", () => {
    expect(validatePageCount(maximumPdfPages)).toBeNull()
    expect(validatePageCount(maximumPdfPages + 1)).toBe(
      "This PDF has 201 pages, above the 200-page limit.",
    )
  })
})

describe("renderScaleFor", () => {
  it("keeps the requested scale when the page fits the pixel budget", () => {
    expect(renderScaleFor(500, 700, 2, 25_000_000)).toBe(2)
  })

  it("shrinks the scale so huge pages stay within the budget", () => {
    const scale = renderScaleFor(6000, 6000, 2, 25_000_000)
    expect(6000 * 6000 * scale * scale).toBeLessThanOrEqual(25_000_000)
    expect(scale).toBeGreaterThan(0.1)
  })

  it("guards degenerate dimensions", () => {
    expect(renderScaleFor(0, 0, 2, 25_000_000)).toBe(1)
  })
})

describe("assemblePageText", () => {
  it("joins text items with single spaces", () => {
    expect(assemblePageText([{ str: "Hello" }, { str: "world" }])).toBe("Hello world")
  })

  it("skips items without text", () => {
    expect(assemblePageText([{ str: undefined }, {}, { str: "only" }])).toBe("only")
  })

  it("returns an empty string for annotation-only pages", () => {
    expect(assemblePageText([{}, {}])).toBe("")
  })
})

describe("assembleDocumentText", () => {
  it("separates pages with blank lines and drops empty pages", () => {
    expect(assembleDocumentText(["Page one", "", "Page two"])).toBe("Page one\n\nPage two")
  })
})

describe("safeOutputName", () => {
  it("strips the source extension and unsafe characters", () => {
    expect(safeOutputName("my: report?.png", "images", "pdf")).toBe("myreport.pdf")
  })

  it("falls back when nothing safe remains", () => {
    expect(safeOutputName("///", "output", "zip")).toBe("output.zip")
  })
})

describe("pageEntryName", () => {
  it("names entries from one", () => {
    expect(pageEntryName(0)).toBe("page-1.png")
    expect(pageEntryName(11)).toBe("page-12.png")
  })
})

describe("PdfToolError", () => {
  it("carries a stable code", () => {
    const error = new PdfToolError("encrypted", "Encrypted files are not supported.")
    expect(error.code).toBe("encrypted")
    expect(error.name).toBe("PdfToolError")
  })
})