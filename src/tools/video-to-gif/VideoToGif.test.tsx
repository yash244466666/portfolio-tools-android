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
import type { GifConversionHandlers } from "./gif-client"

const pickMock = vi.hoisted(() => vi.fn(() => Promise.resolve([] as PickedFile[])))
const readContentMock = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({ size: 6, data: "AAAAAAAAAA==", encoding: "base64" } satisfies BoundedContent),
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

/** Drives the component's off-DOM video element through a conversion. */
class FakeVideo {
  muted = false
  playsInline = false
  preload = ""
  src = ""
  duration = 2
  videoWidth = 640
  videoHeight = 480
  error: { code: number } | null = null
  onloadedmetadata: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  private listeners = new Map<string, Array<() => void>>()

  load(): void {}

  removeAttribute(): void {}

  addEventListener(type: string, handler: () => void): void {
    const existing = this.listeners.get(type) ?? []
    existing.push(handler)
    this.listeners.set(type, existing)
  }

  removeEventListener(type: string, handler: () => void): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((listener) => listener !== handler),
    )
  }

  set currentTime(_value: number) {
    // Real seeks fire `seeked`; the fake auto-fires so the loop advances.
    queueMicrotask(() => {
      for (const handler of this.listeners.get("seeked") ?? []) handler()
    })
  }

  loadMetadata(): void {
    this.onloadedmetadata?.({})
  }
}

let createElementSpy: { mockRestore: () => void } | null = null
let activeVideo: FakeVideo | null = null

function installVideoDriver(): void {
  const original = document.createElement.bind(document)
  createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "video") {
      activeVideo = new FakeVideo()
      return activeVideo as unknown as HTMLVideoElement
    }
    return original(tag)
  })
}

function handlers(run = 0): GifConversionHandlers {
  const calls = startMock.mock.calls as unknown as Array<[unknown, GifConversionHandlers]>
  const call = calls[run]
  if (!call) throw new Error("conversion.start was not called")
  return call[1]
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  createElementSpy?.mockRestore()
  createElementSpy = null
  activeVideo = null
  vi.unstubAllGlobals()
})

describe("VideoToGif disclosures", () => {
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
})

describe("VideoToGif pick states", () => {
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

  it("maps the picker's own FILE_TOO_LARGE rejection onto the over-size panel", async () => {
    const { PlatformError } = await import("@/platform/errors")
    pickMock.mockRejectedValue(
      new PlatformError("FILE_TOO_LARGE", "big.mp4 is larger than this tool allows."),
    )
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /choose video/i }))
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/this video is too large/i)
    })
    expect(screen.getByRole("alert")).toHaveTextContent(/16 MB input limit/i)
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

