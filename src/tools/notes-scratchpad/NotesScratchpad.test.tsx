import { act, fireEvent, render, screen } from "@testing-library/react"
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
import NotesScratchpad from "@/tools/notes-scratchpad/NotesScratchpad"
import { migrateNote, notesStorageKey, serializeNote } from "./notes"

const store = vi.hoisted(() => new Map<string, unknown>())
const setBehavior = vi.hoisted(() => ({
  failure: null as Error | null,
  gate: null as Promise<void> | null,
}))
const getBehavior = vi.hoisted(() => ({ failure: null as Error | null }))
const pickMock = vi.hoisted(() => vi.fn(() => Promise.resolve([] as PickedFile[])))
const readContentMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ size: 0, data: "", encoding: "base64" } satisfies BoundedContent)),
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

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    preferences: {
      get: <T,>(key: string): Promise<T | null> => {
        if (getBehavior.failure) return Promise.reject(getBehavior.failure)
        return Promise.resolve((store.get(key) as T | undefined) ?? null)
      },
      set: <T,>(key: string, value: T): Promise<void> => {
        if (setBehavior.failure) {
          const failure = setBehavior.failure
          return Promise.reject(failure)
        }
        if (setBehavior.gate) {
          const gate = setBehavior.gate
          return gate.then(() => {
            store.set(key, value)
          })
        }
        store.set(key, value)
        return Promise.resolve()
      },
      remove: (key: string): Promise<void> => {
        store.delete(key)
        return Promise.resolve()
      },
      clear: (): Promise<void> => {
        store.clear()
        return Promise.resolve()
      },
    },
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
      <NotesScratchpad />
    </PlatformProvider>,
  )
}

/** Renders and flushes the initial durable-note load. */
async function renderLoadedTool() {
  renderTool()
  await act(async () => {})
}

/** Types text and flushes the autosave debounce. */
async function typeNote(value: string) {
  fireEvent.change(screen.getByLabelText("Scratchpad"), { target: { value } })
  await act(async () => {
    vi.advanceTimersByTime(600)
  })
}

function storedNote() {
  const migrated = migrateNote(store.get(notesStorageKey))
  expect(migrated.status).toBe("ok")
  if (migrated.status !== "ok") throw new Error("expected a stored note")
  return migrated.note
}

