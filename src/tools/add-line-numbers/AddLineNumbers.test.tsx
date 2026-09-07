import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import AddLineNumbers from "@/tools/add-line-numbers/AddLineNumbers"

function resultText(value: string) {
  return screen.getByText((_, element) => element?.tagName === "P" && element.textContent === value)
}

describe("Add Line Numbers interactions", () => {
  it("numbers lines with the selected separator and padding", () => {
    render(
      <PlatformProvider>
        <AddLineNumbers />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "a\nb\nc" } })
    expect(resultText("1. a\n2. b\n3. c")).toBeVisible()

    fireEvent.click(screen.getByLabelText("None"))
    expect(resultText("1. a\n2. b\n3. c")).toBeVisible()

    fireEvent.click(screen.getByLabelText("Auto (align)"))
    fireEvent.change(screen.getByLabelText("Start number"), { target: { value: "9" } })
    expect(resultText(" 9. a\n10. b\n11. c")).toBeVisible()
  })

  it("uses a custom separator when selected", () => {
    render(
      <PlatformProvider>
        <AddLineNumbers />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "a\nb" } })
    fireEvent.click(screen.getByLabelText("Custom"))
    fireEvent.change(screen.getByLabelText("Custom separator"), { target: { value: " => " } })
    expect(resultText("1 => a\n2 => b")).toBeVisible()
  })

  it("rejects an invalid start number with recovery guidance", () => {
    render(
      <PlatformProvider>
        <AddLineNumbers />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "a\nb" } })
    fireEvent.change(screen.getByLabelText("Start number"), { target: { value: "-4" } })
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      /whole number between 0 and 999,999,999/,
    )
  })

  it("rejects input beyond the character limit", () => {
    render(
      <PlatformProvider>
        <AddLineNumbers />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "a".repeat(1_000_001) } })
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("1,000,000 character limit")
  })
})
