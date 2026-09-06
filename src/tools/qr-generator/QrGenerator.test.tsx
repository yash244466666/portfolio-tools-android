import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type { GeneratedFile, PlatformServices } from "@/platform/contracts"
import type * as platformModule from "@/platform/services"
import type * as qrModule from "@/tools/qr-generator/qr"
import QrGenerator from "@/tools/qr-generator/QrGenerator"

const drawMock = vi.hoisted(() =>
  vi.fn(() => ({
    status: "ok",
    plan: { modulePixels: 4, canvasPixels: 116, quietZoneModules: 4, totalModules: 29 },
  })),
)
const pngBytesMock = vi.hoisted(() => vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3, 4]))))
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

vi.mock("@/tools/qr-generator/qr", async (importOriginal) => {
  const actual = await importOriginal<typeof qrModule>()
  return { ...actual, drawQrToCanvas: drawMock, canvasPngBytes: pngBytesMock }
})

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    files: {
      ...base.files,
      share: shareMock,
      saveAs: saveAsMock,
    },
  }
  return { platformServices: services }
})

function renderTool() {
  render(
    <PlatformProvider>
      <QrGenerator />
    </PlatformProvider>,
  )
}

function typeText(value: string) {
  fireEvent.change(screen.getByLabelText("QR text"), { target: { value } })
}

beforeEach(() => {
  drawMock.mockClear()
  pngBytesMock.mockClear().mockReturnValue(Promise.resolve(new Uint8Array([1, 2, 3, 4])))
  shareMock.mockClear().mockResolvedValue(undefined)
  saveAsMock.mockClear().mockResolvedValue(undefined)
})

describe("QR Generator interactions", () => {
  it("starts empty and renders a typed symbol with its text equivalent", async () => {
    renderTool()
    expect(screen.getByText("The QR code appears here as you type.")).toBeVisible()

    typeText("https://example.com")
    await waitFor(() => {
      expect(screen.getByText(/QR version \d+: \d+ by \d+ modules rendered at/)).toBeVisible()
    })
    expect(screen.getByRole("img", { name: "QR code image of the entered text" })).toBeVisible()
    expect(drawMock).toHaveBeenCalled()
  })

  it("shares the PNG through the platform file service", async () => {
    renderTool()
    typeText("share me")
    const shareButton = await screen.findByRole("button", { name: "Share PNG" })
    await waitFor(() => expect(shareButton).toBeEnabled())

    await act(async () => {
      fireEvent.click(shareButton)
    })
    await waitFor(() => expect(screen.getByText("QR image shared.")).toBeVisible())
    expect(shareMock).toHaveBeenCalledTimes(1)
    const shared = shareMock.mock.calls[0]?.[0]
    expect(shared?.name).toBe("qr-code.png")
    expect(shared?.mimeType).toBe("image/png")
    expect(shared?.encoding).toBe("base64")
    expect(typeof shared?.data).toBe("string")
  })

  it("saves the PNG through the platform file service", async () => {
    renderTool()
    typeText("save me")
    const saveButton = await screen.findByRole("button", { name: "Save PNG" })
    await waitFor(() => expect(saveButton).toBeEnabled())

    await act(async () => {
      fireEvent.click(saveButton)
    })
    await waitFor(() => expect(screen.getByText("QR image saved.")).toBeVisible())
    expect(saveAsMock).toHaveBeenCalled()
  })

  it("surfaces share failures with a safe recovery message", async () => {
    shareMock.mockRejectedValue(new Error("bridge unavailable"))
    renderTool()
    typeText("share failure")
    const shareButton = await screen.findByRole("button", { name: "Share PNG" })
    await waitFor(() => expect(shareButton).toBeEnabled())

    await act(async () => {
      fireEvent.click(shareButton)
    })
    await waitFor(() =>
      expect(
        screen.getByText("The operation could not be completed. Please try again."),
      ).toBeVisible(),
    )
  })

  it("rejects oversized text without generating a symbol", () => {
    renderTool()
    typeText("a".repeat(4001))
    expect(
      screen.getByText(/QR text is limited to 4000 bytes; this input is 4001 bytes/),
    ).toBeVisible()
    expect(screen.getByText("Shorten the text to generate a QR code.")).toBeVisible()
    expect(drawMock).not.toHaveBeenCalled()
  })

  it("reports capacity failures per error-correction level", async () => {
    renderTool()
    typeText("a".repeat(2000))
    await waitFor(() => expect(drawMock).toHaveBeenCalled())

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Error correction level H" }))
    })
    await waitFor(() => {
      expect(
        screen.getByText(/too long for a QR code at this error-correction level/),
      ).toBeVisible()
      expect(screen.getByText("Fix the text to generate a QR code.")).toBeVisible()
    })
  })

  it("resets back to the empty state", async () => {
    renderTool()
    typeText("reset me")
    await waitFor(() => expect(drawMock).toHaveBeenCalled())

    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    await waitFor(() => {
      expect(screen.getByLabelText("QR text")).toHaveValue("")
      expect(screen.getByText("The QR code appears here as you type.")).toBeVisible()
    })
  })
})
