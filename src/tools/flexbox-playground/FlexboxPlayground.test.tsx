import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import FlexboxPlayground from "@/tools/flexbox-playground/FlexboxPlayground"

function renderTool() {
  return render(
    <PlatformProvider>
      <FlexboxPlayground />
    </PlatformProvider>,
  )
}

function getPre(): HTMLElement | null {
  return document.querySelector("pre")
}

describe("Flexbox Playground interactions", () => {
  it("renders the default container declaration and copy affordance", () => {
    renderTool()
    expect(getPre()?.textContent).toBe(
      "display: flex;\nflex-direction: row;\njustify-content: flex-start;\nalign-items: stretch;\nflex-wrap: nowrap;\ngap: 8px;",
    )
    expect(screen.getByRole("button", { name: "Copy CSS result" })).toBeVisible()
  })

  it("rebuilds the declaration from control changes", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "column" }))
    fireEvent.click(screen.getByRole("radio", { name: "space-between" }))
    fireEvent.change(screen.getByLabelText("Gap (px)"), { target: { value: "24" } })
    expect(getPre()?.textContent).toContain("flex-direction: column;")
    expect(getPre()?.textContent).toContain("justify-content: space-between;")
    expect(getPre()?.textContent).toContain("gap: 24px;")
  })

  it("adds and removes flex items with unique controls", () => {
    renderTool()
    expect(screen.getByLabelText("Grow for Item 1")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Add item" }))
    expect(screen.getByLabelText("Grow for Item 4")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Remove Item 4" }))
    expect(screen.queryByLabelText("Grow for Item 4")).not.toBeInTheDocument()
  })

  it("clamps item factors and previews a bounded basis", () => {
    renderTool()
    const grow = screen.getByLabelText("Grow for Item 1")
    fireEvent.change(grow, { target: { value: "9" } })
    expect(screen.getByLabelText("Grow for Item 1")).toHaveValue("5")
    const basis = screen.getByLabelText("Basis for Item 1")
    fireEvent.change(basis, { target: { value: "calc(1rem)" } })
    expect(basis).toHaveValue("calc(1rem)")
  })
})
