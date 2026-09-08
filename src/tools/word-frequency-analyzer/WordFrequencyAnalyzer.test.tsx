import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import WordFrequencyAnalyzer from "./WordFrequencyAnalyzer"

function renderTool() {
  render(
    <PlatformProvider>
      <WordFrequencyAnalyzer />
    </PlatformProvider>,
  )
}

describe("WordFrequencyAnalyzer", () => {
  it("starts empty with an instructive status and no table", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter text/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("analyzes as you type with counts, shares, and a text table", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to analyze"), {
      target: { value: "apple banana apple apple" },
    })
    expect(screen.getByRole("status")).toHaveTextContent(/4 words \(2 unique\)/)
    const table = screen.getByRole("table")
    expect(table).toHaveTextContent("apple")
    expect(table).toHaveTextContent("75%")
  })

  it("skips common English words only when the toggle is on", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to analyze"), {
      target: { value: "the cat and the dog" },
    })
    expect(screen.getByRole("status")).toHaveTextContent(/after skipping 3 common English words/i)
    fireEvent.click(screen.getByLabelText(/skip common english words/i))
    expect(screen.getByRole("status")).toHaveTextContent(/5 words \(4 unique\)/)
  })

  it("reports an over-cap input with a visible error", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to analyze"), {
      target: { value: "a".repeat(100_001) },
    })
    expect(screen.getByRole("alert")).toHaveTextContent(/capped at the first 100,000 characters/i)
  })

  it("clears back to the empty state, including the over-cap disclosure", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to analyze"), {
      target: { value: "a".repeat(100_001) },
    })
    expect(screen.getByRole("alert")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: /clear text/i }))
    expect(screen.getByLabelText("Text to analyze")).toHaveValue("")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(/enter text/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("reports an all-filtered input distinctly from the empty state", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to analyze"), {
      target: { value: "the and" },
    })
    expect(screen.getByRole("status")).toHaveTextContent(
      /all 2 words were skipped as common english words/i,
    )
  })

  it("reports punctuation-only input as no words found", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to analyze"), {
      target: { value: "!!! … ???" },
    })
    expect(screen.getByRole("status")).toHaveTextContent(/no words were found/i)
  })
})