describe("VideoToGif conversion flow", () => {
  it("drives converting through done and exports via Save As", async () => {
    installVideoDriver()
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ close: () => undefined, width: 320, height: 240 })),
    )
    pickMock.mockResolvedValue([videoFile])
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /choose video/i }))
    await screen.findByText(/selected a 1.0 kB video/i)

    fireEvent.click(screen.getByRole("button", { name: "Convert to GIF" }))
    await waitFor(() => expect(activeVideo).not.toBeNull())
    activeVideo?.loadMetadata()

    // The loop auto-drives through the fake seeks and bitmap stubs.
    await waitFor(() => expect(finishMock).toHaveBeenCalled())
    expect(addFrameMock).toHaveBeenCalledTimes(10)

    handlers().onEncoding?.()
    await waitFor(() => expect(screen.getByText(/finishing the GIF encoding/i)).toBeVisible())

    handlers().onComplete?.({
      bytes: new Uint8Array([1, 2, 3]),
      width: 320,
      height: 240,
      frameCount: 10,
    })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save gif/i })).toBeEnabled()
    })
    expect(screen.getByText(/2.0 s/)).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: /save gif/i }))
    await waitFor(() => expect(saveAsMock).toHaveBeenCalled())
    expect(saveAsMock.mock.calls[0]?.[0]?.name).toBe("clip.gif")
    expect(saveAsMock.mock.calls[0]?.[0]?.mimeType).toBe("image/gif")
    expect(await screen.findByText("GIF saved.")).toBeVisible()
  })

  it("lands on the cancelled state with nothing kept", async () => {
    installVideoDriver()
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ close: () => undefined, width: 320, height: 240 })),
    )
    pickMock.mockResolvedValue([videoFile])
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /choose video/i }))
    await screen.findByText(/selected a 1.0 kB video/i)
    fireEvent.click(screen.getByRole("button", { name: "Convert to GIF" }))
    await waitFor(() => expect(activeVideo).not.toBeNull())
    activeVideo?.loadMetadata()
    await waitFor(() => expect(addFrameMock).toHaveBeenCalled())

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(cancelMock).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /conversion cancelled. nothing was kept/i,
      )
    })
  })

  it("shows the over-limit state with the settings still followable", async () => {
    installVideoDriver()
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ close: () => undefined, width: 320, height: 240 })),
    )
    pickMock.mockResolvedValue([videoFile])
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /choose video/i }))
    await screen.findByText(/selected a 1.0 kB video/i)
    fireEvent.click(screen.getByRole("button", { name: "Convert to GIF" }))
    await waitFor(() => expect(activeVideo).not.toBeNull())
    activeVideo?.loadMetadata()
    await waitFor(() => expect(startMock).toHaveBeenCalled())

    handlers().onFailure?.("over-limit-output", "The GIF exceeded the output size limit.")
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/the GIF exceeded the output size limit/i)
    })
    // The recovery advice must be followable: fps and width stay editable.
    expect(screen.getByLabelText(/frames per second/i)).toBeVisible()
    expect(screen.getByLabelText(/output width/i)).toBeVisible()
  })

  it("explains a disabled export with a visible note for an over-cap GIF", async () => {
    installVideoDriver()
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ close: () => undefined, width: 320, height: 240 })),
    )
    pickMock.mockResolvedValue([videoFile])
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /choose video/i }))
    await screen.findByText(/selected a 1.0 kB video/i)
    fireEvent.click(screen.getByRole("button", { name: "Convert to GIF" }))
    await waitFor(() => expect(activeVideo).not.toBeNull())
    activeVideo?.loadMetadata()
    await waitFor(() => expect(finishMock).toHaveBeenCalled())

    handlers().onComplete?.({
      bytes: new Uint8Array(5 * 1024 * 1024 + 1),
      width: 320,
      height: 240,
      frameCount: 10,
    })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save gif/i })).toBeDisabled()
    })
    expect(screen.getByRole("note")).toHaveTextContent(/capped at 5 MB per file/i)
  })

  it("reports save cancellation and save failure through the export note", async () => {
    installVideoDriver()
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ close: () => undefined, width: 320, height: 240 })),
    )
    pickMock.mockResolvedValue([videoFile])
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /choose video/i }))
    await screen.findByText(/selected a 1.0 kB video/i)
    fireEvent.click(screen.getByRole("button", { name: "Convert to GIF" }))
    await waitFor(() => expect(activeVideo).not.toBeNull())
    activeVideo?.loadMetadata()
    await waitFor(() => expect(finishMock).toHaveBeenCalled())
    handlers().onComplete?.({
      bytes: new Uint8Array([1, 2, 3]),
      width: 320,
      height: 240,
      frameCount: 10,
    })
    await screen.findByRole("button", { name: /save gif/i })

    const cancelError = new Error("aborted")
    cancelError.name = "AbortError"
    saveAsMock.mockRejectedValueOnce(cancelError)
    fireEvent.click(screen.getByRole("button", { name: /save gif/i }))
    await waitFor(() => expect(screen.getByText("Save cancelled.")).toBeVisible())

    saveAsMock.mockRejectedValueOnce(new Error("disk full"))
    fireEvent.click(screen.getByRole("button", { name: /save gif/i }))
    await waitFor(() => {
      expect(
        screen.getByText("The operation could not be completed. Please try again."),
      ).toBeVisible()
    })
  })
})
