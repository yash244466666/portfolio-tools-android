import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import TipCalculator from "@/tools/tip-calculator/TipCalculator"

describe("Tip Calculator interactions", () => {
  it("computes tip and total for the canonical example", () => {
    render(
      <PlatformProvider>
        <TipCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Bill amount"), { target: { value: "50" } })
    expect(screen.getByText("9.00")).toBeVisible()
    expect(screen.getByText("59.00")).toBeVisible()
  })

  it("applies preset tips", () => {
    render(
      <PlatformProvider>
        <TipCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Bill amount"), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: "20%" }))
    expect(screen.getByText("20.00")).toBeVisible()
    expect(screen.getByRole("button", { name: "20%" })).toHaveAttribute("aria-pressed", "true")
  })

  it("splits the total and tip across people", () => {
    render(
      <PlatformProvider>
        <TipCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Bill amount"), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: "20%" }))
    fireEvent.change(screen.getByLabelText("Split between"), { target: { value: "3" } })
    expect(screen.getByText("40.00")).toBeVisible()
    expect(screen.getByText("6.67")).toBeVisible()
  })

  it("rejects a non-positive or malformed bill", () => {
    render(
      <PlatformProvider>
        <TipCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Bill amount"), { target: { value: "0" } })
    expect(screen.getByRole("alert")).toHaveTextContent("greater than 0")

    fireEvent.change(screen.getByLabelText("Bill amount"), { target: { value: "12x" } })
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid bill amount")
  })

  it("flags an out-of-range split count", () => {
    render(
      <PlatformProvider>
        <TipCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Split between"), { target: { value: "0" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/from 1 to 100/)
    fireEvent.change(screen.getByLabelText("Split between"), { target: { value: "101" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/from 1 to 100/)
  })
})
