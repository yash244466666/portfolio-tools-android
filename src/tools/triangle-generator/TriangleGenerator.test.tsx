import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import TriangleGenerator from "@/tools/triangle-generator/TriangleGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <TriangleGenerator />
    </PlatformProvider>,
  )
}

describe("Triangle Generator interactions", () => {
  it("renders the default up triangle", () => {
    renderTool()
    const output = screen.getByText((_, element) => element?.tagName === "PRE")
    expect(output.textContent).toBe(
      "width: 0;\nheight: 0;\nborder-left: 50px solid transparent;\nborder-right: 50px solid transparent;\nborder-bottom: 100px solid #6366f1;",
    )
  })

  it("switches direction through the radio group", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "Right" }))
    expect(screen.getByText(/border-left: 100px solid #6366f1;/)).toBeVisible()
    fireEvent.click(screen.getByRole("radio", { name: "Down" }))
    expect(screen.getByText(/border-top: 100px solid #6366f1;/)).toBeVisible()
  })

  it("updates size and halves the width into the borders", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "60" } })
    expect(screen.getByText(/border-left: 30px solid transparent;/)).toBeVisible()
    fireEvent.change(screen.getByLabelText("Height"), { target: { value: "20" } })
    expect(screen.getByText(/border-bottom: 20px solid #6366f1;/)).toBeVisible()
  })
})
