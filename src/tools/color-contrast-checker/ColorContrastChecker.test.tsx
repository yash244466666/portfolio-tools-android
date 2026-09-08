import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import ColorContrastChecker from "./ColorContrastChecker"

function renderTool() {
  render(
    <PlatformProvider>
      <ColorContrastChecker />
    </PlatformProvider>,
  )
}

function fill(first: string, second: string) {
  fireEvent.change(screen.getByLabelText("First color (hex)"), { target: { value: first } })
  fireEvent.change(screen.getByLabelText("Second color (hex)"), { target: { value: second } })
}

describe("ColorContrastChecker", () => {
  it("starts with default colors and shows the ratio in the status", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/contrast ratio is 4.48:1/i)
  })

  it("reports every WCAG target as text labels in a table", () => {
    renderTool()
    fill("#ffffff", "#777777")
    const table = screen.getByRole("table")
    expect(table).toHaveTextContent("AAA normal text")
    expect(table).toHaveTextContent("Pass")
    expect(table).toHaveTextContent("Fail")
  })

  it("computes black on white at 21:1", () => {
    renderTool()
    fill("#000000", "#ffffff")
    expect(screen.getByRole("status")).toHaveTextContent(/21:1/)
  })

  it("rejects non-hex input with a visible alert", () => {
    renderTool()
    fill("white", "#000000")
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a hex color/i)
    expect(screen.getByRole("status")).toHaveTextContent(/fix the highlighted color/i)
  })

  it("swaps the two colors with the palette-swap button", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /swap colors/i }))
    expect(screen.getByLabelText("First color (hex)")).toHaveValue("#777777")
    expect(screen.getByLabelText("Second color (hex)")).toHaveValue("#ffffff")
  })

  it("renders the sample preview with the actual colors", () => {
    renderTool()
    const sample = screen.getByLabelText(/sample text in the entered colors/i)
    expect(sample).toHaveStyle({ color: "#ffffff", backgroundColor: "#777777" })
  })
})
