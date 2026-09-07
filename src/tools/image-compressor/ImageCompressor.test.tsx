import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type {
  BoundedContent,
  GeneratedFile,
  PickedFile,
  PlatformServices,
} from "@/platform/contracts"
import { PlatformError } from "@/platform/errors"
import type * as platformModule from "@/platform/services"
import ImageCompressor from "@/tools/image-compressor/ImageCompressor"
import type * as imageIoModule from "@/tools/image-compressor/image-io"

const pickMock = vi.hoisted(() => vi.fn(() => Promise.resolve([] as PickedFile[])))
const readContentMock = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({ size: 4, data: "AAAAAA==", encoding: "base64" } satisfies BoundedContent),
  ),
)
const shareMock = vi.hoisted(() =>
  vi.fn((file: GeneratedFile) => {
    void file
    return Promise.resolve()
  }),
)
const saveAsMock = vi.hoisted(() =>
  vi.fn((file: GeneratedFile) => {
    void file
    return Promise.resolve()
  }),
)
const decodeImageMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ width: 4000, height: 3000, close: vi.fn() })),
)
const encodeImageMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve(new Blob(["compressed"], { type: "image/jpeg" }))),
)
const blobBytesMock = vi.hoisted(() => vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3, 4]))))

vi.mock("@/tools/image-compressor/image-io", async (importOriginal) => {
  const actual = await importOriginal<typeof imageIoModule>()
  return {
    ...actual,
    decodeImage: decodeImageMock,
    encodeImage: encodeImageMock,
    blobBytes: blobBytesMock,
  }
})

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    files: {
      ...base.files,
      pick: pickMock,
      readContent: readContentMock,
      share: shareMock,
      saveAs: saveAsMock,
    },
  }
  return { platformServices: services }
})

function renderTool() {
  render(
    <PlatformProvider>
      <ImageCompressor />
    </PlatformProvider>,
  )
}

async function pickJpeg(size = 1000) {
  pickMock.mockResolvedValue([{ name: "photo.jpg", mimeType: "image/jpeg", size }] as PickedFile[])
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Choose image" }))
  })
}

async function compress() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Compress image" }))
  })
}

beforeEach(() => {
  pickMock.mockClear().mockResolvedValue([])
  readContentMock
    .mockClear()
    .mockResolvedValue({ size: 4, data: "AAAAAA==", encoding: "base64" } satisfies BoundedContent)
  shareMock.mockClear().mockResolvedValue(undefined)
  saveAsMock.mockClear().mockResolvedValue(undefined)
  decodeImageMock.mockClear().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() })
  encodeImageMock.mockClear().mockResolvedValue(new Blob(["compressed"], { type: "image/jpeg" }))
  blobBytesMock.mockClear().mockResolvedValue(new Uint8Array([1, 2, 3, 4]))
  createUrlSpy = vi.fn(() => "blob:preview")
  revokeUrlSpy = vi.fn()
  URL.createObjectURL = createUrlSpy
  URL.revokeObjectURL = revokeUrlSpy
})

let createUrlSpy: ReturnType<typeof vi.fn<() => string>>
let revokeUrlSpy: ReturnType<typeof vi.fn<(url: string) => void>>

afterEach(() => {
  cleanup()
})

describe("Image Compressor interactions", () => {
  it("starts with the pick prompt and disabled compression", () => {
    renderTool()
    expect(screen.getByText(/Pick a PNG, JPEG, or WebP image/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Compress image" })).toBeDisabled()
  })

  it("accepts a picked image and reports its size", async () => {
    renderTool()
    await pickJpeg(2048)
    expect(screen.getByText(/Selected: 2.0 KB JPEG image/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Compress image" })).toBeEnabled()
  })

  it("reports cancelled picks without changing state", async () => {
    renderTool()
    pickMock.mockRejectedValue(new PlatformError("FILE_PICK_CANCELLED", "No file selected."))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Choose image" }))
    })
    expect(screen.getByText("No file selected.")).toBeInTheDocument()
  })

  it("rejects unsupported and oversized picks", async () => {
    renderTool()
    pickMock.mockResolvedValue([
      { name: "anim.gif", mimeType: "image/gif", size: 10 },
    ] as PickedFile[])
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Choose image" }))
    })
    expect(screen.getByText(/Only PNG, JPEG, and WebP/)).toBeInTheDocument()

    pickMock.mockResolvedValue([
      { name: "huge.jpg", mimeType: "image/jpeg", size: 16 * 1024 * 1024 + 1 },
    ] as PickedFile[])
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Choose image" }))
    })
    expect(screen.getByText(/larger than the 16.00 MB limit/)).toBeInTheDocument()
  })

  it("compresses a downscaled image and shares the exact preview bytes", async () => {
    const closeSpy = vi.fn()
    decodeImageMock.mockResolvedValue({ width: 4000, height: 3000, close: closeSpy })
    renderTool()
    await pickJpeg(400)
    await compress()

    expect(screen.getByText("1920 by 1440 pixels · 4 B · JPEG")).toBeInTheDocument()
    expect(screen.getByText(/Compressed to 4 B — 99% smaller/)).toBeInTheDocument()
    expect(encodeImageMock).toHaveBeenCalledTimes(1)
    expect(closeSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share image" }))
    })
    expect(screen.getByText("Compressed image shared.")).toBeInTheDocument()
    const shared = shareMock.mock.calls[0]?.[0]
    expect(shared?.name).toBe("compressed-photo.jpg")
    expect(shared?.mimeType).toBe("image/jpeg")
    expect(shared?.encoding).toBe("base64")
    expect(shared?.data).toBe(btoa("\x01\x02\x03\x04"))
  })

  it("closes the decoded bitmap even when the pixel limit rejects it", async () => {
    const closeSpy = vi.fn()
    decodeImageMock.mockResolvedValue({ width: 6001, height: 4000, close: closeSpy })
    renderTool()
    await pickJpeg()
    await compress()

    expect(closeSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/above the 24 megapixel limit/)).toBeInTheDocument()
    expect(screen.queryByText(/pixels ·/)).not.toBeInTheDocument()
  })

  it("surfaces decode failures as a recovery state", async () => {
    renderTool()
    await pickJpeg()
    decodeImageMock.mockRejectedValue(new Error("unsupported"))
    await compress()
    expect(screen.getByText(/could not be processed/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Compress image" })).toBeEnabled()
  })

  it("revokes the preview object URL on unmount", async () => {
    renderTool()
    await pickJpeg()
    await compress()
    expect(createUrlSpy).toHaveBeenCalled()

    cleanup()
    expect(revokeUrlSpy).toHaveBeenCalledWith("blob:preview")
  })

  it("resets back to the initial state", async () => {
    renderTool()
    await pickJpeg()
    await compress()

    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(screen.getByText(/Pick a PNG, JPEG, or WebP image/)).toBeInTheDocument()
    expect(screen.getByText("Image tool reset.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Compress image" })).toBeDisabled()
  })
})
