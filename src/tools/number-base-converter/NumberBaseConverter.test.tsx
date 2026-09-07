import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import NumberBaseConverter from "@/tools/number-base-converter/NumberBaseConverter"

function field(label: string) {
  return screen.getByLabelText(new RegExp(`^${label.replace(/[()]/g, "\\$&")}`))
}

describe("Number Base Converter interactions", () => {
  it("starts with a default value and converts live across all bases", () => {
    render(
      <PlatformProvider>
        <NumberBaseConverter />
      </PlatformProvider>,
    )

    const decimal = field("Decimal")
    expect(decimal).toHaveValue("10")
    expect(field("Binary")).toHaveValue("1010")
    expect(field("Hexadecimal")).toHaveValue("A")

    fireEvent.change(decimal, { target: { value: "255" } })
    expect(field("Binary")).toHaveValue("11111111")
    expect(field("Hexadecimal")).toHaveValue("FF")
    expect(field("Octal")).toHaveValue("377")
  })

  it("converts by editing a non-decimal field", () => {
    render(
      <PlatformProvider>
        <NumberBaseConverter />
      </PlatformProvider>,
    )

    fireEvent.change(field("Hexadecimal"), { target: { value: "ff" } })
    expect(field("Decimal")).toHaveValue("255")
    expect(field("Binary")).toHaveValue("11111111")
  })

  it("rejects digits invalid for the base without corrupting other fields", () => {
    render(
      <PlatformProvider>
        <NumberBaseConverter />
      </PlatformProvider>,
    )

    fireEvent.change(field("Hexadecimal"), { target: { value: "F1x" } })
    expect(screen.getByText(/digits that are not valid in this base/)).toBeVisible()
    // Regression: parseInt("F1x", 16) silently yielded 241.
    expect(field("Decimal")).toHaveValue("10")
  })

  it("clears the shared value when a field is emptied", () => {
    render(
      <PlatformProvider>
        <NumberBaseConverter />
      </PlatformProvider>,
    )

    fireEvent.change(field("Decimal"), { target: { value: "" } })
    expect(field("Decimal")).toHaveValue("")
    expect(field("Binary")).toHaveValue("")
    expect(field("Hexadecimal")).toHaveValue("")
  })

  it("rejects values beyond the digit limit", () => {
    render(
      <PlatformProvider>
        <NumberBaseConverter />
      </PlatformProvider>,
    )

    fireEvent.change(field("Decimal"), { target: { value: "1".repeat(257) } })
    expect(screen.getByText(/257|digit limit/)).toBeVisible()
  })

  it("shows exact arbitrary-precision conversions and supports a custom radix", () => {
    render(
      <PlatformProvider>
        <NumberBaseConverter />
      </PlatformProvider>,
    )

    // Regression: parseInt-based conversion lost precision above 2^53.
    fireEvent.change(field("Decimal"), { target: { value: "9007199254740993" } })
    expect(field("Hexadecimal")).toHaveValue("20000000000001")

    fireEvent.change(screen.getByLabelText("Radix"), { target: { value: "36" } })
    expect(screen.getByText("2GOSA7PA2GX")).toBeVisible()
  })

  it("rejects an out-of-range custom radix", () => {
    render(
      <PlatformProvider>
        <NumberBaseConverter />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Radix"), { target: { value: "37" } })
    expect(screen.getAllByText(/between 2 and 36/).length).toBeGreaterThan(0)
  })
})
