import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import GradientBorderGenerator from "@/tools/gradient-border-generator/GradientBorderGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <GradientBorderGenerator />
    </PlatformProvider>,
  )
}

describe("Gradient Border Generator interactions", () => {
  it("renders the documented snippet for the defaults", () => {
    renderTool()
    expect(screen.getByText(/gradient-border::before/)).toBeVisible()
    expect(screen.getByText(/linear-gradient\(135deg, #6366f1, #06b6d4\)/)).toBeVisible()
    expect(screen.getByRole("button", { name: "Copy CSS result" })).toBeVisible()
  })

  it("interpolates the angle and border width knobs", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Angle"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("Border width"), { target: { value: "10" } })
    expect(screen.getByText(/linear-gradient\(0deg, #6366f1, #06b6d4\)/)).toBeVisible()
    expect(screen.getByText(/padding: 10px;/)).toBeVisible()
  })

  it("changes colors from the hex fields", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Start color"), { target: { value: "#ff0000" } })
    fireEvent.change(screen.getByLabelText("End color"), { target: { value: "00ff00" } })
    expect(screen.getByText(/linear-gradient\(135deg, #ff0000, #00ff00\)/)).toBeVisible()
  })
})
