import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import FuelTripCostCalculator from "./FuelTripCostCalculator"

function renderTool() {
  render(
    <PlatformProvider>
      <FuelTripCostCalculator />
    </PlatformProvider>,
  )
}

function fill(distance: string, efficiency: string, price: string, passengers = "1") {
  fireEvent.change(screen.getByLabelText("Distance (km)"), { target: { value: distance } })
  fireEvent.change(screen.getByLabelText("Efficiency (km per litre)"), {
    target: { value: efficiency },
  })
  fireEvent.change(screen.getByLabelText(/fuel price per litre/i), { target: { value: price } })
  fireEvent.change(screen.getByLabelText(/passengers/i), { target: { value: passengers } })
}

describe("FuelTripCostCalculator", () => {
  it("starts empty with an instructive status", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter the trip details/i)
  })

  it("computes litres, total, and per-passenger split", () => {
    renderTool()
    fill("150", "6.5", "1.85", "3")
    expect(screen.getByRole("status")).toHaveTextContent(
      /23.077 l of fuel, costing 42.69 total — 14.23 per passenger/,
    )
  })

  it("doubles the distance with the round-trip toggle", () => {
    renderTool()
    fill("100", "5", "2.00")
    expect(screen.getByRole("status")).toHaveTextContent(/20.000 l of fuel, costing 40.00 total/)
    fireEvent.click(screen.getByLabelText(/round trip/i))
    expect(screen.getByRole("status")).toHaveTextContent(/40.000 l of fuel, costing 80.00 total/)
  })

  it("converts the efficiency between modes with the convert button", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Efficiency (km per litre)"), {
      target: { value: "20" },
    })
    fireEvent.click(screen.getByRole("button", { name: /convert/i }))
    expect(screen.getByLabelText("Efficiency (l per 100 km)")).toHaveValue("5")
    expect(screen.getByLabelText("Efficiency mode")).toHaveValue("litres-per-100km")
  })

  it("rejects invalid input with visible alerts", () => {
    renderTool()
    fill("0", "60", "1.999", "2.5")
    const alerts = screen.getAllByRole("alert")
    expect(alerts.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole("status")).toHaveTextContent(/fix the highlighted input/i)
  })

  it("resets every field", () => {
    renderTool()
    fill("150", "6.5", "1.85", "3")
    fireEvent.click(screen.getByLabelText(/round trip/i))
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    expect(screen.getByLabelText("Distance (km)")).toHaveValue("")
    expect(screen.getByLabelText(/passengers/i)).toHaveValue("1")
    expect(screen.getByLabelText(/round trip/i)).not.toBeChecked()
    expect(screen.getByRole("status")).toHaveTextContent(/enter the trip details/i)
  })
})
