import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type { BoundedContent, PickedFile, PlatformServices } from "@/platform/contracts"
import type * as platformModule from "@/platform/services"
import ColorPaletteFromImage from "@/tools/color-palette-from-image/ColorPaletteFromImage"
import type * as paletteIoModule from "@/tools/color-palette-from-image/palette-io"

const pickMock = vi.hoisted(() => vi.fn(() => Promise.resolve([] as PickedFile[])))
const readContentMock = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({ size: 4, data: "AAAAAA==", encoding: "base64" } satisfies BoundedContent),
  ),
)
const decodeImageMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ width: 100, height: 100, close: vi.fn() })),
)
const samplePixelsMock = vi.hoisted(() =>
  vi.fn(() => {
    // Two sampled pixels: one red, one blue (RGBA, 16 bytes each).
    const bytes = new Uint8ClampedArray(32)
    bytes[0] = 200 // red
    bytes[3] = 255 // alpha
    bytes[16] = 10
    bytes[18] = 200 // blue
    bytes[19] = 255 // alpha
    return bytes
  }),
)

vi.mock("@/tools/color-palette-from-image/palette-io", async (importOriginal) => {
  const actual = await importOriginal<typeof paletteIoModule>()
  return {
    ...actual,
    decodeImage: decodeImageMock,
    samplePixels: samplePixelsMock,
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
    },
  }
  return { ...actual, platformServices: services }
})

const pickedFile: PickedFile = {
  name: "photo.png",
  mimeType: "image/png",
  size: 12_345,
}

beforeEach(() => {
  pickMock.mockResolvedValue([pickedFile])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ColorPaletteFromImage", () => {
  it("extracts and displays the palette with hex labels", async () => {
    render(<ColorPaletteFromImage />, { wrapper: PlatformProvider })
    await screen.findByRole("button", { name: "Choose image" })
    // Empty state before picking.
    expect(screen.queryByText("Extracted palette")).toBeNull()

    const pick = screen.getByRole("button", { name: "Choose image" })
    pick.click()
    await waitFor(() => expect(screen.getByText("Extracted palette")).toBeTruthy())
    expect(screen.getByText("#c00000")).toBeTruthy()
    expect(screen.getByText("#0000c0")).toBeTruthy()
    expect(screen.getByLabelText("Palette as CSS custom properties").textContent).toContain(
      "--color-1: #0000c0;",
    )
  })

  it("explains cancellation without an error", async () => {
    pickMock.mockResolvedValue([])
    render(<ColorPaletteFromImage />, { wrapper: PlatformProvider })
    const pick = await screen.findByRole("button", { name: "Choose image" })
    pick.click()
    await waitFor(() => expect(screen.getByText("Image selection cancelled.")).toBeTruthy())
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("shows a recovery alert when decoding fails", async () => {
    decodeImageMock.mockRejectedValue(new Error("decode boom"))
    render(<ColorPaletteFromImage />, { wrapper: PlatformProvider })
    const pick = await screen.findByRole("button", { name: "Choose image" })
    pick.click()
    const alert = await screen.findByRole("alert")
    // The raw decoder message never reaches the screen.
    expect(alert.textContent).not.toContain("decode boom")
    expect(alert.textContent?.length ?? 0).toBeGreaterThan(0)
  })
})
