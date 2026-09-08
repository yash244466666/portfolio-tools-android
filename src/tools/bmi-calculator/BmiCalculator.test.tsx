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

  it("rejects zero weight with a real alert instead of a silent clamp", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "0" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/at least 1 kg/i)
    fireEvent.click(screen.getByRole("button", { name: /imperial/i }))
    fireEvent.change(screen.getByLabelText("Weight (lb)"), { target: { value: "0" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/at least 2 lb/i)
  })

  it("rejects imperial heights outside the 20-98 inch window with one clear alert", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /imperial/i }))
    fireEvent.change(screen.getByLabelText("Weight (lb)"), { target: { value: "155" } })
    fireEvent.change(screen.getByLabelText("Height (ft)"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("Height (in)"), { target: { value: "0" } })
    expect(screen.getByRole("status")).toHaveTextContent(/between 20 and 98 inches/i)
  })

  it("discloses clamped metric inputs as effective values", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "99999" } })
    fireEvent.change(screen.getByLabelText("Height (cm)"), { target: { value: "20" } })
    expect(screen.getByText(/Weight clamped to 500 kg/i)).toBeVisible()
    expect(screen.getByText(/Height clamped to 50 cm/i)).toBeVisible()
  })

  it("converts the retained weight across systems instead of reinterpreting it", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "70" } })
    fireEvent.click(screen.getByRole("button", { name: /imperial/i }))
    expect(screen.getByLabelText("Weight (lb)")).toHaveValue("154.32")
    fireEvent.click(screen.getByRole("button", { name: /metric/i }))
    expect(screen.getByLabelText("Weight (kg)")).toHaveValue("70")
  })

  it("reports invalid measurements with visible alerts and recovers via reset", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "heavy" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/at least 1 kg/i)
    expect(screen.getByRole("status")).toHaveTextContent(/fix the highlighted measurement/i)
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    expect(screen.getByLabelText("Weight (kg)")).toHaveValue("")
    expect(screen.getByRole("status")).toHaveTextContent(/enter your weight and height/i)
  })
})
