import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type { PlatformServices } from "@/platform/contracts"
import type * as platformModule from "@/platform/services"
import UnicodeLookup from "@/tools/unicode-lookup/UnicodeLookup"

const writeClipboardMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    clipboard: {
      ...base.clipboard,
      writeText: writeClipboardMock,
    },
  }
  return { platformServices: services }
})

function renderTool() {
  return render(
    <PlatformProvider>
      <UnicodeLookup />
    </PlatformProvider>,
  )
}

describe("Unicode Lookup interactions", () => {
  it("renders the character grid with code points", () => {
    renderTool()
    expect(screen.getByRole("button", { name: "Copy Infinity (U+221E)" })).toBeVisible()
  })

  it("searches by name and copies the character", async () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search characters"), {
      target: { value: "infinity" },
    })
    expect(
      screen.queryByRole("button", { name: /Copy Latin Capital Letter A/ }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Copy Infinity (U+221E)" }))
    await vi.waitFor(() => expect(writeClipboardMock).toHaveBeenCalledWith("∞"))
  })

  it("searches by code point", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search characters"), {
      target: { value: "U+221E" },
    })
    expect(screen.getByRole("button", { name: "Copy Infinity (U+221E)" })).toBeVisible()
    expect(screen.queryByRole("button", { name: /Copy Euro Sign/ })).not.toBeInTheDocument()
  })

  it("restricts by category", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "Greek" }))
    expect(
      screen.getByRole("button", { name: "Copy Greek Small Letter Alpha (U+03B1)" }),
    ).toBeVisible()
    expect(screen.queryByRole("button", { name: "Copy Infinity (U+221E)" })).not.toBeInTheDocument()
  })

  it("shows an empty state when nothing matches", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search characters"), {
      target: { value: "zzzz" },
    })
    expect(screen.getByText(/No characters match/)).toBeVisible()
  })
})
