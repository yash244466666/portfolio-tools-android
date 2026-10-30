import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, vi } from "vitest"
import { App } from "@/app/App"
import { PlatformProvider } from "@/platform/platform-context"
import { isEnabledTool, tools } from "@/tools/registry"

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.location.hash = ""
  vi.restoreAllMocks()
})

describe("application shell", () => {
  it("renders the catalog with enabled and planned tools", async () => {
    render(
      <PlatformProvider>
        <App />
      </PlatformProvider>,
    )

    expect(
      screen.getByRole("heading", { name: "Useful tools, ready when you are" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Unit Converter" })).toBeInTheDocument()
    // A cut tool (ADR 0023) is no longer part of the catalog.
    expect(screen.queryByText("Markdown Preview")).not.toBeInTheDocument()
    const enabledCount = tools.filter(isEnabledTool).length
    expect(
      screen.getByLabelText(`${enabledCount} tools enabled in the foundation`),
    ).toBeInTheDocument()
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme"))
  })

  it("clears the catalog search with focus returned to the field", async () => {
    render(
      <PlatformProvider>
        <App />
      </PlatformProvider>,
    )

    const search = screen.getByRole("searchbox", { name: "Search tools" })
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: "hash" } })
    const clearButton = screen.getByRole("button", { name: "Clear search" })
    fireEvent.click(clearButton)

    expect(search).toHaveValue("")
    expect(search).toHaveFocus()
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Unit Converter" })).toBeInTheDocument()
  })

  it("clears the catalog search on Escape", async () => {
    render(
      <PlatformProvider>
        <App />
      </PlatformProvider>,
    )

    const search = screen.getByRole("searchbox", { name: "Search tools" })
    fireEvent.change(search, { target: { value: "hash" } })
    fireEvent.keyDown(search, { key: "Escape" })

    expect(search).toHaveValue("")
  })

  it("renders settings from a hash route", async () => {
    window.location.hash = "#/settings"
    render(
      <PlatformProvider>
        <App />
      </PlatformProvider>,
    )
    expect(screen.getByRole("heading", { name: "Your app, your device" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "System" })).toBeInTheDocument()
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme"))
  })

  it("states exact classes and counts before clearing local data", async () => {
    localStorage.setItem("yash-tools:v1:favorites", JSON.stringify(["unit-converter"]))
    localStorage.setItem("yash-tools:v1:recents", JSON.stringify(["unit-converter", "notes"]))
    localStorage.setItem(
      "yash-tools:v1:bookmarks:manager",
      JSON.stringify({ version: 1, bookmarks: [{}, {}] }),
    )
    window.location.hash = "#/settings"
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)

    render(
      <PlatformProvider>
        <App />
      </PlatformProvider>,
    )

    // Wait until the seeded favorite reaches the navigation badge so the
    // confirmation counts reflect loaded state.
    await screen.findAllByText("1")

    fireEvent.click(screen.getByRole("button", { name: "Clear local preferences" }))

    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1))
    const message = confirmSpy.mock.calls[0]?.[0] ?? ""
    expect(message).toContain("1 favorite")
    expect(message).toContain("2 recent tools")
    expect(message).toContain("your theme preference")
    expect(message).toContain("2 saved bookmarks")
    expect(message).toContain("This cannot be undone.")
    expect(message).not.toContain("scratchpad note")
    expect(message).not.toContain("exchange rates")
    expect(localStorage.getItem("yash-tools:v1:favorites")).not.toBeNull()
  })

  it("names every durable data class in the settings summary", async () => {
    window.location.hash = "#/settings"

    render(
      <PlatformProvider>
        <App />
      </PlatformProvider>,
    )

    // Section 12 requires the on-screen privacy summary to enumerate every
    // durable class. It previously listed four of seven and closed with an
    // affirmatively wrong "other tool input is not saved automatically".
    const summary = await screen.findByText(/This device can store/)
    const text = summary.textContent ?? ""
    for (const durableClass of [
      "theme",
      "favorites",
      "recent-tool IDs",
      "scratchpad note",
      "Pomodoro timer state",
      "cached exchange rates",
    ]) {
      expect(text).toContain(durableClass)
    }
    expect(text).toContain("never saves it automatically")
  })

  it("clears every durable class when the clear action is confirmed", async () => {
    localStorage.setItem("yash-tools:v1:favorites", JSON.stringify(["unit-converter"]))
    localStorage.setItem("yash-tools:v1:notes:scratchpad", JSON.stringify({ text: "test" }))
    window.location.hash = "#/settings"
    vi.spyOn(window, "confirm").mockReturnValue(true)

    render(
      <PlatformProvider>
        <App />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Clear local preferences" }))

    await waitFor(() => expect(localStorage.getItem("yash-tools:v1:notes:scratchpad")).toBeNull())
    // The favorites hook writes the emptied array back after clearing.
    const favorites = localStorage.getItem("yash-tools:v1:favorites")
    if (favorites !== null) expect(JSON.parse(favorites) as unknown[]).toEqual([])
  })

  it("shows stored recent tools in most-recent-first order", async () => {
    localStorage.setItem(
      "yash-tools:v1:recents",
      JSON.stringify(["qr-generator", "unit-converter", "removed-tool"]),
    )
    window.location.hash = "#/recent"

    render(
      <PlatformProvider>
        <App />
      </PlatformProvider>,
    )

    expect(screen.getByRole("heading", { name: "Recent tools" })).toBeInTheDocument()
    expect(await screen.findByLabelText("2 recent tools on this device")).toBeInTheDocument()
    const recentLinks = screen.getAllByRole("link", {
      name: /QR Generator|Unit Converter/,
    })
    expect(recentLinks.map((link) => link.textContent)).toEqual(["QR Generator", "Unit Converter"])
  })
})
