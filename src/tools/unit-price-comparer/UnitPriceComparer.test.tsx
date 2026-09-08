import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import UnitPriceComparer from "./UnitPriceComparer"

function renderTool() {
  render(
    <PlatformProvider>
      <UnitPriceComparer />
    </PlatformProvider>,
  )
}

function fillItem(
  itemNumber: number,
  values: { label?: string; price: string; quantity: string; unit?: string },
) {
  if (values.label !== undefined) {
    fireEvent.change(screen.getByLabelText(`Item ${itemNumber} label`), {
      target: { value: values.label },
    })
  }
  if (values.unit !== undefined) {
    fireEvent.change(screen.getByLabelText(`Item ${itemNumber} unit`), {
      target: { value: values.unit },
    })
  }
  fireEvent.change(screen.getByLabelText(`Item ${itemNumber} price`), {
    target: { value: values.price },
  })
  fireEvent.change(screen.getByLabelText(new RegExp(`^Item ${itemNumber} quantity`)), {
    target: { value: values.quantity },
  })
}

describe("UnitPriceComparer", () => {
  it("starts empty with an instructive status and no table", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter a price and a quantity/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("ranks two items cheapest first with per-base-unit prices", () => {
    renderTool()
    fillItem(1, { label: "Bottle", price: "4.50", quantity: "1.5", unit: "l" })
    fillItem(2, { label: "Carton", price: "2.00", quantity: "500", unit: "ml" })
    expect(screen.getByRole("status")).toHaveTextContent(/Bottle at 0.0030 per ml/)
    expect(screen.getByRole("status")).toHaveTextContent(/not comparable with each other/)
    const table = screen.getByRole("table")
    expect(table).toHaveTextContent("0.0030")
    expect(table).toHaveTextContent("0.0040")
  })

  it("shares one rank for an exact per-unit tie", () => {
    renderTool()
    fillItem(1, { label: "First", price: "2.00", quantity: "1", unit: "kg" })
    fillItem(2, { label: "Second", price: "4.00", quantity: "2", unit: "kg" })
    const table = screen.getByRole("table")
    expect(table).toHaveTextContent("0.0020")
  })

  it("reports invalid input with visible alerts and keeps the empty result", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Item 1 price"), { target: { value: "4.505" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/at most 2 decimals/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Item 1 price"), { target: { value: "4.50" } })
    fireEvent.change(screen.getByLabelText(/^Item 1 quantity/), { target: { value: "0" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/greater than 0/i)
  })

  it("resets every row to the empty state", () => {
    renderTool()
    fillItem(1, { label: "Bottle", price: "4.50", quantity: "1.5", unit: "l" })
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    expect(screen.getByRole("status")).toHaveTextContent(/enter a price and a quantity/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})
