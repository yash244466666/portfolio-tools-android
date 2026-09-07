import { fireEvent, render, screen, within } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import TextShadowGenerator from "@/tools/text-shadow-generator/TextShadowGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <TextShadowGenerator />
    </PlatformProvider>,
  )
}

describe("Text Shadow Generator interactions", () => {
  it("renders the single default layer declaration", () => {
    renderTool()
    expect(screen.getByText("text-shadow: 2px 2px 4px #6366f1;")).toBeVisible()
  })

  it("adds and removes layers", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Add shadow layer" }))
    expect(screen.getByText(/, 2px 2px 4px #6366f1;/)).toBeVisible()
    expect(screen.getByRole("group", { name: "Layer 2" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Remove layer 2" }))
    expect(screen.getByText("text-shadow: 2px 2px 4px #6366f1;")).toBeVisible()
  })

  it("keeps the remove button hidden while only one layer exists", () => {
    renderTool()
    expect(screen.queryByRole("button", { name: /Remove layer/ })).not.toBeInTheDocument()
  })

  it("stops adding layers at the documented limit", () => {
    renderTool()
    for (let index = 0; index < 7; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Add shadow layer" }))
    }
    expect(screen.getByRole("group", { name: "Layer 8" })).toBeVisible()
    expect(screen.getByText(/Layer limit reached/)).toBeVisible()
    const add = screen.getByRole("button", { name: "Add shadow layer" })
    expect(add).toBeDisabled()
    const output = screen.getByText(
      (_, element) =>
        element?.tagName === "P" &&
        element.textContent ===
          "text-shadow: 2px 2px 4px #6366f1, 2px 2px 4px #6366f1, 2px 2px 4px #6366f1, 2px 2px 4px #6366f1, 2px 2px 4px #6366f1, 2px 2px 4px #6366f1, 2px 2px 4px #6366f1, 2px 2px 4px #6366f1;",
    )
    expect(output).toBeVisible()
  })

  it("changes a layer's slider values", () => {
    renderTool()
    const firstLayer = screen.getByRole("group", { name: /Layer 1/ })
    fireEvent.change(within(firstLayer).getByLabelText("Offset X"), { target: { value: "-10" } })
    expect(screen.getByText("text-shadow: -10px 2px 4px #6366f1;")).toBeVisible()
  })
})
