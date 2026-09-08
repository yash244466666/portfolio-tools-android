import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import SvgOptimizer from "./SvgOptimizer"

const sample = [
  "<!-- comment -->",
  '<svg xmlns="http://www.w3.org/2000/svg">',
  "  <text>hello</text>",
  "</svg>",
].join("\n")

function renderTool() {
  render(
    <PlatformProvider>
      <SvgOptimizer />
    </PlatformProvider>,
  )
}

describe("SvgOptimizer interactions", () => {
  it("minifies pasted SVG and reports the size change", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("SVG input"), { target: { value: sample } })
    fireEvent.click(screen.getByRole("button", { name: "Minify" }))
    expect(document.querySelector("pre")?.textContent).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg"><text>hello</text></svg>',
    )
    expect(screen.getByText(/becomes/)).toBeVisible()
  })

  it("pretty-prints pasted SVG with indentation", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("SVG input"), {
      target: { value: '<svg xmlns="http://www.w3.org/2000/svg"><text>hello</text></svg>' },
    })
    fireEvent.click(screen.getByRole("button", { name: "Pretty print" }))
    expect(document.querySelector("pre")?.textContent).toContain("\n  <text>")
  })

  it("shows the parse error near the control and produces no output", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("SVG input"), {
      target: { value: "<svg><text>x</svg>" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Minify" }))
    expect(screen.getByRole("alert")).toHaveTextContent("not well-formed XML")
    expect(screen.queryByText("Result")).toBeNull()
  })

  it("clears the tool back to its empty state", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("SVG input"), { target: { value: sample } })
    fireEvent.click(screen.getByRole("button", { name: "Minify" }))
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.queryByText("Result")).toBeNull()
  })
})
