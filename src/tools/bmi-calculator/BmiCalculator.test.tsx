import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import BmiCalculator from "./BmiCalculator"

function renderTool() {
  render(
    <PlatformProvider>
      <BmiCalculator />
    </PlatformProvider>,
  )
}

describe("BmiCalculator", () => {
  it("starts empty, discloses the estimate-only disclaimer, and shows no category yet", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter your weight and height/i)
    expect(screen.getByRole("note")).toHaveTextContent(/not medical advice/i)
    expect(screen.queryByText(/WHO adult range/)).not.toBeInTheDocument()
  })

  it("computes metric BMI with a WHO band as a text label", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "70" } })
    fireEvent.change(screen.getByLabelText("Height (cm)"), { target: { value: "175" } })
    expect(screen.getByRole("status")).toHaveTextContent(/BMI 22.9 — 18.5 to 24.9 — normal band/)
  })

  it("computes imperial BMI and switches systems with pressed-state feedback", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /imperial/i }))
    expect(screen.getByRole("button", { name: /imperial/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    fireEvent.change(screen.getByLabelText("Weight (lb)"), { target: { value: "155" } })
    fireEvent.change(screen.getByLabelText("Height (ft)"), { target: { value: "5" } })
    fireEvent.change(screen.getByLabelText("Height (in)"), { target: { value: "9" } })
    expect(screen.getByRole("status")).toHaveTextContent(/BMI 22.9/)
  })

  it("lands in a different band with a distinct text label", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "110" } })
    fireEvent.change(screen.getByLabelText("Height (cm)"), { target: { value: "175" } })
    expect(screen.getByRole("status")).toHaveTextContent(/BMI 35.9 — 30 and above — obese band/)
  })

  it("reports invalid measurements with visible alerts and recovers via reset", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "heavy" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/valid weight/i)
    expect(screen.getByRole("status")).toHaveTextContent(/fix the highlighted measurement/i)
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    expect(screen.getByLabelText("Weight (kg)")).toHaveValue("")
    expect(screen.getByRole("status")).toHaveTextContent(/enter your weight and height/i)
  })
})
