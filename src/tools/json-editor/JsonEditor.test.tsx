import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type { GeneratedFile, PlatformServices } from "@/platform/contracts"
import type * as platformModule from "@/platform/services"
import JsonEditor from "@/tools/json-editor/JsonEditor"

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
      <JsonEditor />
    </PlatformProvider>,
  )
}

function typeJson(value: string) {
  fireEvent.change(screen.getByLabelText("JSON input"), { target: { value } })
}

beforeEach(() => {
  shareMock.mockClear().mockResolvedValue(undefined)
  saveAsMock.mockClear().mockResolvedValue(undefined)
})

describe("JSON Editor interactions", () => {
  it("starts empty and validates typed JSON", async () => {
    renderTool()
    expect(screen.getByText("The tree appears here once the JSON is valid.")).toBeInTheDocument()
    expect(screen.getByText("Empty")).toBeInTheDocument()

    typeJson('{"a":1}')
    await waitFor(() => expect(screen.getByText("Valid JSON")).toBeInTheDocument())

    typeJson("{")
    await waitFor(() => expect(screen.getByText("Invalid JSON")).toBeInTheDocument())
    expect(
      screen.getByText(/JSON input|position|JSON/i, { selector: "#json-input-error" }),
    ).toBeInTheDocument()
  })

  it("formats and minifies valid documents", async () => {
    renderTool()
    typeJson('{"a":[1,2]}')
    await waitFor(() => expect(screen.getByText("Valid JSON")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: "Format" }))
    await waitFor(() => {
      expect(screen.getByLabelText("JSON input")).toHaveValue('{\n  "a": [\n    1,\n    2\n  ]\n}')
      expect(screen.getByText("JSON formatted.")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Minify" }))
    await waitFor(() => {
      expect(screen.getByLabelText("JSON input")).toHaveValue('{"a":[1,2]}')
      expect(screen.getByText("JSON minified.")).toBeInTheDocument()
    })
  })

  it("keeps transform buttons disabled for invalid JSON", async () => {
    renderTool()
    typeJson("{ nope")
    await waitFor(() => expect(screen.getByText("Invalid JSON")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Format" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Minify" })).toBeDisabled()
  })

  it("inspects a valid document through the tree", async () => {
    renderTool()
    typeJson('{"user":{"name":"Ada"},"count":3}')
    await waitFor(() => expect(screen.getByText("Valid JSON")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("tab", { name: "Tree" }))
    // Root is rendered collapsed.
    expect(screen.getByRole("button", { name: "root" })).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(screen.getByRole("button", { name: "root" }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "root" })).toHaveAttribute("aria-expanded", "true")
    })
    expect(screen.getByRole("button", { name: "user" })).toBeInTheDocument()
    expect(screen.getByText("number · 3")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "user" }))
    await waitFor(() => expect(screen.getByText(/string · "Ada"/)).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "root" })).toHaveAttribute("aria-expanded", "false")
      expect(screen.queryByRole("button", { name: "user" })).not.toBeInTheDocument()
    })
  })

  it("shares the document through the platform file service", async () => {
    renderTool()
    typeJson('{"shared":true}')
    const shareButton = await screen.findByRole("button", { name: "Share JSON" })
    await waitFor(() => expect(shareButton).toBeEnabled())

    fireEvent.click(shareButton)
    await waitFor(() => expect(screen.getByText("JSON shared.")).toBeInTheDocument())
    expect(shareMock).toHaveBeenCalledTimes(1)
    const shared = shareMock.mock.calls[0]?.[0]
    expect(shared?.name).toBe("data.json")
    expect(shared?.mimeType).toBe("application/json")
    expect(shared?.encoding).toBe("utf8")
    expect(shared?.data).toBe('{"shared":true}')
  })

  it("rejects oversized input without parsing", async () => {
    renderTool()
    typeJson(`${"a".repeat(256 * 1024)}{"x":1}`)
    await waitFor(() =>
      expect(screen.getByText(/JSON input is limited to 256 KiB/)).toBeInTheDocument(),
    )
    expect(screen.getByText("Over the size limit")).toBeInTheDocument()
  })

  it("resets back to the empty state", async () => {
    renderTool()
    typeJson('{"reset":true}')
    await waitFor(() => expect(screen.getByText("Valid JSON")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    await waitFor(() => {
      expect(screen.getByLabelText("JSON input")).toHaveValue("")
      expect(screen.getByText("Empty")).toBeInTheDocument()
    })
  })
})
