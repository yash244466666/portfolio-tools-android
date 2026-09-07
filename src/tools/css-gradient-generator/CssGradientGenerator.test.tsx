import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import CssGradientGenerator from "./CssGradientGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <CssGradientGenerator />
    </PlatformProvider>,
  )
}

function cssText() {
  const pre = document.querySelector("pre")
  return pre === null ? "" : (pre.textContent ?? "")
}

describe("CssGradientGenerator", () => {
  it("renders the default linear gradient declaration", () => {
    renderTool()
    expect(cssText()).toBe("background: linear-gradient(135deg, #6366f1, #06b6d4);")
  })

  it("switches to conic and keeps the angle", () => {
    renderTool()
    fireEvent.click(screen.getByLabelText("conic"))
    expect(cssText()).toBe("background: conic-gradient(from 135deg, #6366f1, #06b6d4);")
  })

  it("hides the angle slider for radial gradients", () => {
    renderTool()
    expect(screen.getByLabelText("Angle")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("radial"))
    expect(screen.queryByLabelText("Angle")).not.toBeInTheDocument()
    expect(cssText()).toBe("background: radial-gradient(circle, #6366f1, #06b6d4);")
  })

  it("updates the gradient when a color changes", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Color 1"), { target: { value: "#ff0000" } })
    expect(cssText()).toBe("background: linear-gradient(135deg, #ff0000, #06b6d4);")
  })

  it("adds and removes an optional third color", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(cssText()).toBe("background: linear-gradient(135deg, #6366f1, #06b6d4, #f59e0b);")
    fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    expect(cssText()).toBe("background: linear-gradient(135deg, #6366f1, #06b6d4);")
  })

  it("asks for at least two colors before emitting CSS", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Color 1"), { target: { value: "" } })
    expect(screen.getAllByText("Add at least two colors.").length).toBeGreaterThan(0)
  })

  it("rejects a malformed color without emitting CSS", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Color 2"), { target: { value: "blue" } })
    expect(screen.getAllByText(/six-digit hex/).length).toBeGreaterThan(0)
  })
})
