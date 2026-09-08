import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import CssUnitConverter from "./CssUnitConverter"

function renderTool() {
  render(
    <PlatformProvider>
      <CssUnitConverter />
    </PlatformProvider>,
  )
}

describe("CssUnitConverter", () => {
  it("starts empty with an instructive status and no table", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter a value/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("converts px into every unit at the default 16 px root", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText(/value in pixels/i), { target: { value: "24" } })
    expect(screen.getByRole("status")).toHaveTextContent(
      /24px equals 24px, 1.5rem, 1.5em, and 150%/,
    )
    expect(screen.getByRole("table")).toHaveTextContent("1.5rem")
  })

  it("follows the root font size bidirectionally", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Root font size (px)"), { target: { value: "20" } })
    fireEvent.change(screen.getByLabelText(/value in pixels/i), { target: { value: "30" } })
    expect(screen.getByRole("status")).toHaveTextContent(/1.5rem/)
    fireEvent.change(screen.getByLabelText(/from unit/i), { target: { value: "rem" } })
    fireEvent.change(screen.getByLabelText(/value in root em/i), { target: { value: "2" } })
    expect(screen.getByRole("status")).toHaveTextContent(/40px/)
  })

  it("clamps the root size into range and rejects a junk value with a visible alert", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Root font size (px)"), { target: { value: "0" } })
    // Out-of-range roots clamp into the 1-72 px range, so 0 behaves as 1.
    fireEvent.change(screen.getByLabelText(/value in pixels/i), { target: { value: "1" } })
    expect(screen.getByRole("status")).toHaveTextContent(/1px, 1rem/)
    fireEvent.change(screen.getByLabelText("Root font size (px)"), { target: { value: "16" } })
    fireEvent.change(screen.getByLabelText(/value in pixels/i), { target: { value: "wide" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a valid number/i)
    expect(screen.getByRole("status")).toHaveTextContent(/fix the highlighted input/i)
  })

  it("resets to the defaults", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Root font size (px)"), { target: { value: "72" } })
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    expect(screen.getByLabelText("Root font size (px)")).toHaveValue("16")
    expect(screen.getByRole("status")).toHaveTextContent(/enter a value/i)
  })
})
