import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import UrlEncoder from "@/tools/url-encoder/UrlEncoder"

describe("URL Encoder/Decoder interactions", () => {
  it("encodes, decodes, and resets", () => {
    render(
      <PlatformProvider>
        <UrlEncoder />
      </PlatformProvider>,
    )

    const input = screen.getByLabelText("Input")
    fireEvent.change(input, { target: { value: "a b/c" } })
    fireEvent.click(screen.getByRole("button", { name: "Encode" }))
    expect(screen.getByText("a%20b%2Fc")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(input).toHaveValue("")
    expect(screen.queryByText("Encoded")).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: "a%20b" } })
    fireEvent.click(screen.getByRole("button", { name: "Decode" }))
    expect(screen.getByText("a b")).toBeVisible()
  })

  it("rejects malformed percent escapes with recovery guidance", () => {
    render(
      <PlatformProvider>
        <UrlEncoder />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Input"), { target: { value: "100%" } })
    fireEvent.click(screen.getByRole("button", { name: "Decode" }))
    expect(screen.getByRole("alert")).toHaveTextContent("not a valid percent-encoded string")
  })

  it("shows URL parts and discloses the assumed https scheme", () => {
    render(
      <PlatformProvider>
        <UrlEncoder />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Input"), {
      target: { value: "https://example.com:8443/path?q=1#top" },
    })

    expect(screen.getByText("URL parts")).toBeVisible()
    expect(screen.getByText("example.com")).toBeVisible()
    expect(screen.getByText("8443")).toBeVisible()
    expect(screen.queryByText(/assume/i)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Input"), { target: { value: "example.com/path" } })
    expect(screen.getByText(/assume/)).toBeVisible()
  })
})
