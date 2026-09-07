import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import CorsHeaderBuilder from "@/tools/cors-header-builder/CorsHeaderBuilder"

describe("CORS Header Builder interactions", () => {
  it("shows the default generated headers", () => {
    const { container } = render(
      <PlatformProvider>
        <CorsHeaderBuilder />
      </PlatformProvider>,
    )
    const output = container
    expect(output).toHaveTextContent("Access-Control-Allow-Origin: *")
    expect(output).toHaveTextContent("Access-Control-Allow-Methods: GET, POST, OPTIONS")
    expect(output).toHaveTextContent("Access-Control-Allow-Headers: Content-Type, Authorization")
    expect(output).toHaveTextContent("Access-Control-Max-Age: 86400")
  })

  it("adds a custom method and header", () => {
    const { container } = render(
      <PlatformProvider>
        <CorsHeaderBuilder />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Custom methods"), { target: { value: "TRACE" } })
    fireEvent.change(screen.getByLabelText("Custom headers"), {
      target: { value: "X-Custom-Header" },
    })
    const output = container
    expect(output).toHaveTextContent("GET, POST, OPTIONS, TRACE")
    expect(output).toHaveTextContent("Content-Type, Authorization, X-Custom-Header")
  })

  it("toggles a method chip and drops it from the list", () => {
    const { container } = render(
      <PlatformProvider>
        <CorsHeaderBuilder />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Allow POST" }))
    expect(container).toHaveTextContent("Access-Control-Allow-Methods: GET, OPTIONS")
  })

  it("warns when credentials pair with a wildcard origin", () => {
    render(
      <PlatformProvider>
        <CorsHeaderBuilder />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: /Allow-Credentials/ }))
    expect(screen.getByRole("alert")).toHaveTextContent(/wildcard origin/i)
  })

  it("rejects a non-numeric max age", () => {
    render(
      <PlatformProvider>
        <CorsHeaderBuilder />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Max age (seconds)"), { target: { value: "1.5" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/whole number of seconds/)
  })

  it("omits Max-Age when the field is cleared", () => {
    const { container } = render(
      <PlatformProvider>
        <CorsHeaderBuilder />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Max age (seconds)"), { target: { value: "" } })
    expect(container).not.toHaveTextContent("Access-Control-Max-Age")
  })

  it("sets an explicit origin", () => {
    const { container } = render(
      <PlatformProvider>
        <CorsHeaderBuilder />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Access-Control-Allow-Origin"), {
      target: { value: "https://example.com" },
    })
    expect(container).toHaveTextContent("Access-Control-Allow-Origin: https://example.com")
  })
})
