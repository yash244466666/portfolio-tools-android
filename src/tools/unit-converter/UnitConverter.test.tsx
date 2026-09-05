import { fireEvent, render, screen } from "@testing-library/react"
import UnitConverter from "@/tools/unit-converter/UnitConverter"

describe("Unit Converter interactions", () => {
  it("updates the result and swaps source and destination units", () => {
    render(<UnitConverter />)

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2" } })
    expect(screen.getByText("0.002")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Swap units" }))
    expect(screen.getByText("2,000")).toBeVisible()
  })

  it("resets units when the measurement category changes", () => {
    render(<UnitConverter />)

    fireEvent.change(screen.getByLabelText("Measurement type"), {
      target: { value: "temperature" },
    })

    expect(screen.getByRole("combobox", { name: "Source unit" })).toHaveValue("celsius")
    expect(screen.getByRole("combobox", { name: "Destination unit" })).toHaveValue("fahrenheit")
  })
})
