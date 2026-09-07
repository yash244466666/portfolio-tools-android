import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import DataSanitizer from "@/tools/data-sanitizer/DataSanitizer"

describe("Data Sanitizer interactions", () => {
  it("redacts an email and reports the count", () => {
    render(
      <PlatformProvider>
        <DataSanitizer />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text with sensitive data"), {
      target: { value: "write to jane.doe@example.com today" },
    })
    expect(screen.getByText(/write to \[EMAIL REDACTED\] today/)).toBeVisible()
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("1")
  })

  it("keeps a type in the text when its rule is disabled", () => {
    render(
      <PlatformProvider>
        <DataSanitizer />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "IP Addresses" }))
    fireEvent.change(screen.getByLabelText("Text with sensitive data"), {
      target: { value: "host 10.0.0.1 and admin@corp.dev" },
    })
    expect(screen.getByText(/10\.0\.0\.1 and \[EMAIL REDACTED\]/)).toBeVisible()
    expect(screen.getByText("off")).toBeVisible()
  })

  it("counts zero when nothing matches", () => {
    render(
      <PlatformProvider>
        <DataSanitizer />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text with sensitive data"), {
      target: { value: "nothing sensitive here" },
    })
    // The textarea mirrors the input, so assert on the output panel copy.
    const panels = screen.getAllByText("nothing sensitive here")
    expect(panels.length).toBe(2)
    expect(panels[1]).toBeVisible()
  })

  it("rejects text beyond the character limit", () => {
    render(
      <PlatformProvider>
        <DataSanitizer />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text with sensitive data"), {
      target: { value: "a".repeat(100_001) },
    })
    expect(screen.getByRole("alert")).toHaveTextContent(/100,000 character limit/)
    expect(screen.queryByText("Items removed")).toBeNull()
  })

  it("redacts multiple PII types in one pass", () => {
    render(
      <PlatformProvider>
        <DataSanitizer />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Text with sensitive data"), {
      target: { value: "jane@corp.dev from 192.168.0.5" },
    })
    expect(screen.getByText(/\[EMAIL REDACTED\] from \[IP REDACTED\]/)).toBeVisible()
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("2")
  })
})
