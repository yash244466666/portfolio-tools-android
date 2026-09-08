import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import DateDifferenceCalculator from "./DateDifferenceCalculator"

function renderTool() {
  render(
    <PlatformProvider>
      <DateDifferenceCalculator />
    </PlatformProvider>,
  )
}

function setDates(start: string, end: string) {
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: start } })
  fireEvent.change(screen.getByLabelText("End date"), { target: { value: end } })
}

describe("DateDifferenceCalculator", () => {
  it("starts empty with an instructive status and no table", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter both dates/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("computes the full breakdown with a text table", () => {
    renderTool()
    setDates("2026-09-07", "2026-09-11")
    expect(screen.getByRole("status")).toHaveTextContent(
      /4 days \(0 weeks and 4 days\), 0 calendar months and 4 days, with 4 business days/i,
    )
    const table = screen.getByRole("table")
    expect(table).toHaveTextContent("Business days (Mon-Fri)")
    expect(table).toHaveTextContent("4")
  })

  it("rejects impossible dates with visible alerts", () => {
    renderTool()
    setDates("2026-02-30", "2026-09-11")
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a real date/i)
    expect(screen.getByRole("status")).toHaveTextContent(/fix the highlighted date/i)
    setDates("not-a-date", "2026-09-11")
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a real date/i)
  })

  it("switches between exclusive and inclusive modes with pressed-state feedback", () => {
    renderTool()
    setDates("2026-09-07", "2026-09-11")
    fireEvent.click(screen.getByRole("button", { name: /inclusive/i }))
    expect(screen.getByRole("button", { name: /inclusive/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByRole("status")).toHaveTextContent(/5 days/)
    expect(screen.getByRole("status")).toHaveTextContent(/5 business days/)
  })

  it("clears dates after invalid input", () => {
    renderTool()
    setDates("2026-02-30", "2026-09-11")
    fireEvent.click(screen.getByRole("button", { name: /clear dates/i }))
    expect(screen.getByLabelText("Start date")).toHaveValue("")
    expect(screen.getByRole("status")).toHaveTextContent(/enter both dates/i)
  })
})
