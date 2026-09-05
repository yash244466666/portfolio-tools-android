import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import TimestampConverter from "@/tools/timestamp-converter/TimestampConverter"

describe("Timestamp Converter interactions", () => {
  it("converts an explicit Unix timestamp and exposes copy actions", async () => {
    render(
      <PlatformProvider>
        <TimestampConverter />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Unix timestamp"), { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: "Convert timestamp" }))

    expect(await screen.findByText("1970-01-01T00:00:00.000Z")).toBeVisible()
    expect(screen.getByRole("button", { name: "Copy ISO 8601 result" })).toBeVisible()
  })

  it("announces invalid whole-number input beside the timestamp field", () => {
    render(
      <PlatformProvider>
        <TimestampConverter />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Unix timestamp"), { target: { value: "1.5" } })
    fireEvent.click(screen.getByRole("button", { name: "Convert timestamp" }))

    expect(screen.getByRole("alert")).toHaveTextContent(/enter a whole Unix timestamp/i)
    expect(screen.getByLabelText("Unix timestamp")).toHaveAttribute(
      "aria-describedby",
      "timestamp-error",
    )
  })
})
