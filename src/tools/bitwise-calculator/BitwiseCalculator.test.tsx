import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import BitwiseCalculator from "@/tools/bitwise-calculator/BitwiseCalculator"

function renderTool() {
  return render(
    <PlatformProvider>
      <BitwiseCalculator />
    </PlatformProvider>,
  )
}

describe("Bitwise Calculator interactions", () => {
  it("computes the default AND with hex and binary readouts", () => {
    renderTool()
    expect(screen.getByLabelText("Decimal result")).toHaveTextContent("15")
    expect(screen.getByLabelText("Hexadecimal result")).toHaveTextContent("0xF")
    expect(screen.getByLabelText("Binary result")).toHaveTextContent("00001111")
  })

  it("hides Value B for the unary NOT operation", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: /NOT/ }))
    expect(screen.queryByLabelText("Value B")).toBeNull()
    expect(screen.getByLabelText("Decimal result")).toHaveTextContent("-256")
    expect(screen.getByLabelText("Hexadecimal result")).toHaveTextContent("0xFFFFFF00")
  })

  it("pads the binary readout at the selected width", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: /16 bits/ }))
    expect(screen.getByLabelText("Binary result")).toHaveTextContent("0000000000001111")
  })

  it("reports invalid values instead of silently coercing to zero", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Value A"), { target: { value: "abc" } })
    const alerts = screen.getAllByRole("alert")
    expect(alerts.some((alert) => /Enter an integer/.test(alert.textContent ?? ""))).toBe(true)
    expect(
      alerts.some((alert) => /Correct the highlighted value/.test(alert.textContent ?? "")),
    ).toBe(true)
  })

  it("computes XOR on edited values", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: /XOR/ }))
    fireEvent.change(screen.getByLabelText("Value A"), { target: { value: "240" } })
    fireEvent.change(screen.getByLabelText("Value B"), { target: { value: "15" } })
    expect(screen.getByLabelText("Decimal result")).toHaveTextContent("255")
  })
})
