import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import CspGenerator from "@/tools/csp-generator/CspGenerator"

describe("CSP Generator interactions", () => {
  it("starts with default-src 'self' enabled", () => {
    render(
      <PlatformProvider>
        <CspGenerator />
      </PlatformProvider>,
    )
    expect(screen.getByText("default-src 'self'")).toBeVisible()
  })

  it("builds a policy with an added directive and source", () => {
    render(
      <PlatformProvider>
        <CspGenerator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Enable script-src" }))
    fireEvent.change(screen.getByLabelText("Sources for script-src"), {
      target: { value: "'self'" },
    })
    expect(screen.getByText("default-src 'self'; script-src 'self'")).toBeVisible()
  })

  it("falls back to 'none' for a directive with empty sources", () => {
    render(
      <PlatformProvider>
        <CspGenerator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Enable img-src" }))
    expect(screen.getByText(/img-src 'none'/)).toBeVisible()
  })

  it("adds a common source tag with the quick buttons", () => {
    render(
      <PlatformProvider>
        <CspGenerator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Enable img-src" }))
    fireEvent.click(screen.getByRole("button", { name: "Add * to img-src" }))
    expect(screen.getByText(/img-src \*/)).toBeVisible()
  })

  it("emits the flag-only directive without a source field", () => {
    render(
      <PlatformProvider>
        <CspGenerator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Enable upgrade-insecure-requests" }))
    expect(screen.getByText(/default-src 'self'; upgrade-insecure-requests/)).toBeVisible()
    expect(screen.queryByLabelText("Sources for upgrade-insecure-requests")).toBeNull()
  })

  it("clears the header when every directive is disabled", () => {
    render(
      <PlatformProvider>
        <CspGenerator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Enable default-src" }))
    expect(screen.getByText(/Enable directives above/i)).toBeVisible()
  })
})
