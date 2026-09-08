import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import DiscountTaxCalculator from "./DiscountTaxCalculator"

function renderTool() {
  render(
    <PlatformProvider>
      <DiscountTaxCalculator />
    </PlatformProvider>,
  )
}

function fill(price: string, discount: string, tax: string, mode: DiscountModeType = "percent") {
  fireEvent.change(screen.getByLabelText("Original price"), { target: { value: price } })
  if (mode === "flat") {
    fireEvent.click(screen.getByRole("button", { name: /flat amount off/i }))
    fireEvent.change(screen.getByLabelText("Flat discount amount"), {
      target: { value: discount },
    })
  } else {
    fireEvent.change(screen.getByLabelText("Discount percent"), { target: { value: discount } })
  }
  fireEvent.change(screen.getByLabelText("Tax percent"), { target: { value: tax } })
}

type DiscountModeType = "percent" | "flat"

describe("DiscountTaxCalculator", () => {
  it("starts empty with an instructive status and no table", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter the price/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("shows each step with exact 2-decimal money", () => {
    renderTool()
    fill("100.00", "25", "8")
    expect(screen.getByRole("status")).toHaveTextContent(
      /save 25.00; the subtotal after discount is 75.00, tax adds 6.00, and the total is 81.00/,
    )
    const table = screen.getByRole("table")
    expect(table).toHaveTextContent("75.00")
    expect(table).toHaveTextContent("6.00")
    expect(table).toHaveTextContent("81.00")
  })

  it("applies tax after a flat discount capped at the price", () => {
    renderTool()
    fill("5.00", "99.00", "10", "flat")
    expect(screen.getByRole("status")).toHaveTextContent(
      /save 5.00; the subtotal after discount is 0.00, tax adds 0.00, and the total is 0.00/,
    )
  })

  it("reports invalid input with visible alerts and clamps percents into range", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Original price"), { target: { value: "1.999" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/at most 2 decimals/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Original price"), { target: { value: "10.00" } })
    fireEvent.change(screen.getByLabelText("Discount percent"), { target: { value: "150" } })
    // Percents clamp into 0-100, so 150% off computes the floor price.
    fireEvent.change(screen.getByLabelText("Tax percent"), { target: { value: "10" } })
    expect(screen.getByRole("status")).toHaveTextContent(
      /save 10.00; the subtotal after discount is 0.00/,
    )
  })

  it("resets to the empty state", () => {
    renderTool()
    fill("100.00", "25", "8")
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    expect(screen.getByLabelText("Original price")).toHaveValue("")
    expect(screen.getByRole("status")).toHaveTextContent(/enter the price/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})
