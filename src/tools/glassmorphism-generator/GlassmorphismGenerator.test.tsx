import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import GlassmorphismGenerator from "@/tools/glassmorphism-generator/GlassmorphismGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <GlassmorphismGenerator />
    </PlatformProvider>,
  )
}

describe("Glassmorphism Generator interactions", () => {
  it("renders the default declaration with both filter prefixes", () => {
    renderTool()
    expect(screen.getByText(/backdrop-filter: blur\(10px\);/)).toBeVisible()
    expect(screen.getByText(/-webkit-backdrop-filter: blur\(10px\);/)).toBeVisible()
    expect(screen.getByText(/background: rgba\(255, 255, 255, 0.2\);/)).toBeVisible()
    expect(screen.getByRole("button", { name: "Copy CSS result" })).toBeVisible()
  })

  it("rebuilds the declaration from slider changes", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Blur (px)"), { target: { value: "25" } })
    fireEvent.change(screen.getByLabelText("Border radius (px)"), { target: { value: "40" } })
    expect(screen.getByText(/backdrop-filter: blur\(25px\);/)).toBeVisible()
    expect(screen.getByText(/border-radius: 40px;/)).toBeVisible()
  })

  it("suppresses the CSS for an invalid color and recovers", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Background color"), { target: { value: "#12" } })
    expect(screen.getByText(/Fix both colors to six-digit hex values/)).toBeVisible()
    expect(screen.queryByRole("button", { name: "Copy CSS result" })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Background color"), { target: { value: "#123456" } })
    expect(screen.getByText(/background: rgba\(18, 52, 86, 0.2\);/)).toBeVisible()
  })

  it("accepts an unprefixed hex color", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Border color"), { target: { value: "f0f0f0" } })
    expect(screen.getByText(/border: 1px solid f0f0f0;/)).toBeVisible()
  })
})
