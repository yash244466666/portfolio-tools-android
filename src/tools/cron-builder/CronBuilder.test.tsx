import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import CronBuilder from "@/tools/cron-builder/CronBuilder"

function setExpression(value: string) {
  fireEvent.change(screen.getByLabelText("Cron expression"), { target: { value } })
}

describe("Cron Builder interactions", () => {
  it("describes the default weekday-morning expression", () => {
    render(
      <PlatformProvider>
        <CronBuilder />
      </PlatformProvider>,
    )

    expect(screen.getByText("at 09:00, on Monday through Friday")).toBeVisible()
    expect(screen.getByLabelText("Day of Week")).toHaveValue("1-5")
  })

  it("rejects out-of-range fields with a message naming the field", () => {
    render(
      <PlatformProvider>
        <CronBuilder />
      </PlatformProvider>,
    )

    // Regression: upstream accepted "99 99 99 99 99" without complaint.
    setExpression("99 99 99 99 99")
    // The Field shows the error next to the control and the panel repeats it.
    expect(screen.getAllByText(/Minute "99" is outside range 0-59\./)).toHaveLength(2)
    expect(screen.queryByText("at 09:00, on Monday through Friday")).toBeNull()
  })

  it("syncs field edits into the expression", () => {
    render(
      <PlatformProvider>
        <CronBuilder />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Hour"), { target: { value: "12" } })
    expect(screen.getByLabelText("Cron expression")).toHaveValue("0 12 * * 1-5")
    expect(screen.getByText("at 12:00, on Monday through Friday")).toBeVisible()
  })

  it("applies presets and reflects them in the fields", () => {
    render(
      <PlatformProvider>
        <CronBuilder />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Every 15 minutes" }))
    expect(screen.getByLabelText("Cron expression")).toHaveValue("*/15 * * * *")
    expect(screen.getByLabelText("Minute")).toHaveValue("*/15")
    expect(screen.getByText("every 15 minutes")).toBeVisible()
  })

  it("clears everything and shows an empty-state prompt", () => {
    render(
      <PlatformProvider>
        <CronBuilder />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByLabelText("Cron expression")).toHaveValue("")
    expect(screen.getByLabelText("Minute")).toHaveValue("")
    expect(screen.queryByRole("status")).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
