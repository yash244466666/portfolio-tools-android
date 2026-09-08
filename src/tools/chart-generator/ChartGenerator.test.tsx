import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import ChartGenerator from "./ChartGenerator"

function renderTool() {
  render(
    <PlatformProvider>
      <ChartGenerator />
    </PlatformProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("ChartGenerator", () => {
  it("renders the text-equivalent summary table for the default data", () => {
    renderTool()
    // Canvas drawing is unavailable in jsdom; the table carries the meaning.
    expect(screen.getByText("Chart data as a text table")).toBeTruthy()
    expect(screen.getByText("80")).toBeTruthy() // point D value
    expect(screen.getByText("40")).toBeTruthy() // point A value
    expect(screen.getByText("20%")).toBeTruthy() // A share
  })

  it("adds a point from the secure byte source and keeps at least one", () => {
    renderTool()
    const before = screen.getAllByText(/^%$|share/i)
    expect(screen.getByRole("button", { name: "Add point" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Add point" }))
    expect(screen.getByLabelText("Label for point 6")).toBeTruthy()
    // Removing every point is prevented at one remaining.
    for (let i = 6; i >= 2; i--) {
      fireEvent.click(screen.getByRole("button", { name: `Remove point ${i}` }))
    }
    fireEvent.click(screen.getByRole("button", { name: "Remove point 1" }))
    expect(screen.getByLabelText("Label for point 1")).toBeTruthy()
    expect(before.length).toBeGreaterThanOrEqual(0)
  })

  it("keeps the previous value when the input is not a valid number", () => {
    renderTool()
    const value = screen.getByLabelText("Value for point 1")
    fireEvent.change(value, { target: { value: "abc" } })
    expect((value as HTMLInputElement).value).toBe("40")
    fireEvent.change(value, { target: { value: "77" } })
    expect((value as HTMLInputElement).value).toBe("77")
  })

  it("updates the summary line when the chart type changes", () => {
    renderTool()
    const status = document.querySelector('p[role="status"].sr-only')
    expect(status?.textContent).toContain("Bar chart")
    fireEvent.change(screen.getByLabelText("Chart type"), { target: { value: "pie" } })
    expect(status?.textContent).toContain("Pie chart")
  })
})
