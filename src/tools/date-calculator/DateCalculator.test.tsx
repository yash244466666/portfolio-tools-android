import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import DateCalculator from "./DateCalculator"

afterEach(() => {
  vi.useRealTimers()
})

function renderTool() {
  render(
    <PlatformProvider>
      <DateCalculator />
    </PlatformProvider>,
  )
}

describe("DateCalculator interactions", () => {
  it("adds months with end-of-month clamping", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-01-31" } })
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1" } })
    fireEvent.change(screen.getByLabelText("Unit"), { target: { value: "months" } })

    expect(document.querySelector("#date-calculator-result")?.textContent).toBe("2026-02-28")
    expect(screen.getByText("Saturday")).toBeInTheDocument()
    expect(screen.getByText(/28 calendar days after/)).toBeInTheDocument()
  })

  it("subtracts and counts business days", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Subtract" }))
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-03-31" } })
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1" } })
    fireEvent.change(screen.getByLabelText("Unit"), { target: { value: "months" } })
    expect(document.querySelector("#date-calculator-result")?.textContent).toBe("2026-02-28")

    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-10-30" } })
    fireEvent.change(screen.getByLabelText("Unit"), { target: { value: "business-days" } })
    expect(document.querySelector("#date-calculator-result")?.textContent).toBe("2026-11-02")
    expect(screen.getByText("Monday")).toBeInTheDocument()
  })

  it("reports an invalid date and keeps no stale result", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-02-30" } })
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a real start date")
    expect(document.querySelector("#date-calculator-result")).toBeNull()
  })

  it("fills today from the device clock", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 30, 12, 0, 0))
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Use today" }))
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-10-30")
    vi.useRealTimers()
  })
})
