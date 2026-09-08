import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import NeumorphismGenerator from "@/tools/neumorphism-generator/NeumorphismGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <NeumorphismGenerator />
    </PlatformProvider>,
  )
}

describe("Neumorphism Generator interactions", () => {
  it("renders the default convex declaration and copy affordance", () => {
    renderTool()
    expect(
      screen.getByText(
        /background: linear-gradient\(145deg, rgb\(54, 54, 54\), rgb\(30, 30, 30\)\);/,
      ),
    ).toBeVisible()
    expect(
      screen.getByText(
        /box-shadow: 8px 8px 16px rgb\(12, 12, 12\), -8px -8px 16px rgb\(72, 72, 72\);/,
      ),
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Copy CSS result" })).toBeVisible()
  })

  it("switches to the pressed variant with inset shadows", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "Pressed" }))
    expect(
      screen.getByText(
        /box-shadow: inset 8px 8px 16px rgb\(12, 12, 12\), inset -8px -8px 16px rgb\(72, 72, 72\);/,
      ),
    ).toBeVisible()
    expect(screen.queryByText(/linear-gradient/)).not.toBeInTheDocument()
  })

  it("rebuilds the declaration from slider changes", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Shadow distance (px)"), { target: { value: "12" } })
    fireEvent.change(screen.getByLabelText("Shadow intensity"), { target: { value: "50" } })
    expect(
      screen.getByText(
        /box-shadow: 12px 12px 24px rgb\(0, 0, 0\), -12px -12px 24px rgb\(92, 92, 92\);/,
      ),
    ).toBeVisible()
  })

  it("suppresses the CSS for an invalid color and recovers", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Base color"), { target: { value: "zzz" } })
    expect(screen.getByText(/Fix the base color to a six-digit hex value/)).toBeVisible()
    expect(screen.queryByRole("button", { name: "Copy CSS result" })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Base color"), { target: { value: "#abcdef" } })
    expect(screen.getByText(/background: #abcdef;/)).toBeVisible()
  })
})
