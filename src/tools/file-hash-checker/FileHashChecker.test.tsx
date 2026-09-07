import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type { ContentDigestAlgorithm, PickedFile, PlatformServices } from "@/platform/contracts"
import { PlatformError } from "@/platform/errors"
import type * as platformModule from "@/platform/services"
import FileHashChecker from "@/tools/file-hash-checker/FileHashChecker"

/** Digests of the synthetic 1x1 PNG fixture used by the E2E suite. */
const fixtureDigests: Record<ContentDigestAlgorithm, string> = {
  "sha-256": "c414cd0e204de974f73753c7e28d7638e7b3691bb8b1a2bab6b25bb7fed7ce77",
  "sha-1": "b2bbe763c7e1828c750d53f78550709a6fea19be",
  "sha-512":
    "fcba48f85167b732f75c33a2232a87e393441948350f265737a483c8b4923fbc2d7dd4ea1ebf00bb774d8cb09c016610abfbc3d4597ebe2d16e81bb92cb3aa48",
}

const pickMock = vi.hoisted(() => vi.fn(() => Promise.resolve([] as PickedFile[])))
const digestMock = vi.hoisted(() =>
  vi.fn((_file: PickedFile, options: { algorithm: ContentDigestAlgorithm }) =>
    Promise.resolve({
      algorithm: options.algorithm,
      digestHex: fixtureDigests[options.algorithm],
      size: 70,
    }),
  ),
)

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    files: {
      ...base.files,
      pick: pickMock,
      digestContent: digestMock,
    },
  }
  return { platformServices: services }
})

function renderTool() {
  render(
    <PlatformProvider>
      <FileHashChecker />
    </PlatformProvider>,
  )
}

async function pickFixture(size = 70) {
  pickMock.mockResolvedValue([{ name: "fixture.png", mimeType: "image/png", size }])
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Choose file" }))
  })
}

beforeEach(() => {
  pickMock.mockClear().mockResolvedValue([])
  digestMock.mockClear().mockImplementation((_file, options) =>
    Promise.resolve({
      algorithm: options.algorithm,
      digestHex: fixtureDigests[options.algorithm],
      size: 70,
    }),
  )
})

describe("File Hash Checker interactions", () => {
  it("starts with the pick prompt", () => {
    renderTool()
    expect(screen.getByText(/Pick any file up to 100.0 MB/)).toBeInTheDocument()
    expect(screen.getByText(/Digests appear here after picking a file/)).toBeInTheDocument()
  })

  it("streams all three digests with the known vectors", async () => {
    renderTool()
    await pickFixture()

    expect(digestMock).toHaveBeenCalledTimes(3)
    expect(screen.getByText(fixtureDigests["sha-256"])).toBeInTheDocument()
    expect(screen.getByText(fixtureDigests["sha-1"])).toBeInTheDocument()
    expect(screen.getByText(fixtureDigests["sha-512"])).toBeInTheDocument()
    expect(screen.getByText("Computed 3 digests locally.")).toBeInTheDocument()
  })

  it("labels SHA-1 as legacy", async () => {
    renderTool()
    await pickFixture()
    expect(screen.getByText(/Legacy — not collision-secure/)).toBeInTheDocument()
  })

  it("passes each algorithm through the digest contract", async () => {
    renderTool()
    await pickFixture()
    const algorithms = digestMock.mock.calls.map((call) => call[1]?.algorithm)
    expect(algorithms).toEqual(["sha-256", "sha-1", "sha-512"])
  })

  it("reports cancelled picks without changing state", async () => {
    renderTool()
    pickMock.mockRejectedValue(new PlatformError("FILE_PICK_CANCELLED", "No file selected."))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Choose file" }))
    })
    expect(screen.getByText("No file selected.")).toBeInTheDocument()
    expect(digestMock).not.toHaveBeenCalled()
  })

  it("shows a distinct cancelled state when hashing is aborted", async () => {
    renderTool()
    digestMock.mockImplementation(
      (
        _file: PickedFile,
        _options: { algorithm: ContentDigestAlgorithm },
        signal?: AbortSignal,
      ) => {
        void _options
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            const cancelError = new Error("The operation was cancelled.")
            cancelError.name = "AbortError"
            reject(cancelError)
          })
        })
      },
    )
    pickMock.mockResolvedValue([{ name: "fixture.png", mimeType: "image/png", size: 70 }])

    // Start the digest; the first algorithm blocks until cancellation.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Choose file" }))
    })
    await act(async () => {})
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    })
    expect(screen.getByText("Hashing cancelled.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument()
  })

  it("surfaces digest failures as a recovery state", async () => {
    renderTool()
    digestMock.mockRejectedValue(
      new PlatformError("FILE_READ_FAILED", "The file could not be read."),
    )
    await pickFixture()
    expect(screen.getByText("The file could not be read.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument()
  })

  it("resets back to the initial state", async () => {
    renderTool()
    await pickFixture()
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(screen.getByText(/Pick any file up to 100.0 MB/)).toBeInTheDocument()
    expect(screen.getByText("File hash tool reset.")).toBeInTheDocument()
  })
})
