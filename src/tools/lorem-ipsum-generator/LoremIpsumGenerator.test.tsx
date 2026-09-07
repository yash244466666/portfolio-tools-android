import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import LoremIpsumGenerator from "@/tools/lorem-ipsum-generator/LoremIpsumGenerator"

function outputValue() {
  const element = screen.getByLabelText("Generated text")
  return element instanceof HTMLTextAreaElement ? element.value : ""
}

describe("Lorem Ipsum Generator interactions", () => {
  it("generates three paragraphs by default with a blank line between blocks", () => {
    render(
      <PlatformProvider>
        <LoremIpsumGenerator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(outputValue().split("\n\n")).toHaveLength(3)
    expect(screen.getByText(/Generated 3 paragraphs\./i)).toBeVisible()
  })

  it("generates the requested number of sentences when the unit changes", () => {
    render(
      <PlatformProvider>
        <LoremIpsumGenerator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("radio", { name: "Sentences" }))
    fireEvent.change(screen.getByLabelText("Count"), { target: { value: "5" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(outputValue().split(".")).toHaveLength(6) // 5 sentences + trailing empty
  })

  it("shows an error and disables Generate for an invalid count", () => {
    render(
      <PlatformProvider>
        <LoremIpsumGenerator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Count"), { target: { value: "abc" } })
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled()
    expect(screen.getByText("Enter a whole number of 1 or more.")).toBeVisible()
  })

  it("clears stale output when settings change", () => {
    render(
      <PlatformProvider>
        <LoremIpsumGenerator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(outputValue()).not.toBe("")
    fireEvent.change(screen.getByLabelText("Count"), { target: { value: "2" } })
    expect(outputValue()).toBe("")
  })
})
