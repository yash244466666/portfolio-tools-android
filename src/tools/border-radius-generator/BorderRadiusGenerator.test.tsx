import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import BorderRadiusGenerator from "@/tools/border-radius-generator/BorderRadiusGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <BorderRadiusGenerator />
    </PlatformProvider>,
  )
}

describe("Border Radius Generator interactions", () => {
  it("renders the collapsed shorthand for equal corners", () => {
    renderTool()
    expect(screen.getByText("border-radius: 16px;")).toBeVisible()
  })

  it("emits four corners when one differs", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Bottom right"), { target: { value: "40" } })
    expect(screen.getByText("border-radius: 16px 16px 40px 16px;")).toBeVisible()
  })

  it("links corners while the checkbox is on", () => {
    renderTool()
    fireEvent.click(screen.getByLabelText("Link corners"))
    fireEvent.change(screen.getByLabelText("Top left"), { target: { value: "8" } })
    expect(screen.getByText("border-radius: 8px;")).toBeVisible()
  })

  it("clamps values into the range of a newly selected unit", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Top left"), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("radio", { name: "%" }))
    expect(screen.getByText("border-radius: 50% 16% 16% 16%;")).toBeVisible()
    fireEvent.click(screen.getByRole("radio", { name: "rem" }))
    expect(screen.getByText("border-radius: 10rem;")).toBeVisible()
  })
})
