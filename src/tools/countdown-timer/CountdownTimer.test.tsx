import { act, fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import CountdownTimer from "./CountdownTimer"

function renderTool() {
  render(
    <PlatformProvider>
      <CountdownTimer />
    </PlatformProvider>,
  )
}

describe("CountdownTimer interactions", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("runs from the wall-clock deadline and finishes", () => {
    renderTool()
    act(() => {
      vi.setSystemTime(1_000_000)
    })
    fireEvent.click(screen.getByRole("button", { name: "Start" }))
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(screen.getByLabelText("Remaining time")).toHaveTextContent("00:04:57")

    act(() => {
      vi.advanceTimersByTime(300_000)
    })
    expect(screen.getByText("Time is up!")).toBeVisible()
  })

  it("resumes from the paused remaining time without drift", () => {
    renderTool()
    act(() => {
      vi.setSystemTime(2_000_000)
    })
    fireEvent.click(screen.getByRole("button", { name: "Start" }))
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    fireEvent.click(screen.getByRole("button", { name: "Pause" }))
    expect(screen.getByText("Paused")).toBeVisible()
    expect(screen.getByLabelText("Remaining time")).toHaveTextContent("00:03:00")

    act(() => {
      vi.setSystemTime(2_900_000)
    })
    fireEvent.click(screen.getByRole("button", { name: "Resume" }))
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    // The 780 seconds that passed while paused must not be counted.
    expect(screen.getByLabelText("Remaining time")).toHaveTextContent("00:02:59")
  })

  it("rejects a zero duration and resets to the input state", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Minutes"), { target: { value: "0" } })
    const start = screen.getByRole("button", { name: "Start" })
    expect(start).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent("at least one second")

    fireEvent.click(screen.getByRole("button", { name: "1 hour" }))
    expect(start).toBeEnabled()
    fireEvent.click(start)
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(screen.getByLabelText("Remaining time")).toHaveTextContent("00:00:00")
    expect(screen.getByLabelText("Hours")).toBeVisible()
  })
})