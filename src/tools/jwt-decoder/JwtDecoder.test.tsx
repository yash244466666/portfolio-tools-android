import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import JwtDecoder from "@/tools/jwt-decoder/JwtDecoder"

// header {"alg":"HS256","typ":"JWT"} . payload {"exp":4102444800,"iss":"example"} . signature
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQxMDI0NDQ4MDAsImlzcyI6ImV4YW1wbGUifQ.dBjftJeZ4CJP-mB6Kxth"

function setToken(value: string) {
  fireEvent.change(screen.getByLabelText("Encoded token"), { target: { value } })
}

describe("JwtDecoder interactions", () => {
  it("decodes header and payload panels", () => {
    render(
      <PlatformProvider>
        <JwtDecoder />
      </PlatformProvider>,
    )
    setToken(token)
    expect(screen.getByText("Decoded header")).toBeVisible()
    expect(screen.getByText("Decoded payload")).toBeVisible()
    expect(screen.getByText(/"iss": "example"/)).toBeVisible()
    expect(screen.getByText(/"alg": "HS256"/)).toBeVisible()
  })

  it("keeps the decode-not-verify disclosure always visible", () => {
    render(
      <PlatformProvider>
        <JwtDecoder />
      </PlatformProvider>,
    )
    expect(screen.getByText("Decoding is not verification.")).toBeVisible()
    setToken(token)
    expect(screen.getByText("Decoding is not verification.")).toBeVisible()
  })

  it("reports an active token from a far-future exp", () => {
    render(
      <PlatformProvider>
        <JwtDecoder />
      </PlatformProvider>,
    )
    setToken(token)
    expect(screen.getByText(/Active — the exp claim/)).toBeVisible()
  })

  it("rejects malformed tokens without panels", () => {
    render(
      <PlatformProvider>
        <JwtDecoder />
      </PlatformProvider>,
    )
    setToken("abc.def")
    expect(screen.getByText(/three dot-separated parts/)).toBeVisible()
    expect(screen.queryByText("Decoded header")).toBeNull()
  })

  it("clears the token", () => {
    render(
      <PlatformProvider>
        <JwtDecoder />
      </PlatformProvider>,
    )
    setToken(token)
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByLabelText("Encoded token")).toHaveValue("")
  })
})
