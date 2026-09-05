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
})
