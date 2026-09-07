import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import PercentageCalculator from "@/tools/percentage-calculator/PercentageCalculator"

describe("Percentage Calculator interactions", () => {
  it("computes X percent of Y as you type", () => {
    render(
      <PlatformProvider>
        <PercentageCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Percentage (X %)"), { target: { value: "25" } })
    fireEvent.change(screen.getByLabelText("Of value (Y)"), { target: { value: "200" } })
    expect(screen.getByText("50")).toBeVisible()
  })

  it("computes X as a percentage of Y with the percent suffix", () => {
    render(
      <PlatformProvider>
        <PercentageCalculator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("radio", { name: "X is ? % of Y" }))
    fireEvent.change(screen.getByLabelText("Value (X)"), { target: { value: "45" } })
    fireEvent.change(screen.getByLabelText("Total (Y)"), { target: { value: "180" } })
    expect(screen.getByText("25%")).toBeVisible()
  })

  it("reports undefined for a zero total instead of a silent placeholder", () => {
    render(
      <PlatformProvider>
        <PercentageCalculator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("radio", { name: "X is ? % of Y" }))
    fireEvent.change(screen.getByLabelText("Value (X)"), { target: { value: "5" } })
    fireEvent.change(screen.getByLabelText("Total (Y)"), { target: { value: "0" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/Undefined/)
  })

  it("rejects partial numeric input the upstream parseFloat accepted", () => {
    render(
      <PlatformProvider>
        <PercentageCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Percentage (X %)"), { target: { value: "12abc" } })
    fireEvent.change(screen.getByLabelText("Of value (Y)"), { target: { value: "200" } })
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid number for X.")
  })

  it("computes percent change and reports the increase direction label", () => {
    render(
      <PlatformProvider>
        <PercentageCalculator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("radio", { name: "% Change" }))
    fireEvent.change(screen.getByLabelText("New value"), { target: { value: "12" } })
    fireEvent.change(screen.getByLabelText("Old value"), { target: { value: "8" } })
    expect(screen.getByText("50%")).toBeVisible()
  })
})
