import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import GridGenerator from "@/tools/grid-generator/GridGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <GridGenerator />
    </PlatformProvider>,
  )
}

function getPre(): HTMLElement | null {
  return document.querySelector("pre")
}

describe("Grid Generator interactions", () => {
  it("renders the default template declaration and copy affordance", () => {
    renderTool()
    expect(getPre()?.textContent).toBe(
      "display: grid;\ngrid-template-columns: 1fr 1fr 1fr;\ngrid-template-rows: auto;\ngap: 8px;",
    )
    expect(screen.getByRole("button", { name: "Copy CSS result" })).toBeVisible()
  })

  it("appends non-auto placements after the container", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("grid-column for Item 1"), {
      target: { value: "1 / 3" },
    })
    fireEvent.change(screen.getByLabelText("grid-row for Item 2"), { target: { value: "2" } })
    expect(getPre()?.textContent).toContain("/* Item 1 */ grid-column: 1 / 3;")
    expect(getPre()?.textContent).toContain("/* Item 2 */ grid-row: 2;")
  })

  it("skips an emptied template line instead of emitting a dangling declaration", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Rows"), { target: { value: "  " } })
    expect(getPre()?.textContent).not.toContain("grid-template-rows")
  })

  it("adds and removes grid items", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Add item" }))
    expect(screen.getByLabelText("grid-column for Item 7")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Remove Item 7" }))
    expect(screen.queryByLabelText("grid-column for Item 7")).not.toBeInTheDocument()
  })
})
