import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import BoxShadowGenerator from "@/tools/box-shadow-generator/BoxShadowGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <BoxShadowGenerator />
    </PlatformProvider>,
  )
}

describe("Box Shadow Generator interactions", () => {
  it("renders the default declaration and copy affordance", () => {
    renderTool()
    expect(screen.getByText("box-shadow: 4px 4px 12px 0px rgba(99, 102, 241, 0.3);")).toBeVisible()
    expect(screen.getByRole("button", { name: "Copy CSS result" })).toBeVisible()
  })

  it("rebuilds the declaration from slider changes", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Blur"), { target: { value: "30" } })
    fireEvent.change(screen.getByLabelText("Spread"), { target: { value: "-5" } })
    expect(screen.getByText("box-shadow: 4px 4px 30px -5px rgba(99, 102, 241, 0.3);")).toBeVisible()
  })

  it("reports invalid hex text without emitting broken CSS", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Color"), { target: { value: "#zzz" } })
    expect(screen.getByText(/Enter six hexadecimal digits/)).toBeVisible()
    expect(screen.getByText(/Fix the color to see the CSS./)).toBeVisible()
    expect(screen.queryByRole("button", { name: "Copy CSS result" })).not.toBeInTheDocument()
  })

  it("formats the opacity slider as percent text", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Opacity"), { target: { value: "100" } })
    expect(screen.getByText("100%")).toBeVisible()
    expect(screen.getByText("box-shadow: 4px 4px 12px 0px rgba(99, 102, 241, 1);")).toBeVisible()
  })
})
