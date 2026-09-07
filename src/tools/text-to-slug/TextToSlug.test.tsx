import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import TextToSlug from "@/tools/text-to-slug/TextToSlug"

describe("Text to Slug interactions", () => {
  it("generates a slug live with a visible step list", () => {
    render(
      <PlatformProvider>
        <TextToSlug />
      </PlatformProvider>,
    )

    expect(screen.getByText(/Enter text above to generate a slug/)).toBeVisible()

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "Hello, World!" } })
    // The slug appears in the result panel and again in the step list.
    expect(screen.getAllByText("hello-world").length).toBeGreaterThan(0)
    expect(screen.getByText("Conversion steps")).toBeVisible()
    expect(screen.getByText("Remove diacritics")).toBeVisible()

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "!!! " } })
    expect(screen.getByText(/Enter text above to generate a slug/)).toBeVisible()
  })

  it("switches separators and honors the stop-word and length options", () => {
    render(
      <PlatformProvider>
        <TextToSlug />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "The quick brown fox" } })
    fireEvent.click(screen.getByLabelText(/underscore/))
    expect(screen.getAllByText("the_quick_brown_fox").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByLabelText("Remove common stop words"))
    expect(screen.getAllByText("quick_brown_fox").length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText("Maximum length"), { target: { value: "10" } })
    // Truncation cuts back to the last separator, so "quick_brow" (10 chars)
    // becomes "quick".
    expect(screen.getAllByText("quick").length).toBeGreaterThan(0)
  })

  it("rejects an out-of-range maximum length", () => {
    render(
      <PlatformProvider>
        <TextToSlug />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Maximum length"), { target: { value: "500" } })
    expect(screen.getByText(/between 0 and 200/)).toBeVisible()
  })

  it("rejects input beyond the character limit", () => {
    render(
      <PlatformProvider>
        <TextToSlug />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "a".repeat(100_001) } })
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("100,000 character limit")
    expect(screen.getByText(/Shorten the text to generate a slug/)).toBeVisible()
  })
})
