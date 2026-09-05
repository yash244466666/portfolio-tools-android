import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach } from "vitest"
import { App } from "@/app/App"
import { PlatformProvider } from "@/platform/platform-context"

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.location.hash = ""
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
    expect(screen.getByText("Markdown Preview")).toBeInTheDocument()
    expect(screen.getByLabelText("3 tools enabled in the foundation")).toBeInTheDocument()
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme"))
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

  it("shows stored recent tools in most-recent-first order", async () => {
    localStorage.setItem(
      "yash-tools:v1:recents",
      JSON.stringify(["timestamp-converter", "unit-converter", "removed-tool"]),
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
      name: /Timestamp Converter|Unit Converter/,
    })
    expect(recentLinks.map((link) => link.textContent)).toEqual([
      "Timestamp Converter",
      "Unit Converter",
    ])
  })
})
