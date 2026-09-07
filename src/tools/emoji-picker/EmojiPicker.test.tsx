import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import EmojiPicker from "./EmojiPicker"

const writeText = vi.fn(async () => undefined)

beforeEach(() => {
  writeText.mockClear()
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { readText: vi.fn(async () => ""), writeText },
  })
})

function renderTool() {
  return render(
    <PlatformProvider>
      <EmojiPicker />
    </PlatformProvider>,
  )
}

describe("EmojiPicker", () => {
  it("renders every category by default", () => {
    renderTool()
    for (const name of ["Smileys", "Gestures", "Hearts", "Nature", "Tech", "Food", "Symbols"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument()
    }
  })

  it("writes the emoji to the clipboard when tapped", async () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Copy thumbs up" }))
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("👍"))
    await vi.waitFor(() => {
      expect(screen.getByRole("status", { name: "Copy status" }).textContent).toContain("thumbs up")
    })
  })

  it("scopes to the active category", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Food" }))
    expect(screen.queryByRole("heading", { name: "Smileys" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Food" })).toBeInTheDocument()
  })

  it("returns to every category from the All chip", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Food" }))
    fireEvent.click(screen.getByRole("button", { name: "All" }))
    expect(screen.getByRole("heading", { name: "Smileys" })).toBeInTheDocument()
  })

  it("filters by search text", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "fire" } })
    expect(screen.getByRole("heading", { name: "Nature" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Smileys" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copy fire" })).toBeInTheDocument()
  })

  it("shows an empty state for unmatched searches", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "zzzzz" } })
    expect(screen.getByText(/No emojis match/)).toBeInTheDocument()
  })

  it("announces a copy failure instead of staying silent", async () => {
    writeText.mockRejectedValueOnce(new Error("blocked"))
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Copy grinning" }))
    await vi.waitFor(() => {
      expect(screen.getByRole("status", { name: "Copy status" }).textContent).not.toBe("")
    })
  })
})
