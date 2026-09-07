import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import AgeCalculator from "@/tools/age-calculator/AgeCalculator"

describe("Age Calculator interactions", () => {
  beforeEach(() => {
    // The expectations below are pinned to this instant; without the fake
    // clock the days component rolls over at every midnight boundary.
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-07T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("computes the age, totals, and next birthday as the date is typed", () => {
    render(
      <PlatformProvider>
        <AgeCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Birth date"), { target: { value: "1990-05-20" } })
    expect(screen.getByLabelText("Computed age")).toHaveTextContent("36")
    expect(screen.getByLabelText("Computed age")).toHaveTextContent("3")
    expect(screen.getByLabelText("Computed age")).toHaveTextContent("18")
    expect(screen.getByText("13,259", { exact: true })).toBeVisible()
    expect(screen.getByText("Next birthday in 255 days")).toBeVisible()
    expect(screen.getByText(/Turning 37 years old on 2027-05-20/)).toBeVisible()
  })

  it("rejects a future birth date", () => {
    render(
      <PlatformProvider>
        <AgeCalculator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Birth date"), { target: { value: "2099-01-01" } })
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a birth date on or before today.")
  })

  it("shows the empty state before a date is entered", () => {
    render(
      <PlatformProvider>
        <AgeCalculator />
      </PlatformProvider>,
    )

    expect(screen.getByText(/Pick a birth date above/)).toBeVisible()
    expect(screen.queryByText("Next birthday")).toBeNull()
  })
})
