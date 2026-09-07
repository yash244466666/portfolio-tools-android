import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import TrimWhitespace from "@/tools/trim-whitespace/TrimWhitespace"

function resultText(value: string) {
  return screen.getByText((_, element) => element?.tagName === "P" && element.textContent === value)
}

describe("Trim Whitespace interactions", () => {
  it("trims leading and trailing whitespace by default and reports savings", () => {
    render(
      <PlatformProvider>
        <TrimWhitespace />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "  a  \n\tb\t" } })
    expect(resultText("a\nb")).toBeVisible()
    expect(screen.getByText(/Before: 9 · After: 3 · Saved: 6 characters/)).toBeVisible()
  })

  it("collapses space runs and removes blank lines on request", () => {
    render(
      <PlatformProvider>
        <TrimWhitespace />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "a  b\n\n  c" },
    })
    // Leading/trailing trimming stays on from the defaults; collapse and
    // blank-line removal are additive.
    fireEvent.click(screen.getByLabelText("Collapse multiple spaces"))
    fireEvent.click(screen.getByLabelText("Remove blank lines"))
    expect(resultText("a b\nc")).toBeVisible()
  })

  it("rejects input beyond the character limit", () => {
    render(
      <PlatformProvider>
        <TrimWhitespace />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "a".repeat(1_000_001) } })
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("1,000,000 character limit")
    expect(screen.getAllByText(/Shorten it to trim/).length).toBeGreaterThan(0)
  })
})
