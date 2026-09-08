import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import IcsGenerator from "./IcsGenerator"

function renderTool() {
  render(
    <PlatformProvider>
      <IcsGenerator />
    </PlatformProvider>,
  )
}

describe("IcsGenerator interactions", () => {
  it("builds a CRLF calendar from typed details", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Team sync" } })
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-09-10" } })
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-09-10" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate .ics" }))
    expect(document.querySelector("pre")?.textContent).toContain("BEGIN:VCALENDAR")
    expect(document.querySelector("pre")?.textContent).toContain("SUMMARY:Team sync")
    expect(document.querySelector("pre")?.textContent).toContain("DTSTART:20260910T090000")
  })

  it("switches to all-day VALUE=DATE output", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Offsite" } })
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-09-10" } })
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-09-11" } })
    fireEvent.click(screen.getByRole("checkbox", { name: "All-day event" }))
    expect(screen.queryByLabelText("Start time")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Generate .ics" }))
    expect(document.querySelector("pre")?.textContent).toContain("DTSTART;VALUE=DATE:20260910")
  })

  it("reports specific errors and keeps no stale output", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Generate .ics" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an event title.")
    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "X" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate .ics" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a start date")
    expect(screen.queryByText("Result")).toBeNull()
  })
})