import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import Base64Converter from "@/tools/base64-converter/Base64Converter"

describe("Base64 Encode/Decode interactions", () => {
  it("encodes and decodes through the buttons and resets", () => {
    render(
      <PlatformProvider>
        <Base64Converter />
      </PlatformProvider>,
    )

    expect(screen.getByText(/Enter text above, then choose Encode or Decode/)).toBeVisible()

    const input = screen.getByLabelText("Input")
    fireEvent.change(input, { target: { value: "foo" } })
    fireEvent.click(screen.getByRole("button", { name: "Encode" }))
    expect(screen.getByText("Zm9v")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(input).toHaveValue("")
    expect(screen.getByText(/Enter text above, then choose Encode or Decode/)).toBeVisible()

    fireEvent.change(input, { target: { value: "Zm9vYmFy" } })
    fireEvent.click(screen.getByRole("button", { name: "Decode" }))
    expect(screen.getByText("foobar")).toBeVisible()
  })

  it("encodes multi-byte UTF-8 characters correctly", () => {
    render(
      <PlatformProvider>
        <Base64Converter />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Input"), { target: { value: "👍" } })
    fireEvent.click(screen.getByRole("button", { name: "Encode" }))
    // Regression: upstream relied on deprecated escape/unescape.
    expect(screen.getByText("8J+RjQ==")).toBeVisible()
  })

  it("rejects invalid Base64 with recovery guidance", () => {
    render(
      <PlatformProvider>
        <Base64Converter />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Input"), { target: { value: "Zm9v!" } })
    fireEvent.click(screen.getByRole("button", { name: "Decode" }))
    expect(screen.getByRole("alert")).toHaveTextContent("not valid Base64")
  })

  it("distinguishes invalid UTF-8 bytes from invalid Base64", () => {
    render(
      <PlatformProvider>
        <Base64Converter />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Input"), { target: { value: "//4=" } })
    fireEvent.click(screen.getByRole("button", { name: "Decode" }))
    expect(screen.getByRole("alert")).toHaveTextContent("not valid UTF-8")
  })

  it("rejects input beyond the limit for both directions", () => {
    render(
      <PlatformProvider>
        <Base64Converter />
      </PlatformProvider>,
    )

    const input = screen.getByLabelText("Input")
    fireEvent.change(input, { target: { value: "a".repeat(100_001) } })
    fireEvent.click(screen.getByRole("button", { name: "Encode" }))
    expect(screen.getByRole("alert")).toHaveTextContent("100,000 character limit")

    fireEvent.click(screen.getByRole("button", { name: "Decode" }))
    expect(screen.getByRole("alert")).toHaveTextContent("100,000 character limit")
  })
})
