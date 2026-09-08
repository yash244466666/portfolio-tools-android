import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import TimeZoneConverter from "./TimeZoneConverter"

function renderTool() {
  render(
    <PlatformProvider>
      <TimeZoneConverter />
    </PlatformProvider>,
  )
}

function fill(date: string, time: string) {
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: date } })
  fireEvent.change(screen.getByLabelText("Time"), { target: { value: time } })
}

describe("TimeZoneConverter", () => {
  it("starts empty with an instructive status", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter a date and time/i)
  })

  it("converts a winter time across zones with known offsets", () => {
    renderTool()
    fill("2026-01-15", "12:00")
    expect(screen.getByRole("status")).toHaveTextContent(
      /2026-01-15 12:00 in America\/New_York is 2026-01-15 23:00 in Asia\/Dhaka/,
    )
  })

  it("keeps no-DST zones fixed in both seasons", () => {
    renderTool()
    // 12:00 in either season converts to a Dhaka time that differs by the
    // from-zone's DST shift, while Dhaka's own +06 offset never moves.
    fill("2026-01-15", "12:00")
    expect(screen.getByRole("status")).toHaveTextContent("2026-01-15 23:00 in Asia/Dhaka")
    fill("2026-07-15", "12:00")
    expect(screen.getByRole("status")).toHaveTextContent("2026-07-15 22:00 in Asia/Dhaka")
  })

  it("surfaces a spring-forward gap honestly", () => {
    renderTool()
    fill("2026-03-08", "02:30")
    expect(screen.getByRole("alert")).toHaveTextContent(/does not exist/i)
    expect(screen.getByRole("alert")).toHaveTextContent(/spring-forward/i)
  })

  it("surfaces a fall-back overlap honestly", () => {
    renderTool()
    fill("2026-11-01", "01:30")
    expect(screen.getByRole("alert")).toHaveTextContent(/happens twice/i)
    expect(screen.getByRole("alert")).toHaveTextContent(/fall-back/i)
  })

  it("rejects impossible dates and times with visible alerts", () => {
    renderTool()
    fill("2026-02-30", "12:00")
    expect(screen.getByRole("alert")).not.toBeNull()
    fill("2026-09-08", "24:99")
    expect(screen.getByRole("alert")).not.toBeNull()
  })

  it("clears the inputs back to the empty state", () => {
    renderTool()
    fill("2026-09-08", "12:00")
    fireEvent.click(screen.getByRole("button", { name: /clear/i }))
    expect(screen.getByLabelText("Date")).toHaveValue("")
    expect(screen.getByLabelText("Time")).toHaveValue("")
    expect(screen.getByRole("status")).toHaveTextContent(/enter a date and time/i)
  })
})
