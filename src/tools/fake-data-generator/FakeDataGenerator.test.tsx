import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import FakeDataGenerator from "./FakeDataGenerator"
import { countries } from "./fake-data"

function renderTool() {
  render(
    <PlatformProvider>
      <FakeDataGenerator />
    </PlatformProvider>,
  )
}

describe("FakeDataGenerator interactions", () => {
  it("generates the requested number of values for the chosen type", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "Country" }))
    fireEvent.change(screen.getByLabelText("How many"), { target: { value: "3" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(countries).toContain(screen.getAllByRole("listitem")[0]?.textContent)
  })

  it("clamps an out-of-range count", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("How many"), { target: { value: "500" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(screen.getAllByRole("listitem")).toHaveLength(50)
  })

  it("clears the results", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.queryByRole("list")).toBeNull()
  })
})
