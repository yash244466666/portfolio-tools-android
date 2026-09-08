import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import ReadingTimeEstimator from "./ReadingTimeEstimator"

function renderTool() {
  render(
    <PlatformProvider>
      <ReadingTimeEstimator />
    </PlatformProvider>,
  )
}

describe("ReadingTimeEstimator", () => {
  it("starts empty with an instructive status and no table", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter text/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("estimates minutes and seconds as you type at the default rate", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to estimate"), {
      target: { value: "word ".repeat(300).trim() },
    })
    expect(screen.getByRole("status")).toHaveTextContent(
      /300 words take about 1 min 30 s at 200 words per minute/i,
    )
    expect(screen.getByRole("table")).toHaveTextContent("1 min 30 s at 200 wpm")
  })

  it("follows a clamped reading speed and discloses the effective value", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to estimate"), {
      target: { value: "word ".repeat(300).trim() },
    })
    fireEvent.change(screen.getByLabelText(/reading speed/i), {
      target: { value: "50" },
    })
    expect(screen.getByRole("status")).toHaveTextContent(/3 min 0 s at 100 words per minute/i)
  })

  it("reports per-budget fit and over-by in the table", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to estimate"), {
      target: { value: "a".repeat(400) },
    })
    const table = screen.getByRole("table")
    expect(table).toHaveTextContent("Over by 240")
    expect(table).toHaveTextContent("Fits")
  })

  it("rejects invalid budgets and speeds with visible alerts", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText(/reading speed/i), { target: { value: "fast" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/between 100 and 500/i)
    expect(screen.getByRole("status")).toHaveTextContent(/fix the highlighted reading speed/i)
    fireEvent.change(screen.getByLabelText(/SEO description cap/i), {
      target: { value: "none" },
    })
    const alerts = screen.getAllByRole("alert")
    expect(alerts.some((alert) => alert.textContent?.match(/at least 1 character/i))).toBe(true)
  })

  it("reports punctuation-only input as no words found", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to estimate"), {
      target: { value: "!!! … ???" },
    })
    expect(screen.getByRole("status")).toHaveTextContent(/no words were found/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("resets text, speed, and caps", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text to estimate"), {
      target: { value: "words to estimate" },
    })
    fireEvent.change(screen.getByLabelText(/reading speed/i), { target: { value: "400" } })
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    expect(screen.getByLabelText("Text to estimate")).toHaveValue("")
    expect(screen.getByLabelText(/reading speed/i)).toHaveValue("200")
    expect(screen.getByRole("status")).toHaveTextContent(/enter text/i)
  })
})
