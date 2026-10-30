import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import Calculator from "@/tools/calculator/Calculator"

function press(labels: string[]) {
  for (const label of labels) {
    fireEvent.click(screen.getByRole("button", { name: label }))
  }
}

function renderTool() {
  return render(
    <PlatformProvider>
      <Calculator />
    </PlatformProvider>,
  )
}

function expectDisplay(value: string) {
  expect(screen.getByRole("status")).toHaveTextContent(`Display ${value}`)
}

describe("Calculator interactions", () => {
  it("computes a simple addition and clears the pending expression", () => {
    renderTool()
    press(["2", "Add", "3", "Equals"])
    expectDisplay("5")
    expect(screen.getByRole("status")).toHaveTextContent(/^Display 5/)
  })

  it("evaluates with operator precedence", () => {
    renderTool()
    press(["2", "Multiply", "3", "Add", "4", "Equals"])
    expectDisplay("10")
  })

  it("evaluates parentheses committed by the keypad", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Scientific" }))
    press(["Open parenthesis", "2", "Add", "3", "Close parenthesis"])
    press(["Multiply", "4", "Equals"])
    expectDisplay("20")
  })

  it("reports division by zero as Error and can clear it", () => {
    renderTool()
    press(["5", "Divide", "0", "Equals"])
    expectDisplay("Error")
    press(["Clear"])
    expectDisplay("0")
  })

  it("applies scientific functions to the displayed value", () => {
    renderTool()
    press(["9"])
    fireEvent.click(screen.getByRole("button", { name: "Standard" }))
    fireEvent.click(screen.getByRole("button", { name: "Scientific" }))
    fireEvent.click(screen.getByRole("button", { name: "Square root" }))
    expectDisplay("3")
    fireEvent.click(screen.getByRole("button", { name: "Factorial" }))
    expectDisplay("6")
  })

  it("continues from a result displayed in exponent notation", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Scientific" }))
    press(["1", "0", "0", "0", "0", "0", "0", "0"])
    fireEvent.click(screen.getByRole("button", { name: "Reciprocal" }))
    expectDisplay("1e-7")
    press(["Add", "5", "Equals"])
    expectDisplay("5.0000001")
  })

  it("inserts pi from the constants row", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Scientific" }))
    fireEvent.click(screen.getByRole("button", { name: "Pi" }))
    expectDisplay(Math.PI.toString())
  })

  it("keeps a reusable history that can be cleared", () => {
    renderTool()
    press(["2", "Add", "3", "Equals"])
    expect(screen.getByRole("button", { name: "Use result of 2 + 3" })).toBeVisible()
    press(["9", "9"])
    expectDisplay("99")
    fireEvent.click(screen.getByRole("button", { name: "Use result of 2 + 3" }))
    expectDisplay("5")
    fireEvent.click(screen.getByRole("button", { name: "Clear history" }))
    expect(screen.queryByRole("button", { name: /Use result of/ })).toBeNull()
  })
})
