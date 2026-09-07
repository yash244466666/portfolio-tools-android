import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import ColorBlindnessSimulator from "@/tools/color-blindness-simulator/ColorBlindnessSimulator"

function renderTool() {
  return render(
    <PlatformProvider>
      <ColorBlindnessSimulator />
    </PlatformProvider>,
  )
}

describe("Color Blindness Simulator interactions", () => {
  it("simulates the default color for protanopia", () => {
    renderTool()
    // Protanopia matrix on #4287f5 rounds to RGB(96, 96, 218) = #6060da.
    expect(screen.getAllByText("#6060DA").length).toBeGreaterThan(0)
    expect(screen.getByText(/Original: RGB\(66, 135, 245\)/)).toBeVisible()
    expect(screen.getByText(/Protanopia: RGB\(96, 96, 218\)/)).toBeVisible()
  })

  it("switches to achromatopsia and shows the grayscale result", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: /Achromatopsia/ }))
    // 0.299·66 + 0.587·135 + 0.114·245 rounds to 127 → #7F7F7F.
    expect(screen.getByText(/Achromatopsia: RGB\(127, 127, 127\)/)).toBeVisible()
    expect(screen.getAllByText("#7F7F7F").length).toBeGreaterThan(0)
  })

  it("rejects invalid hex input with a recovery hint", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Hex color"), { target: { value: "#zz8" } })
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter six hexadecimal digits, for example 4287f5.",
    )
  })

  it("accepts hex input without the leading hash", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Hex color"), { target: { value: "ff0000" } })
    expect(screen.getByText(/Original: RGB\(255, 0, 0\)/)).toBeVisible()
  })

  it("discloses that the simulation is not a diagnostic", () => {
    renderTool()
    expect(screen.getByText(/not a medical diagnostic tool/)).toBeVisible()
  })
})
