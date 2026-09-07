import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import PasswordGenerator from "@/tools/password-generator/PasswordGenerator"

describe("PasswordGenerator interactions", () => {
  it("generates a password using only the selected sets", () => {
    render(
      <PlatformProvider>
        <PasswordGenerator />
      </PlatformProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    const output = screen.getByText("Generated password")
    expect(output).toBeVisible()
    const password = screen.getByLabelText("Generated password").textContent ?? ""
    expect(password).toHaveLength(20)
    expect(password).toMatch(/^[A-Za-z0-9!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/)
    expect(screen.getByText(/Strength: /)).toBeVisible()
  })

  it("honors a custom length", () => {
    render(
      <PlatformProvider>
        <PasswordGenerator />
      </PlatformProvider>,
    )
    fireEvent.change(screen.getByLabelText("Length"), { target: { value: "32" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(screen.getByLabelText("Generated password").textContent).toHaveLength(32)
  })

  it("shows an explicit error when no set is selected", () => {
    render(
      <PlatformProvider>
        <PasswordGenerator />
      </PlatformProvider>,
    )
    // Regression: upstream silently fell back to lowercase letters.
    fireEvent.click(screen.getByLabelText("Lowercase letters"))
    fireEvent.click(screen.getByLabelText("Uppercase letters"))
    fireEvent.click(screen.getByLabelText("Numbers"))
    fireEvent.click(screen.getByLabelText("Symbols"))
    expect(screen.getByText(/Select at least one character set/)).toBeVisible()
    const generate = screen.getByRole("button", { name: "Generate" })
    expect(generate).toBeDisabled()
    fireEvent.click(screen.getByLabelText("Lowercase letters"))
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled()
  })

  it("clears the previous password when settings change", () => {
    render(
      <PlatformProvider>
        <PasswordGenerator />
      </PlatformProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(screen.getByText("Generated password")).toBeVisible()
    fireEvent.click(screen.getByLabelText("Symbols"))
    expect(screen.queryByText("Generated password")).toBeNull()
  })
})
