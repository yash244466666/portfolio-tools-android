import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import LoanEmiCalculator from "./LoanEmiCalculator"

function renderTool() {
  render(
    <PlatformProvider>
      <LoanEmiCalculator />
    </PlatformProvider>,
  )
}

function fill(principal: string, rate: string, tenure: string) {
  fireEvent.change(screen.getByLabelText("Principal amount"), { target: { value: principal } })
  fireEvent.change(screen.getByLabelText(/annual interest rate/i), { target: { value: rate } })
  fireEvent.change(screen.getByLabelText(/tenure/i), { target: { value: tenure } })
}

describe("LoanEmiCalculator", () => {
  it("starts empty with an instructive status and no table", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter the principal/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByRole("note")).toHaveTextContent(/indicative only/i)
  })

  it("computes the known EMI vector with a year summary", () => {
    renderTool()
    fill("100000", "12", "12")
    expect(screen.getByRole("status")).toHaveTextContent(/EMI is 8884.88 per month for 12 months/)
    expect(screen.getByRole("table")).toHaveTextContent("100000.00")
  })

  it("handles the 0% interest branch", () => {
    renderTool()
    fill("120000", "0", "12")
    expect(screen.getByRole("status")).toHaveTextContent(/EMI is 10000.00 per month/)
    expect(screen.getByRole("table")).toHaveTextContent("0.00")
  })

  it("rejects invalid terms with visible alerts", () => {
    renderTool()
    fill("1.999", "150", "12.5")
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole("status")).toHaveTextContent(/fix the highlighted loan term/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("resets the terms", () => {
    renderTool()
    fill("100000", "12", "12")
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    expect(screen.getByLabelText("Principal amount")).toHaveValue("")
    expect(screen.getByRole("status")).toHaveTextContent(/enter the principal/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})
