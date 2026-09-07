import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import RomanNumeralConverter from "@/tools/roman-numeral-converter/RomanNumeralConverter"

describe("Roman Numeral Converter interactions", () => {
  it("converts Arabic to Roman as you type", () => {
    render(
      <PlatformProvider>
        <RomanNumeralConverter />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Arabic number (1–3999)"), {
      target: { value: "1994" },
    })
    expect(screen.getByText("MCMXCIV")).toBeVisible()
  })

  it("converts Roman to Arabic and rejects non-canonical forms", () => {
    render(
      <PlatformProvider>
        <RomanNumeralConverter />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("radio", { name: "Roman to Arabic" }))
    fireEvent.change(screen.getByLabelText("Roman numeral"), { target: { value: "XLII" } })
    expect(screen.getByText("42")).toBeVisible()

    fireEvent.change(screen.getByLabelText("Roman numeral"), { target: { value: "IIII" } })
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(/valid Roman numeral/)
  })

  it("rejects out-of-range Arabic input with a range explanation", () => {
    render(
      <PlatformProvider>
        <RomanNumeralConverter />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Arabic number (1–3999)"), {
      target: { value: "4000" },
    })
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(/1 to 3999/)
  })

  it("saves explicit history entries and clears them", () => {
    render(
      <PlatformProvider>
        <RomanNumeralConverter />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Arabic number (1–3999)"), {
      target: { value: "42" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save to history" }))
    expect(screen.getByRole("button", { name: "Clear history" })).toBeVisible()
    expect(screen.getAllByText("XLII").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Clear history" }))
    expect(screen.queryByRole("button", { name: "Clear history" })).toBeNull()
  })
})
