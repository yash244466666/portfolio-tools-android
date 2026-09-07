import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import PasswordStrengthChecker from "@/tools/password-strength-checker/PasswordStrengthChecker"

describe("Password Strength Checker interactions", () => {
  it("shows the empty state before any input", () => {
    render(
      <PlatformProvider>
        <PasswordStrengthChecker />
      </PlatformProvider>,
    )
    expect(screen.getByText(/Enter a password above/i)).toBeVisible()
    expect(screen.queryByText("Requirements")).toBeNull()
  })

  it("renders the band label and requirements for a weak password", () => {
    render(
      <PlatformProvider>
        <PasswordStrengthChecker />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Password to analyze"), {
      target: { value: "abcdefgh" },
    })
    expect(screen.getByText("Weak")).toBeVisible()
    expect(screen.getByText("38 bits")).toBeVisible()
    expect(screen.getByText("Minutes to hours")).toBeVisible()
    expect(screen.getAllByText("not met").length).toBeGreaterThan(0)
  })

  it("reaches the strong band for a long mixed password", () => {
    render(
      <PlatformProvider>
        <PasswordStrengthChecker />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Password to analyze"), {
      target: { value: "Correct-Horse-Battery-42" },
    })
    expect(screen.getByText("Centuries+")).toBeVisible()
    expect(screen.getByText("Very Strong")).toBeVisible()
  })

  it("reports the over-limit state without an analysis", () => {
    render(
      <PlatformProvider>
        <PasswordStrengthChecker />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Password to analyze"), {
      target: { value: "a".repeat(257) },
    })
    expect(screen.getByRole("alert")).toHaveTextContent(/256 character limit/i)
    expect(screen.queryByText("Requirements")).toBeNull()
  })

  it("marks requirement rows as met or not met for screen readers", () => {
    render(
      <PlatformProvider>
        <PasswordStrengthChecker />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Password to analyze"), {
      target: { value: "Ab1!" },
    })
    // The symbol and length rows are covered by visible text; the sr-only
    // rows carry the pass state.
    expect(screen.getAllByText("met").length).toBeGreaterThan(0)
  })
})
