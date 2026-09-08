import { act, fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import Stopwatch from "./Stopwatch"

function renderTool() {
  render(
    <PlatformProvider>
      <Stopwatch />
    </PlatformProvider>,
  )
}

describe("Stopwatch interactions", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("counts from wall-clock anchors across stop and resume", () => {
    renderTool()
    act(() => {
      vi.setSystemTime(1_000_000)
    })
    fireEvent.click(screen.getByRole("button", { name: "Start" }))
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getByRole("timer")).toHaveTextContent("00:05.00")
    fireEvent.click(screen.getByRole("button", { name: "Stop" }))
    expect(screen.getByRole("timer")).toHaveTextContent("00:05.00")

    fireEvent.click(screen.getByRole("button", { name: "Resume" }))
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(screen.getByRole("timer")).toHaveTextContent("00:07.00")
  })

  it("records laps newest-first with per-lap and total times", () => {
    renderTool()
    act(() => {
      vi.setSystemTime(2_000_000)
    })
    fireEvent.click(screen.getByRole("button", { name: "Start" }))
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    fireEvent.click(screen.getByRole("button", { name: "Lap" }))
    act(() => {
      vi.advanceTimersByTime(15_000)
    })
    fireEvent.click(screen.getByRole("button", { name: "Lap" }))
    expect(screen.getByText("#1")).toBeVisible()
    expect(screen.getByRole("table")).toHaveTextContent("00:15.00")
    expect(screen.getByRole("table")).toHaveTextContent("00:10.00")
  })

  it("resets to the idle state", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Start" }))
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    fireEvent.click(screen.getByRole("button", { name: "Stop" }))
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(screen.getByRole("timer")).toHaveTextContent("00:00.00")
    expect(screen.queryByRole("table")).toBeNull()
  })
})
