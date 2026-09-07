import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import WordCounter from "@/tools/word-counter/WordCounter"

describe("Word Counter interactions", () => {
  it("updates counts as text is typed", () => {
    render(
      <PlatformProvider>
        <WordCounter />
      </PlatformProvider>,
    )

    const input = screen.getByLabelText("Text")
    fireEvent.change(input, { target: { value: "Hello world. Second sentence!\n\nNew paragraph?" } })

    expect(screen.getByText("Words").previousElementSibling).toHaveTextContent("6")
    expect(screen.getByText("Sentences").previousElementSibling).toHaveTextContent("3")
    expect(screen.getByText("Paragraphs").previousElementSibling).toHaveTextContent("2")
    expect(screen.getByText("< 1 min")).toBeVisible()
  })

  it("shows zeros before input and resets counts when cleared", () => {
    render(
      <PlatformProvider>
        <WordCounter />
      </PlatformProvider>,
    )

    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4)
    const input = screen.getByLabelText("Text")
    fireEvent.change(input, { target: { value: "word" } })
    expect(screen.getByText("Words").previousElementSibling).toHaveTextContent("1")
    fireEvent.change(input, { target: { value: "" } })
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4)
  })

  it("rejects input beyond the character limit instead of counting it", () => {
    render(
      <PlatformProvider>
        <WordCounter />
      </PlatformProvider>,
    )

    const input = screen.getByLabelText("Text")
    fireEvent.change(input, { target: { value: "a".repeat(1_000_001) } })

    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("1,000,000 character limit")
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: /copy/i })).not.toBeInTheDocument()
  })
})