import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import AspectRatioCalculator from "./AspectRatioCalculator"

function renderTool() {
  render(
    <PlatformProvider>
      <AspectRatioCalculator />
    </PlatformProvider>,
  )
}

function setDimensions(width: string, height: string) {
  fireEvent.change(screen.getByLabelText("Width (px)"), { target: { value: width } })
  fireEvent.change(screen.getByLabelText("Height (px)"), { target: { value: height } })
}

describe("AspectRatioCalculator", () => {
  it("starts empty with an instructive status and no table", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/enter a width and height/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("simplifies the ratio and reports it through the live status", () => {
    renderTool()
    setDimensions("1920", "1080")
    expect(screen.getByRole("status")).toHaveTextContent(/Simplified ratio 16:9/)
  })

  it("rejects invalid dimensions with visible alerts and recovers via reset", () => {
    renderTool()
    setDimensions("10.5", "1080")
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: /reset/i }))
    expect(screen.getByRole("status")).toHaveTextContent(/enter a width and height/i)
  })

  it("scales to a target width and shows a text-equivalent table", () => {
    renderTool()
    setDimensions("1920", "1080")
    fireEvent.change(screen.getByLabelText("Target width (px)"), { target: { value: "1280" } })
    expect(screen.getByText(/At a target width of 1280 px/)).toHaveTextContent(/1280 × 720 px/)
    expect(screen.getByRole("table")).toHaveTextContent("720")
  })

  it("applies a common preset with pressed-state feedback", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /16:9 widescreen/i }))
    expect(screen.getByRole("button", { name: /16:9 widescreen/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByRole("status")).toHaveTextContent(/Simplified ratio 16:9/)
  })
})
