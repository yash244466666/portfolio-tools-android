import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import CaseConverter from "@/tools/case-converter/CaseConverter"

function typeText(value: string) {
  fireEvent.change(screen.getByLabelText("Text"), { target: { value } })
}

describe("Case Converter interactions", () => {
  it("shows all eight conversions with always-visible copy buttons", () => {
    render(
      <PlatformProvider>
        <CaseConverter />
      </PlatformProvider>,
    )

    expect(
      screen.getByText(/Enter text above to see it as UPPERCASE/i),
    ).toBeVisible()

    typeText("hello world")
    expect(screen.getByText("helloWorld")).toBeVisible()
    expect(screen.getByText("HELLO WORLD")).toBeVisible()
    expect(screen.getByText("Hello World")).toBeVisible()
    expect(screen.getByText("hello_world")).toBeVisible()
    expect(screen.getByText("hello-world")).toBeVisible()

    // Regression: the upstream copy buttons only appeared on hover, which is
    // unusable on touch devices.
    expect(screen.getAllByRole("button", { name: /^Copy result$/i })).toHaveLength(8)
  })

  it("shows an em dash for empty conversion output", () => {
    render(
      <PlatformProvider>
        <CaseConverter />
      </PlatformProvider>,
    )

    typeText("!!! ???")
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("rejects input beyond the character limit instead of converting", () => {
    render(
      <PlatformProvider>
        <CaseConverter />
      </PlatformProvider>,
    )

    typeText("a".repeat(100_001))
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("100,000 character limit")
    expect(screen.queryByRole("button", { name: /^Copy result$/i })).not.toBeInTheDocument()
  })
})