beforeEach(() => {
  vi.useFakeTimers()
  store.clear()
  setBehavior.failure = null
  setBehavior.gate = null
  getBehavior.failure = null
  pickMock.mockClear().mockResolvedValue([])
  readContentMock.mockClear().mockResolvedValue({
    size: 0,
    data: "",
    encoding: "base64",
  } satisfies BoundedContent)
  shareMock.mockClear().mockResolvedValue(undefined)
  saveAsMock.mockClear().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("Notes scratchpad interactions", () => {
  it("loads a stored note and shows its saved state", async () => {
    store.set(notesStorageKey, serializeNote("durable note", new Date("2026-09-06T12:00:00Z")))
    await renderLoadedTool()

    expect(screen.getByLabelText("Scratchpad")).toHaveValue("durable note")
    expect(screen.getByText(/Last saved/)).toBeInTheDocument()
  })

  it("starts empty when nothing durable exists", async () => {
    await renderLoadedTool()
    expect(screen.getByLabelText("Scratchpad")).toHaveValue("")
    expect(screen.getByLabelText("Scratchpad")).toBeEnabled()
  })

  it("autosaves typed text through the preference store", async () => {
    await renderLoadedTool()

    await typeNote("fresh note")
    expect(storedNote().text).toBe("fresh note")
  })

  it("does not save identical text twice or before typing settles", async () => {
    store.set(notesStorageKey, serializeNote("stable", new Date()))
    await renderLoadedTool()

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(storedNote().text).toBe("stable")
    expect(store.size).toBe(1)
  })

  it("flushes a pending autosave when the tool unmounts", async () => {
    store.set(notesStorageKey, serializeNote("old", new Date()))
    const view = render(
      <PlatformProvider>
        <NotesScratchpad />
      </PlatformProvider>,
    )
    await act(async () => {})

    fireEvent.change(screen.getByLabelText("Scratchpad"), { target: { value: "last edit" } })
    view.unmount()
    await act(async () => {})

    expect(storedNote().text).toBe("last edit")
  })

  it("reports a failed autosave without dropping the latest text", async () => {
    await renderLoadedTool()
    setBehavior.failure = new Error("storage unavailable")

    await typeNote("unsaved edit")

    expect(screen.getByText(/Autosave failed/)).toBeInTheDocument()
    expect(screen.getByLabelText("Scratchpad")).toHaveValue("unsaved edit")
    expect(store.has(notesStorageKey)).toBe(false)
  })

  it("cancels a pending autosave when the note is cleared", async () => {
    await renderLoadedTool()

    fireEvent.change(screen.getByLabelText("Scratchpad"), { target: { value: "race" } })
    fireEvent.click(screen.getByRole("button", { name: "Clear note" }))
    fireEvent.click(screen.getByRole("button", { name: "Tap again to confirm" }))
    await act(async () => {
      vi.advanceTimersByTime(600)
    })
    await act(async () => {})

    expect(store.has(notesStorageKey)).toBe(false)
    expect(screen.getByLabelText("Scratchpad")).toHaveValue("")
  })

  it("waits for an in-flight write before removing the stored note", async () => {
    await renderLoadedTool()
    let releaseWrite: () => void = () => undefined
    setBehavior.gate = new Promise<void>((resolve) => {
      releaseWrite = resolve
    })

    fireEvent.change(screen.getByLabelText("Scratchpad"), { target: { value: "in flight" } })
    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    fireEvent.click(screen.getByRole("button", { name: "Clear note" }))
    fireEvent.click(screen.getByRole("button", { name: "Tap again to confirm" }))
    await act(async () => {})
    expect(store.has(notesStorageKey)).toBe(false)

    releaseWrite()
    await act(async () => {})
    expect(store.has(notesStorageKey)).toBe(false)
  })

  it("clears the note only after an explicit two-step confirmation", async () => {
    store.set(notesStorageKey, serializeNote("keep me", new Date()))
    await renderLoadedTool()

    fireEvent.click(screen.getByRole("button", { name: "Clear note" }))
    expect(store.has(notesStorageKey)).toBe(true)
    expect(screen.getByRole("button", { name: "Tap again to confirm" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Tap again to confirm" }))
    await act(async () => {})
    expect(store.has(notesStorageKey)).toBe(false)
    expect(screen.getByLabelText("Scratchpad")).toHaveValue("")
    expect(screen.getByText("Note cleared from this device.")).toBeInTheDocument()
  })

  it("refuses to persist oversized text and keeps the previous note", async () => {
    store.set(notesStorageKey, serializeNote("previous", new Date()))
    await renderLoadedTool()

    await typeNote(`${"a".repeat(256 * 1024)}!`)
    expect(screen.getByText(/exceeds the 256 KiB limit/)).toBeInTheDocument()
    expect(storedNote().text).toBe("previous")
  })

  it("blocks editing when the saved note cannot be read", async () => {
    getBehavior.failure = new Error("read failed")
    await renderLoadedTool()

    expect(screen.getByText(/could not be read/)).toBeInTheDocument()
    expect(screen.getByLabelText("Scratchpad")).toBeDisabled()
    expect(store.has(notesStorageKey)).toBe(false)
  })

  it("keeps a newer-schema note untouched and blocks editing", async () => {
    store.set(notesStorageKey, { schemaVersion: 2 })
    await renderLoadedTool()

    expect(screen.getByText(/written by a newer app version/)).toBeInTheDocument()
    expect(screen.getByLabelText("Scratchpad")).toBeDisabled()
    expect(store.get(notesStorageKey)).toEqual({ schemaVersion: 2 })
  })

  it("imports a picked text file through the two-step confirmation", async () => {
    await renderLoadedTool()
    const importedText = "imported note"
    pickMock.mockResolvedValue([
      { name: "note.txt", mimeType: "text/plain", size: importedText.length },
    ])
    readContentMock.mockResolvedValue({
      size: importedText.length,
      data: btoa(importedText),
      encoding: "base64",
    } satisfies BoundedContent)

    fireEvent.click(screen.getByRole("button", { name: "Import text file" }))
    fireEvent.click(screen.getByRole("button", { name: "Tap again to replace the note" }))
    await act(async () => {})

    expect(screen.getByLabelText("Scratchpad")).toHaveValue("imported note")
    expect(screen.getByText(/Imported 13 characters/)).toBeInTheDocument()

    await typeNote("imported note")
    expect(storedNote().text).toBe("imported note")
  })

  it("reports cancelled imports without changing the note", async () => {
    await renderLoadedTool()
    // The real adapter converts picker cancellation into this typed platform error.
    pickMock.mockRejectedValue(new PlatformError("FILE_PICK_CANCELLED", "No file selected."))

    fireEvent.click(screen.getByRole("button", { name: "Import text file" }))
    fireEvent.click(screen.getByRole("button", { name: "Tap again to replace the note" }))
    await act(async () => {})

    expect(pickMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText("No file selected.")).toBeInTheDocument()
    expect(screen.getByLabelText("Scratchpad")).toHaveValue("")
  })

  it("shares the note as a UTF-8 text file", async () => {
    await renderLoadedTool()
    await typeNote("share me")

    fireEvent.click(screen.getByRole("button", { name: "Share note" }))
    await act(async () => {})

    expect(screen.getByText("Note shared.")).toBeInTheDocument()
    expect(shareMock).toHaveBeenCalledTimes(1)
    const shared = shareMock.mock.calls[0]?.[0]
    expect(shared?.name).toBe("scratchpad.txt")
    expect(shared?.mimeType).toBe("text/plain")
    expect(shared?.encoding).toBe("utf8")
    expect(shared?.data).toBe("share me")
  })
})
