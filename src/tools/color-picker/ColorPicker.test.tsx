import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import ColorPicker from "./ColorPicker"

describe("ColorPicker", () => {
  it("renders the default color and its channels", () => {
    render(
      <PlatformProvider>
        <ColorPicker />
      </PlatformProvider>,
    )
    expect(screen.getByLabelText("Hex")).toHaveValue("#6366f1")
    expect(screen.getByLabelText("R")).toHaveValue(99)
    expect(screen.getByLabelText("G")).toHaveValue(102)
    expect(screen.getByLabelText("B")).toHaveValue(241)
    expect(screen.getByLabelText("H")).toHaveValue(239)
    expect(screen.getByLabelText("S %")).toHaveValue(84)
    expect(screen.getByLabelText("L %")).toHaveValue(67)
  })

  it("normalises a typed three-digit hex color", () => {
    render(
      <PlatformProvider>
        <ColorPicker />
      </PlatformProvider>,
    )
    fireEvent.change(screen.getByLabelText("Hex"), { target: { value: "#0af" } })
    expect(screen.getByLabelText("R")).toHaveValue(0)
    expect(screen.getByLabelText("G")).toHaveValue(170)
    expect(screen.getByLabelText("B")).toHaveValue(255)
    // Committing rewrites the draft to the canonical six-digit form.
    expect(screen.getByLabelText("Hex")).toHaveValue("#00aaff")
  })

  it("updates the hex when an RGB channel changes", () => {
    render(
      <PlatformProvider>
        <ColorPicker />
      </PlatformProvider>,
    )
    fireEvent.change(screen.getByLabelText("R"), { target: { value: "255" } })
    expect(screen.getByLabelText("Hex")).toHaveValue("#ff66f1")
  })

  it("updates the hex when an HSL channel changes", () => {
    render(
      <PlatformProvider>
        <ColorPicker />
      </PlatformProvider>,
    )
    fireEvent.change(screen.getByLabelText("S %"), { target: { value: "0" } })
    // #6366f1 at zero saturation keeps lightness 67 -> grey 470/3 rounds to 170.
    expect(screen.getByLabelText("Hex")).toHaveValue("#ababab")
    expect(screen.getByLabelText("H")).toHaveValue(239)
  })

  it("adopts a harmony swatch as the current color", () => {
    render(
      <PlatformProvider>
        <ColorPicker />
      </PlatformProvider>,
    )
    fireEvent.click(screen.getByLabelText("Use complementary #f2ef64"))
    expect(screen.getByLabelText("Hex")).toHaveValue("#f2ef64")
  })

  it("reports the contrast verdict and updates on a new comparison color", () => {
    render(
      <PlatformProvider>
        <ColorPicker />
      </PlatformProvider>,
    )
    const verdict = screen.getByRole("status", { name: /contrast/i })
    expect(verdict.textContent).toContain("on #ffffff")
    fireEvent.change(screen.getByLabelText("Compare against"), { target: { value: "#000000" } })
    expect(verdict.textContent).toContain("on #000000")
  })

  it("asks for a valid comparison color when the entry is malformed", () => {
    render(
      <PlatformProvider>
        <ColorPicker />
      </PlatformProvider>,
    )
    fireEvent.change(screen.getByLabelText("Compare against"), { target: { value: "zzz" } })
    expect(screen.getByText(/Enter a valid hex color/)).toBeInTheDocument()
  })
})
