import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type { BoundedContent, PickedFile, PlatformServices } from "@/platform/contracts"
import type * as platformModule from "@/platform/services"
import { bookmarksStorageKey, type StoredBookmarks } from "./bookmarks"
import BookmarkManager from "./BookmarkManager"

const store = new Map<string, unknown>()
const pickMock = vi.hoisted(() => vi.fn(() => Promise.resolve([] as PickedFile[])))
const readContentMock = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({ size: 2, data: "e30=", encoding: "base64" } satisfies BoundedContent),
  ),
)
const saveAsMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const openMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    preferences: {
      ...base.preferences,
      get: vi.fn((key: string) => Promise.resolve((store.get(key) ?? null) as never)),
      set: vi.fn((key: string, value: never) => {
        store.set(key, value)
        return Promise.resolve()
      }),
      remove: vi.fn((key: string) => {
        store.delete(key)
        return Promise.resolve()
      }),
    },
    files: {
      ...base.files,
      pick: pickMock,
      readContent: readContentMock,
      saveAs: saveAsMock,
    },
    browser: { ...base.browser, open: openMock },
  }
  return { ...actual, platformServices: services }
})

function renderTool() {
  render(
    <PlatformProvider>
      <BookmarkManager />
    </PlatformProvider>,
  )
}

beforeEach(() => {
  store.clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("BookmarkManager", () => {
  it("starts empty and saves a bookmark with a normalized https URL", async () => {
    renderTool()
    await waitFor(() => expect(screen.getByText("No bookmarks yet. Add one above.")).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Docs" } })
    fireEvent.change(screen.getByLabelText("URL"), { target: { value: "example.com/page" } })
    fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "Docs, reference" } })
    fireEvent.click(screen.getByRole("button", { name: "Add bookmark" }))
    await waitFor(() => expect(screen.getByText("Saved Docs.")).toBeTruthy())
    expect(screen.getByText("https://example.com/page")).toBeTruthy()
    expect(screen.getByText("docs")).toBeTruthy()
    const stored = store.get(bookmarksStorageKey) as StoredBookmarks
    expect(stored.bookmarks[0]?.url).toBe("https://example.com/page")
    expect(stored.bookmarks[0]?.tags).toEqual(["docs", "reference"])
  })

  it("rejects a cleartext URL with a recovery message", async () => {
    renderTool()
    await waitFor(() => expect(screen.getByLabelText("Title")).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Insecure" } })
    fireEvent.change(screen.getByLabelText("URL"), { target: { value: "http://example.com" } })
    fireEvent.click(screen.getByRole("button", { name: "Add bookmark" }))
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Only https links can be saved.")
  })

  it("filters the list by search and opens through the external browser", async () => {
    store.set(bookmarksStorageKey, {
      schemaVersion: 1,
      bookmarks: [
        {
          id: "a",
          title: "Docs",
          url: "https://example.com/docs",
          tags: ["reference"],
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "b",
          title: "Inbox",
          url: "https://mail.example.com",
          tags: [],
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    })
    renderTool()
    await waitFor(() => expect(screen.getByText("Inbox")).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "mail" } })
    expect(screen.queryByText("Docs")).toBeNull()
    expect(screen.getByText("Inbox")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Open Inbox in the browser" }))
    await waitFor(() => expect(openMock).toHaveBeenCalled())
    const opened = new URL((openMock.mock.calls[0] as unknown as [URL])[0].toString())
    expect(opened.protocol).toBe("https:")
  })

  it("imports valid entries from a picked file and reports skips", async () => {
    readContentMock.mockResolvedValue({
      size: 60,
      data: btoa(
        JSON.stringify({
          bookmarks: [
            { title: "Imported", url: "https://imported.example" },
            { title: "Bad", url: "javascript:alert(1)" },
          ],
        }),
      ),
      encoding: "base64",
    } satisfies BoundedContent)
    pickMock.mockResolvedValue([{ name: "bookmarks.json", mimeType: "application/json", size: 60 }])
    renderTool()
    await waitFor(() => expect(screen.getByRole("button", { name: "Import JSON" })).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: "Import JSON" }))
    await waitFor(() =>
      expect(screen.getByText(/Imported 1 bookmark; 1 entry skipped\./)).toBeTruthy(),
    )
    expect(screen.getByText("Imported")).toBeTruthy()
  })
})
