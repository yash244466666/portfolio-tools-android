import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type {
  BoundedContent,
  GeneratedFile,
  PickedFile,
  PlatformServices,
} from "@/platform/contracts"
import type * as platformModule from "@/platform/services"

const pickMock = vi.hoisted(() => vi.fn(() => Promise.resolve([] as PickedFile[])))
const readContentMock = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({ size: 8, data: "AAAAAAAAAA==", encoding: "base64" } satisfies BoundedContent),
  ),
)
const saveAsMock = vi.hoisted(() =>
  vi.fn<(file: GeneratedFile) => Promise<void>>(() => Promise.resolve()),
)

const startMock = vi.hoisted(() => vi.fn(() => true))
const addFrameMock = vi.hoisted(() => vi.fn())
const finishMock = vi.hoisted(() => vi.fn())
const cancelMock = vi.hoisted(() => vi.fn())
const disposeMock = vi.hoisted(() => vi.fn())

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    files: { ...base.files, pick: pickMock, readContent: readContentMock, saveAs: saveAsMock },
  }
  return { ...actual, platformServices: services }
})

vi.mock("./gif-client", () => ({
  createGifConversion: () => ({
    start: startMock,
    addFrame: addFrameMock,
    finish: finishMock,
    cancel: cancelMock,
    dispose: disposeMock,
  }),
}))

import VideoToGif from "./VideoToGif"

function renderTool() {
  render(
    <PlatformProvider>
      <VideoToGif />
    </PlatformProvider>,
  )
}

const videoFile: PickedFile = { name: "clip.mp4", mimeType: "video/mp4", size: 1024 }

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("VideoToGif", () => {
  it("discloses the input budget, codec baseline, and on-device privacy up front", () => {
    renderTool()
    expect(screen.getByText(/at most 16.0 MB/i)).toBeVisible()
    expect(screen.getByText(/MP4\/H\.264 is the supported baseline/i)).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent(/nothing is stored or sent anywhere/i)
    expect(screen.getByRole("button", { name: /choose video/i })).toBeEnabled()
  })

  it("lists the hard conversion and export caps honestly", () => {
    renderTool()
    expect(screen.getByText(/30 seconds, 100 frames/i)).toBeVisible()
    expect(screen.getByText(/hard-capped at 32.0 MB/i)).toBeVisible()
    expect(screen.getByText(/capped at 5 MB per file/i)).toBeVisible()
  })

  it("hides the export panel until a GIF exists", () => {
    renderTool()
    expect(screen.queryByRole("button", { name: /save gif/i })).not.toBeInTheDocument()
  })

  it("rejects a non-video pick with a distinct invalid-MIME state", async () => {
    pickMock.mockResolvedValue([{ name: "notes.txt", mimeType: "text/plain", size: 10 }])
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /choose video/i }))
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/this file is not a video/i)
    })
    expect(screen.getByRole("alert")).toHaveTextContent(/only video files are supported/i)
    expect(screen.getByRole("status")).toHaveTextContent(/the selected file was rejected/i)
  })

  it("rejects an oversized pick with a distinct over-size state", async () => {
    pickMock.mockResolvedValue([{ name: "big.mp4", mimeType: "video/mp4", size: 17 * 1024 * 1024 }])
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /choose video/i }))
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/this video is too large/i)
    })
    expect(screen.getByRole("alert")).toHaveTextContent(/16 MB input limit/i)
  })

  it("keeps a valid pick and shows its bounded size without exposing the name", async () => {
    pickMock.mockResolvedValue([videoFile])
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /choose video/i }))
    await waitFor(() => {
      expect(screen.getByText(/selected a 1.0 kB video/i)).toBeVisible()
    })
    expect(screen.queryByText("clip.mp4")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("reset clears the take and states that nothing is retained", async () => {
    pickMock.mockResolvedValue([videoFile])
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /choose video/i }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reset/i })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/tool reset. nothing is retained/i)
    })
    expect(screen.queryByRole("button", { name: /save gif/i })).not.toBeInTheDocument()
  })
})
