import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import GcdLcmCalculator from "@/tools/gcd-lcm-calculator/GcdLcmCalculator"

describe("GCD/LCM Calculator interactions", () => {
  it("computes GCD and LCM as you type", () => {
    render(
      <PlatformProvider>
        <GcdLcmCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Numbers"), { target: { value: "48, 18, 12" } })
    expect(screen.getByText("6")).toBeVisible()
    expect(screen.getByText("144")).toBeVisible()
  })

  it("reports an invalid entry instead of silently dropping it", () => {
    render(
      <PlatformProvider>
        <GcdLcmCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Numbers"), { target: { value: "48, abc, 18" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/Entry 2 is not a whole number/)
  })

  it("shows the Euclidean steps with the first-two disclosure", () => {
    render(
      <PlatformProvider>
        <GcdLcmCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Numbers"), { target: { value: "48, 18" } })
    expect(screen.getByText(/Shown for the first two numbers/)).toBeVisible()
    expect(screen.getByText(/gcd\(48, 18\)/)).toBeVisible()
  })

  it("discloses a zero LCM", () => {
    render(
      <PlatformProvider>
        <GcdLcmCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Numbers"), { target: { value: "0, 5" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/LCM is 0/)
  })
})
